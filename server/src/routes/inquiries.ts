/**
 * Enquiries: the public form's `POST /api/inquiries`, and the admin inbox
 * under `/api/admin/inquiries`.
 *
 * The public insert replaces the old `anyone can submit an inquiry` RLS
 * policy. Its column list is `INQUIRY_INSERT_COLUMNS` plus `spam`: `status`,
 * `admin_notes` and `closed_at` are never read from the request, so they take
 * their defaults (`new`, NULL, NULL).
 *
 * Nothing here logs request data. Names, emails and messages must never reach
 * the server logs; the error handler logs database errors by code only.
 */
import { Router, type Request } from 'express';

import {
  INQUIRY_INSERT_COLUMNS,
  inquiryPatchSchema,
  inquirySubmissionSchema
} from '../../../shared/inquiry-schema';
import { INQUIRY_STATUSES, type InquiryRow } from '../../../shared/database.types';
import type { InquiryCounts } from '../../../shared/api';
import { fieldErrors } from '../../../shared/content-schema';
import { requireAdmin } from '../auth/middleware';
import { pool } from '../db';
import { ApiError, asyncRoute, clientIp } from '../http';
import { inquiriesCsv } from '../inquiries/csv';
import { OFF, type Notifier } from '../inquiries/notify';
import { inquirySecondsUntilAllowed, recordInquiryAttempt } from '../inquiries/throttle';

function notifierOf(req: Request): Notifier {
  return (req.app.locals.notifier as Notifier | undefined) ?? OFF;
}

function queryString(req: Request, name: string): string {
  const value = req.query[name];
  return typeof value === 'string' ? value : '';
}

function tooManyMessage(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes >= 90) {
    const hours = Math.ceil(minutes / 60);
    return `Too many enquiries from this connection. Please try again in ${hours} hours, or email us directly.`;
  }
  return `Too many enquiries from this connection. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export const inquiriesRouter = Router();

/* ------------------------------------------------------------------ public */

inquiriesRouter.post(
  '/inquiries',
  asyncRoute(async (req, res) => {
    const parsed = inquirySubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      // The form shows only `message`, so it names the first problem.
      throw new ApiError('bad_request', Object.values(fields)[0] ?? 'Please check the form.', fields);
    }
    const values = parsed.data;

    const ip = clientIp(req);
    const wait = await inquirySecondsUntilAllowed(ip);
    if (wait > 0) {
      res.set('Retry-After', String(wait));
      throw new ApiError('too_many_requests', tooManyMessage(wait));
    }
    await recordInquiryAttempt(ip);

    // Anything in the hidden field: kept, but as spam. The visitor gets the
    // same answer either way, so a bot learns nothing.
    const spam = Boolean(values.website && values.website.trim());

    const columns = [...INQUIRY_INSERT_COLUMNS, 'spam'];
    await pool.query(
      `insert into public.inquiries (${columns.join(', ')})
       values (${columns.map((_, i) => `$${i + 1}`).join(', ')})`,
      [...INQUIRY_INSERT_COLUMNS.map((c) => values[c]), spam]
    );

    res.status(201).json({ ok: true });

    if (!spam) notifierOf(req).newInquiry();
  })
);

/* ------------------------------------------------------------------- admin */

inquiriesRouter.use('/admin/inquiries', requireAdmin, (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

interface ListFilters {
  status: string;
  spam: boolean;
  search: string;
}

function filtersOf(req: Request): ListFilters {
  const status = queryString(req, 'status');
  if (status && status !== 'all' && !(INQUIRY_STATUSES as readonly string[]).includes(status)) {
    throw new ApiError('bad_request', 'Unknown status filter.');
  }
  return {
    status: status === 'all' ? '' : status,
    spam: queryString(req, 'spam') === 'true',
    search: queryString(req, 'search').trim().slice(0, 200)
  };
}

/** `ILIKE` with the visitor's `%`, `_` and `\` matched literally. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

async function listInquiries(filters: ListFilters, limit: number): Promise<InquiryRow[]> {
  const { rows } = await pool.query<InquiryRow>(
    `select * from public.inquiries
      where spam = $1
        and ($2 = '' or status = $2)
        and ($3 = '' or name ilike $4 escape '\\' or email ilike $4 escape '\\' or subject ilike $4 escape '\\')
      order by created_at desc, id
      limit $5`,
    [filters.spam, filters.status, filters.search, likePattern(filters.search), limit]
  );
  return rows;
}

inquiriesRouter.get(
  '/admin/inquiries',
  asyncRoute(async (req, res) => {
    res.json(await listInquiries(filtersOf(req), 1000));
  })
);

inquiriesRouter.get(
  '/admin/inquiries/counts',
  asyncRoute(async (_req, res) => {
    const { rows } = await pool.query<InquiryCounts>(
      `select count(*) filter (where not spam and status = 'new')::int       as new,
              count(*) filter (where not spam and status = 'contacted')::int as contacted,
              count(*) filter (where not spam and status = 'closed')::int    as closed,
              count(*) filter (where spam)::int                              as spam
         from public.inquiries`
    );
    res.json(rows[0]);
  })
);

inquiriesRouter.get(
  '/admin/inquiries/export.csv',
  asyncRoute(async (req, res) => {
    const rows = await listInquiries(filtersOf(req), 100_000);
    const date = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="enquiries-${date}.csv"`);
    res.send(inquiriesCsv(rows));
  })
);

