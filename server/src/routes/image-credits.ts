/**
 * `/api/admin/image-credits` — the admin's Photo credits page.
 *
 * A credit is keyed by its image URL, so one is addressed as `?url=<image URL>`
 * rather than a path segment (an encoded URL in a path is easy to mangle).
 * Behind `requireAdmin` and, for writes, `sameOrigin` (app.ts). Saves carry
 * `expectedUpdatedAt`, like every other admin form: a save over someone
 * else's newer one is refused with 409.
 */
import { Router, type Request } from 'express';

import type { ImageCreditItem } from '../../../shared/api';
import { fieldErrors } from '../../../shared/content-schema';
import { allowedImageOrigins, IMAGE_HOST_REFUSED, isAllowedImageUrl } from '../../../shared/image-hosts';
import {
  imageCreditCreateSchema,
  imageCreditValuesSchema,
  type ImageCreditRow
} from '../../../shared/image-credits';
import { z } from '../../../shared/zod';
import { requireAdmin } from '../auth/middleware';
import { pool } from '../db';
import { ApiError, asyncRoute } from '../http';
import { mediaOf, usageOf } from '../media/media';

const COLUMNS = `url, author, license, license_url, source_url, created_at,
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_at`;

const CHANGED_SINCE = 'Someone saved this credit after you opened it. Load their version before saving again.';
const GONE = 'That credit no longer exists.';

function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError('bad_request', 'Some fields need fixing.', fieldErrors(result.error));
  return result.data;
}

function urlOf(req: Request): string {
  const url = req.query.url;
  if (typeof url !== 'string' || !url) throw new ApiError('bad_request', 'Which credit? Add ?url=<image URL>.');
  return url;
}

const versioned = z.object({
  values: imageCreditValuesSchema,
  expectedUpdatedAt: z.iso.datetime({ offset: true })
});

export const imageCreditsRouter = Router();

imageCreditsRouter.use('/admin/image-credits', requireAdmin, (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

/** Every credit, with the rows (drafts included) that use its photo. */
imageCreditsRouter.get(
  '/admin/image-credits',
  asyncRoute(async (_req, res) => {
    const { rows } = await pool.query<ImageCreditRow>(
      `select ${COLUMNS} from public.image_credits order by lower(author), url`
    );
    const usage = await usageOf(pool, rows.map((r) => r.url));
    const items: ImageCreditItem[] = rows.map((r) => ({ ...r, usedBy: usage.get(r.url) ?? [] }));
    res.json(items);
  })
);

imageCreditsRouter.post(
  '/admin/image-credits',
  asyncRoute(async (req, res) => {
    const values = parseOrThrow(imageCreditCreateSchema, req.body);
    // Only a photo the site could show: the same allow-list as image fields.
    if (!isAllowedImageUrl(values.url, allowedImageOrigins(mediaOf(req)?.publicBaseUrl ?? null))) {
      throw new ApiError('bad_request', 'Some fields need fixing.', { url: IMAGE_HOST_REFUSED });
    }
    const { rows } = await pool.query<ImageCreditRow>(
      `insert into public.image_credits (url, author, license, license_url, source_url)
       values ($1, $2, $3, $4, $5)
       on conflict (url) do nothing
       returning ${COLUMNS}`,
      [values.url, values.author, values.license, values.license_url, values.source_url]
    );
    if (!rows[0]) {
      throw new ApiError('conflict', 'That photo already has a credit.', { url: 'That photo already has a credit.' });
    }
    res.status(201).json(rows[0]);
  })
);

imageCreditsRouter.put(
  '/admin/image-credits',
  asyncRoute(async (req, res) => {
    const url = urlOf(req);
    const { values, expectedUpdatedAt } = parseOrThrow(versioned, req.body);
    const { rows } = await pool.query<ImageCreditRow>(
      `update public.image_credits
          set author = $2, license = $3, license_url = $4, source_url = $5
        where url = $1 and updated_at = $6::timestamptz
        returning ${COLUMNS}`,
      [url, values.author, values.license, values.license_url, values.source_url, expectedUpdatedAt]
    );
    if (rows[0]) {
      res.json(rows[0]);
      return;
    }
    const exists = await pool.query('select 1 from public.image_credits where url = $1', [url]);
    throw exists.rowCount ? new ApiError('conflict', CHANGED_SINCE) : new ApiError('not_found', GONE);
  })
);

imageCreditsRouter.delete(
  '/admin/image-credits',
  asyncRoute(async (req, res) => {
    const { rowCount } = await pool.query('delete from public.image_credits where url = $1', [urlOf(req)]);
    if (!rowCount) throw new ApiError('not_found', GONE);
    res.status(204).end();
  })
);
