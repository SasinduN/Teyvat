/**
 * `/api/admin/media` — uploads into R2, and the media library.
 *
 * Behind `requireAdmin` (the admin router mounts that for every `/admin`
 * path) and, for writes, `sameOrigin` (app.ts). R2 credentials stay here; the
 * browser only ever sends bytes to this server.
 *
 * Nothing is deleted from R2 except by `DELETE /api/admin/media/:id`.
 */
import express, { Router, type Request } from 'express';

import type { MediaItem, MediaLibraryPayload, MediaUsage } from '../../../shared/api';
import { SNIFF_BYTES, sniffImage, SVG_REFUSED, TYPE_REFUSED } from '../../../shared/image-sniff';
import { PRIMARY_WIDTH } from '../../../shared/photo-assets';
import { requireAdmin, sessionOf } from '../auth/middleware';
import { pool } from '../db';
import { ApiError, asyncRoute } from '../http';
import {
  MAX_UPLOAD_BYTES,
  MEDIA_FOLDERS,
  mediaOf,
  newObjectKey,
  objectUrl,
  usageOf,
  type MediaConfig
} from '../media/media';

export { MAX_UPLOAD_BYTES };

const NOT_CONFIGURED = 'Image uploads aren’t configured on this server.';

function requireMedia(req: Request): MediaConfig {
  const media = mediaOf(req);
  if (!media) throw new ApiError('not_configured', NOT_CONFIGURED);
  return media;
}

function queryString(req: Request, name: string): string {
  const value = req.query[name];
  return typeof value === 'string' ? value : '';
}

interface MediaRow {
  id: string;
  key: string;
  url: string;
  content_type: string;
  bytes: number;
  created_at: Date;
}

function toItem(row: MediaRow, usedBy: MediaUsage[]): MediaItem {
  return {
    id: row.id,
    key: row.key,
    url: row.url,
    folder: row.key.split('/')[0],
    contentType: row.content_type,
    bytes: row.bytes,
    createdAt: row.created_at.toISOString(),
    usedBy
  };
}

export const mediaRouter = Router();

mediaRouter.use('/admin/media', requireAdmin, (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

/**
 * Upload. The body is the file itself; the name and the request's
 * Content-Type are ignored, and the type comes from the bytes. The raw parser
 * enforces the 10 MB limit while reading, so a larger body is refused (413)
 * without being buffered in full.
 */
mediaRouter.post(
  '/admin/media',
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  asyncRoute(async (req, res) => {
    const media = requireMedia(req);

    const folder = queryString(req, 'folder');
    if (!MEDIA_FOLDERS.has(folder)) {
      throw new ApiError('bad_request', 'Unknown upload folder.');
    }

    const bytes: unknown = req.body;
    if (!(bytes instanceof Buffer) || bytes.length === 0) {
      throw new ApiError('bad_request', 'The upload was empty.');
    }

    const sniffed = sniffImage(bytes.subarray(0, SNIFF_BYTES));
    if (sniffed.kind === 'svg') throw new ApiError('unsupported_media_type', SVG_REFUSED);
    if (sniffed.kind !== 'image') throw new ApiError('unsupported_media_type', TYPE_REFUSED);

    const key = newObjectKey(folder, sniffed.type);
    const url = objectUrl(media, key);

    try {
      await media.store.put(key, bytes, sniffed.type);
    } catch (error) {
      console.error('[media] upload to R2 failed:', (error as Error).message);
      throw new ApiError('bad_gateway', 'The image couldn’t be stored. Try again.');
    }

    let row: MediaRow;
    try {
      const { rows } = await pool.query<MediaRow>(
        `insert into public.media (key, url, content_type, bytes, uploaded_by)
         values ($1, $2, $3, $4, $5)
         returning id, key, url, content_type, bytes, created_at`,
        [key, url, sniffed.type, bytes.length, sessionOf(req).user.id]
      );
      row = rows[0];
    } catch (error) {
      // No row-less objects: take the upload back out, best effort.
      await media.store.delete(key).catch((e: Error) => {
        console.error(`[media] orphaned ${key} after a failed insert:`, e.message);
      });
      throw error;
    }

    res.status(201).json(toItem(row, []));
  })
);

/** The library, newest first. Works without R2: it reads the database. */
mediaRouter.get(
  '/admin/media',
  asyncRoute(async (req, res) => {
    const { rows } = await pool.query<MediaRow>(
      // A photo set shows once, as its main file: deleting one width would break its srcset.
      `select id, key, url, content_type, bytes, created_at
         from public.media where photo_key is null or width = ${PRIMARY_WIDTH}
        order by created_at desc, id`
    );
    const usage = await usageOf(pool, rows.map((r) => r.url));

    const payload: MediaLibraryPayload = {
      uploadsEnabled: mediaOf(req) !== null,
      items: rows.map((r) => toItem(r, usage.get(r.url) ?? []))
    };
    res.json(payload);
  })
);

/** Which rows use a URL, ours or not. */
mediaRouter.get(
  '/admin/media/usage',
  asyncRoute(async (req, res) => {
    const url = queryString(req, 'url');
    if (!url) throw new ApiError('bad_request', 'Say which URL.');
    const usage = await usageOf(pool, [url]);
    res.json({ usedBy: usage.get(url) ?? [] });
  })
);

/**
 * Delete from the library, and from R2. In use: 409 with the rows, unless
 * `?force=true`. The row is locked for the whole operation, so a content save
 * that starts using the image either finishes first (and this sees the use)
 * or waits and then finds the image gone (and gets 400).
 *
 * R2 first, then the row: if R2 refuses, the row stays and the admin can try
 * again, instead of the library losing track of an object still in the bucket.
 */
mediaRouter.delete(
  '/admin/media/:id',
  asyncRoute(async (req, res) => {
    const media = requireMedia(req);
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const force = queryString(req, 'force') === 'true';

    const client = await pool.connect();
    try {
      await client.query('begin');

      const { rows } = await client.query<{ key: string; url: string; photo_key: string | null }>(
        // `id::text` so a malformed id is simply "not found" rather than an
        // invalid-uuid error.
        'select key, url, photo_key from public.media where id::text = $1 for update',
        [id]
      );
      const row = rows[0];
      if (!row) throw new ApiError('not_found', 'That image is no longer in the library.');

      const usedBy = (await usageOf(client, [row.url])).get(row.url) ?? [];
      if (usedBy.length > 0 && !force) {
        await client.query('rollback');
        res.status(409).json({
          error: { code: 'conflict', message: 'This image is still in use.' },
          usedBy
        });
        return;
      }

      // A photo set goes whole: its other widths aren't listed, so nothing else would remove them.
      const set = row.photo_key === null
        ? [{ key: row.key }]
        : (await client.query<{ key: string }>('select key from public.media where photo_key = $1 for update', [row.photo_key])).rows;

      try {
        for (const { key } of set) await media.store.delete(key);
      } catch (error) {
        console.error('[media] delete from R2 failed:', (error as Error).message);
        throw new ApiError('bad_gateway', 'Couldn’t delete it from storage. Try again.');
      }

      await client.query('delete from public.media where key = any($1::text[])', [set.map(({ key }) => key)]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    res.status(204).end();
  })
);
