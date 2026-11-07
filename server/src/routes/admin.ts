import { REVISION_COLUMN } from '../revision';
/**
 * `/api/admin/*` — the admin panel's reads and writes.
 *
 * Every route here is behind `requireAdmin`. `sameOrigin` is applied to every
 * state-changing `/api` request in app.ts, so it is not repeated.
 *
 * Unlike `GET /api/content`, nothing here filters on `published`: the admin
 * has to see drafts to publish them.
 *
 * SQL identifiers come only from constants: the table from
 * `CONTENT_TABLE_NAMES`, the columns from `shared/content-schema.ts`. Values
 * are always parameters.
 */
import { Router, type ErrorRequestHandler, type Request } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';

import type { CountPayload } from '../../../shared/api';
import {
  fieldErrors,
  JSONB_COLUMNS,
  schemaForTable,
  SITE_SETTINGS_COLUMNS,
  siteSettingsSchema,
  writableColumns
} from '../../../shared/content-schema';
import { CONTENT_TABLE_NAMES, type ContentTableName } from '../../../shared/database.types';
import { requireAdmin } from '../auth/middleware';
import { pool } from '../db';
import { ApiError, asyncRoute, sendError } from '../http';
import { allowedImageOrigins } from '../../../shared/image-hosts';
import { fieldPathsFor, imageUrlsIn, isUnderBase, mediaOf } from '../media/media';
import type { TourStopInput } from '../../../shared/tour-stops';
import { adminStops, refuseIfOnARoute, replaceStops } from '../tour-stops';

/* ---------------------------------------------------------------- helpers */

/** A named route parameter. Express 5 types them as possibly repeated. */
function param(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === 'string' ? value : '';
}

function tableOf(req: Request): ContentTableName {
  const table = param(req, 'table');
  if (!(CONTENT_TABLE_NAMES as readonly string[]).includes(table)) {
    throw new ApiError('not_found', 'No such content table.');
  }
  return table as ContentTableName;
}

function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError('bad_request', 'Some fields need fixing.', fieldErrors(result.error));
  }
  return result.data;
}

const versionedBody = z.object({
  values: z.record(z.string(), z.unknown()),
  expectedUpdatedAt: z.iso.datetime({ offset: true })
});

const publishedBody = z.object({ published: z.boolean() });

const reorderBody = z.object({ ids: z.array(z.string()) });

/** `"col" = $n`, with the jsonb cast where the column needs one. */
function placeholder(column: string, index: number): string {
  return JSONB_COLUMNS.has(column) ? `$${index}::jsonb` : `$${index}`;
}

function sqlValue(column: string, value: unknown): unknown {
  return JSONB_COLUMNS.has(column) ? JSON.stringify(value) : value;
}

/** Compare the lossless revision sent by content/settings reads. */
function versionMatches(param: number): string { return `updated_at = $${param}::timestamptz`; }

async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

const LAST_HERO_SLIDE = 'The hero needs at least one published slide.';

/**
 * Refuses to let the last published hero slide be unpublished or deleted.
 *
 * Locks every published slide first, so two admins cannot each remove "one of
 * two" at the same moment: the second waits, then re-reads and sees one left.
 */
async function keepOneHeroSlide(client: PoolClient, id: string): Promise<void> {
  const { rows } = await client.query<{ id: string }>(
    'select id from public.hero_slides where published for update'
  );
  const target = rows.some((r) => r.id === id);
  if (target && rows.length === 1) {
    throw new ApiError('conflict', LAST_HERO_SLIDE);
  }
}