function idOf(req: Request): string {
  return typeof req.params.id === 'string' ? req.params.id : '';
}

inquiriesRouter.get(
  '/admin/inquiries/:id',
  asyncRoute(async (req, res) => {
    const { rows } = await pool.query<InquiryRow>('select * from public.inquiries where id::text = $1', [
      idOf(req)
    ]);
    if (!rows[0]) throw new ApiError('not_found', 'That enquiry no longer exists.');
    res.json(rows[0]);
  })
);

/**
 * Status, notes and the spam flag, with the phase 4 version rule: a save of
 * a version someone else has already replaced gets 409. `closed_at` follows
 * the status: set when it becomes `closed` (kept if it already was), cleared
 * when it is reopened.
 */
inquiriesRouter.patch(
  '/admin/inquiries/:id',
  asyncRoute(async (req, res) => {
    const parsed = inquiryPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError('bad_request', 'Some fields need fixing.', fieldErrors(parsed.error));
    }
    const patch = parsed.data;
    const id = idOf(req);

    const { rows } = await pool.query<InquiryRow>(
      `update public.inquiries
          set status      = coalesce($2, status),
              admin_notes = case when $3::boolean then $4 else admin_notes end,
              spam        = coalesce($5, spam),
              closed_at   = case when coalesce($2, status) = 'closed'
                                 then coalesce(closed_at, now()) else null end
        where id::text = $1
          and updated_at between $6::timestamptz - interval '1 millisecond'
                             and $6::timestamptz + interval '1 millisecond'
        returning *`,
      [
        id,
        patch.status ?? null,
        patch.admin_notes !== undefined,
        patch.admin_notes ?? null,
        patch.spam ?? null,
        patch.expectedUpdatedAt
      ]
    );

    if (!rows[0]) {
      const exists = await pool.query('select 1 from public.inquiries where id::text = $1', [id]);
      if (!exists.rowCount) throw new ApiError('not_found', 'That enquiry no longer exists.');
      throw new ApiError(
        'conflict',
        'Someone changed this enquiry after you opened it. Reload it before saving again.'
      );
    }
    res.json(rows[0]);
  })
);

/** Permanent. There is no soft delete and no copy anywhere else. */
inquiriesRouter.delete(
  '/admin/inquiries/:id',
  asyncRoute(async (req, res) => {
    const { rowCount } = await pool.query('delete from public.inquiries where id::text = $1', [idOf(req)]);
    if (!rowCount) throw new ApiError('not_found', 'That enquiry no longer exists.');
    res.status(204).end();
  })
);