async function rowExists(table: ContentTableName, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`select 1 from public.${table} where id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

const IMAGE_DELETED = 'That image was deleted from the library. Choose another.';

/**
 * Every image of ours a write is about to save must still be in the library.
 * Takes `for key share` on those `media` rows for the rest of the write's
 * transaction: a library delete (`for update`) of one of them waits until
 * this commits, then sees the new use and answers 409. If the delete got
 * there first, the row is gone and this refuses the save.
 */
async function holdOurImages(
  client: PoolClient,
  req: Request,
  table: ContentTableName,
  values: Record<string, unknown>
): Promise<void> {
  const media = mediaOf(req);
  const ours = [...new Set(imageUrlsIn(table, values).filter((u) => isUnderBase(media, u)))];
  if (ours.length === 0) return;

  const { rows } = await client.query<{ url: string }>(
    'select url from public.media where url = any($1::text[]) for key share',
    [ours]
  );
  const present = new Set(rows.map((r) => r.url));
  const gone = new Set(ours.filter((u) => !present.has(u)));
  if (gone.size > 0) {
    throw new ApiError('bad_request', IMAGE_DELETED, fieldPathsFor(table, values, gone, IMAGE_DELETED));
  }
}

const NO_SUCH_DESTINATION = 'That destination no longer exists. Choose another.';

/**
 * An attraction's destination must exist. `for key share` holds it for the rest of the
 * write, so a delete of that destination waits for this save, then takes the
 * attraction with it (on delete cascade).
 */
async function refuseMissingDestination(
  client: PoolClient,
  table: ContentTableName,
  values: Record<string, unknown>
): Promise<void> {
  if (table !== 'attractions') return;
  const { rowCount } = await client.query('select 1 from public.destinations where id = $1 for key share', [values.destination_id]);
  if (!rowCount) throw new ApiError('bad_request', NO_SUCH_DESTINATION, { destination_id: NO_SUCH_DESTINATION });
}

/** The image allow-list for this app: Unsplash, plus R2 when uploads are set up. */
function imageOriginsFor(req: Request): string[] {
  return allowedImageOrigins(mediaOf(req)?.publicBaseUrl ?? null);
}

const CHANGED_SINCE =
  'Someone saved this record after you opened it. Load their version before saving again.';

/* ----------------------------------------------------------------- router */

export const adminRouter = Router();

adminRouter.use('/admin', requireAdmin, (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

/* ------------------------------------------------------- content: reads */

adminRouter.get(
  '/admin/content/:table',
  asyncRoute(async (req, res) => {
    const table = tableOf(req);
    const { rows } = await pool.query(
      `select *, ${REVISION_COLUMN} from public.${table} order by sort_order asc, id asc`
    );
    res.json(rows);
  })
);

adminRouter.get(
  '/admin/content/:table/count',
  asyncRoute(async (req, res) => {
    const table = tableOf(req);
    const { rows } = await pool.query<{ count: number }>(
      `select count(*)::int as count from public.${table}`
    );
    const payload: CountPayload = { count: rows[0]?.count ?? 0 };
    res.json(payload);
  })
);

adminRouter.get(
  '/admin/content/:table/:id',
  asyncRoute(async (req, res) => {
    const table = tableOf(req);
    const id = param(req, 'id');
    const { rows } = await pool.query(`select *, ${REVISION_COLUMN} from public.${table} where id = $1`, [id]);
    if (!rows[0]) throw new ApiError('not_found', 'That record no longer exists.');
    // A tour's route stops are a table of their own; the form edits them with the row.
    res.json(table === 'tours' ? { ...rows[0], stops: await adminStops(pool, id) } : rows[0]);
  })
);

/* ------------------------------------------------------ content: writes */

/**
 * Reorder, all or nothing. `ids` must be exactly the table's current rows:
 * if someone added or deleted one since this list loaded, 409 and no change.
 * Only rows whose position actually changes are written, so an editor open on
 * an untouched row does not get a false 409 afterwards.
 *
 * Registered before `/:id` so `order` is never read as a slug (it is also a
 * reserved slug).
 */
adminRouter.put(
  '/admin/content/:table/order',
  asyncRoute(async (req, res) => {
    const table = tableOf(req);
    const { ids } = parseOrThrow(reorderBody, req.body);

    if (new Set(ids).size !== ids.length) {
      throw new ApiError('bad_request', 'The order lists a record more than once.');
    }

    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string; sort_order: number }>(
        `select id, sort_order from public.${table} for update`
      );
      const current = new Map(rows.map((r) => [r.id, r.sort_order]));

      if (ids.length !== current.size || ids.some((id) => !current.has(id))) {
        throw new ApiError(
          'conflict',
          'The list changed while you were reordering it. Reload and try again.'
        );
      }

      for (const [index, id] of ids.entries()) {
        if (current.get(id) === index) continue;
        await client.query(`update public.${table} set sort_order = $1 where id = $2`, [
          index,
          id
        ]);
      }
    });

    res.status(204).end();
  })
);

adminRouter.post(
  '/admin/content/:table',
  asyncRoute(async (req, res) => {
    const table = tableOf(req);
    const values = parseOrThrow(
      schemaForTable(table, 'create', { imageOrigins: imageOriginsFor(req) }),
      req.body
    ) as Record<string, unknown>;
    const columns = writableColumns(table, 'create');

    const row = await withTransaction(async (client) => {
      await holdOurImages(client, req, table, values);
      await refuseMissingDestination(client, table, values);

      // New rows go to the end of the list.
      const { rows } = await client.query(
        `insert into public.${table} (${columns.map((c) => `"${c}"`).join(', ')}, sort_order)
         values (${columns.map((c, i) => placeholder(c, i + 1)).join(', ')},
                 (select coalesce(max(sort_order) + 1, 0) from public.${table}))
         returning *, ${REVISION_COLUMN}`,
        columns.map((c) => sqlValue(c, values[c]))
      );
      if (table === 'tours') {
        const stops = values.stops as TourStopInput[];
        await replaceStops(client, rows[0].id, stops);
        return { ...rows[0], stops };
      }
      return rows[0];
    });

    res.status(201).json(row);
  })
);

adminRouter.put(
  '/admin/content/:table/:id',
  asyncRoute(async (req, res) => {
    const table = tableOf(req);
    const id = param(req, 'id');
    const body = parseOrThrow(versionedBody, req.body);

    if (body.values.id !== undefined && body.values.id !== id) {
      throw new ApiError('bad_request', 'The URL slug cannot be changed after creation.', {
        id: 'The URL slug is permanent once saved.'
      });
    }

    const values = parseOrThrow(
      schemaForTable(table, 'update', { imageOrigins: imageOriginsFor(req) }),
      body.values
    ) as Record<string, unknown>;
    const columns = writableColumns(table, 'update');
    const params = columns.map((c) => sqlValue(c, values[c]));

    const row = await withTransaction(async (client) => {
      if (table === 'hero_slides' && values.published === false) {
        await keepOneHeroSlide(client, id);
      }
      await holdOurImages(client, req, table, values);
      await refuseMissingDestination(client, table, values);

      const { rows } = await client.query(
        `update public.${table}
            set ${columns.map((c, i) => `"${c}" = ${placeholder(c, i + 1)}`).join(', ')}
          where id = $${columns.length + 1} and ${versionMatches(columns.length + 2)}
          returning *, ${REVISION_COLUMN}`,
        [...params, id, body.expectedUpdatedAt]
      );
      // Stops are replaced only once the version check has passed.
      if (rows[0] && table === 'tours') {
        const stops = values.stops as TourStopInput[];
        await replaceStops(client, id, stops);
        return { ...rows[0], stops };
      }
      return rows[0];
    });

    if (!row) {
      if (!(await rowExists(table, id))) {
        throw new ApiError('not_found', 'That record no longer exists.');
      }
      throw new ApiError('conflict', CHANGED_SINCE);
    }
    res.json(row);
  })
);

adminRouter.patch(
  '/admin/content/:table/:id/published',
  asyncRoute(async (req, res) => {
    const table = tableOf(req);
    const id = param(req, 'id');
    const { published } = parseOrThrow(publishedBody, req.body);

    const row = await withTransaction(async (client) => {
      if (table === 'hero_slides' && !published) {
        await keepOneHeroSlide(client, id);
      }
      const { rows } = await client.query(
        `update public.${table} set published = $1 where id = $2 returning *, ${REVISION_COLUMN}`,
        [published, id]
      );
      return rows[0];
    });

    if (!row) throw new ApiError('not_found', 'That record no longer exists.');
    res.json(row);
  })
);

adminRouter.delete(
  '/admin/content/:table/:id',
  asyncRoute(async (req, res) => {
    const table = tableOf(req);
    const id = param(req, 'id');

    const deleted = await withTransaction(async (client) => {
      if (table === 'hero_slides') await keepOneHeroSlide(client, id);
      if (table === 'destinations') await refuseIfOnARoute(client, id);
      const { rowCount } = await client.query(`delete from public.${table} where id = $1`, [id]);
      return (rowCount ?? 0) > 0;
    });

    if (!deleted) throw new ApiError('not_found', 'That record no longer exists.');
    res.status(204).end();
  })
);

/* ---------------------------------------------------------- site settings */

adminRouter.get(
  '/admin/site-settings',
  asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(`select *, ${REVISION_COLUMN} from public.site_settings where id`);
    if (!rows[0]) throw new Error('public.site_settings has no row; run `npm run migrate`.');
    res.json(rows[0]);
  })
);

adminRouter.put(
  '/admin/site-settings',
  asyncRoute(async (req, res) => {
    const body = parseOrThrow(versionedBody, req.body);
    const values = parseOrThrow(siteSettingsSchema, body.values) as Record<string, unknown>;
    const columns = SITE_SETTINGS_COLUMNS;

    const { rows } = await pool.query(
      `update public.site_settings
          set ${columns.map((c, i) => `"${c}" = $${i + 1}`).join(', ')}
        where id and ${versionMatches(columns.length + 1)}
        returning *, ${REVISION_COLUMN}`,
      // `stats` is jsonb: pg would send an array as a Postgres array.
      [...columns.map((c) => (c === 'stats' ? JSON.stringify(values[c]) : values[c])), body.expectedUpdatedAt]
    );

    if (!rows[0]) throw new ApiError('conflict', CHANGED_SINCE);
    res.json(rows[0]);
  })
);

/* ---------------------------------------------------------- db errors */

/**
 * The Zod schemas mirror the CHECK constraints, so these should be rare; when
 * the database is the one to refuse, say so in the API's own terms instead of
 * as a 500.
 */
export const adminDbErrors: ErrorRequestHandler = (error, _req, res, next) => {
  const code = (error as { code?: string }).code;

  if (code === '23505') {
    sendError(res, 'conflict', 'That URL slug is already taken. Choose a different one.', {
      id: 'That URL slug is already taken.'
    });
    return;
  }
  if (code === '23514') {
    sendError(res, 'bad_request', 'The database rejected one of the values.');
    return;
  }
  // A foreign key: in practice, a destination that a tour route started
  // using while it was being deleted (`refuseIfOnARoute` names the tours in
  // the usual case).
  if (code === '23503') {
    sendError(res, 'conflict', 'Another record still uses this one. Reload and try again.');
    return;
  }
  next(error);
};

adminRouter.use('/admin', adminDbErrors);
