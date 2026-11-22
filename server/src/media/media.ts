/**
 * The media configuration an app runs with, and the rules that don't depend
 * on the storage backend: which URLs are ours, which folders exist, and where
 * an image is used.
 */
import { randomBytes } from 'node:crypto';

import type { Request } from 'express';
import type { PoolClient } from 'pg';

import type { MediaUsage } from '../../../shared/api';
import { FIELDS_BY_TABLE } from '../../../shared/content-schema';
import { CONTENT_TABLE_NAMES, type ContentTableName } from '../../../shared/database.types';
import { EXTENSION_BY_TYPE, type StoredImageType } from '../../../shared/image-sniff';
import { previousR2Base, r2Config } from '../env';
import { allowedImageOrigins } from '../../../shared/image-hosts';
import { r2Endpoint, r2Store, type ObjectStore } from './store';

export interface MediaConfig {
  store: ObjectStore;
  /** Normalised: `https://…`, no trailing slash. */
  publicBaseUrl: string;
  /** R2_PREVIOUS_PUBLIC_BASE_URL during a move: its images are still allowed. Not ours for uploads or deletes. */
  previousBaseUrl?: string | null;
}

/** Built from the environment; `null` when R2 isn't configured. */
export function mediaFromEnv(): MediaConfig | null {
  if (!r2Config) return null;
  return {
    store: r2Store({ ...r2Config, endpoint: r2Endpoint(r2Config.accountId) }),
    publicBaseUrl: r2Config.publicBaseUrl,
    previousBaseUrl: previousR2Base
  };
}

/** The image allow-list for an app with this media configuration: the CSP and every image field. */
export function imageOriginsFor(media: MediaConfig | null): string[] {
  return allowedImageOrigins(media?.publicBaseUrl ?? null, media?.previousBaseUrl ?? null);
}

/** The app's media configuration, set on `app.locals` by `createApp`. */
export function mediaOf(req: Request): MediaConfig | null {
  return (req.app.locals.media as MediaConfig | null | undefined) ?? null;
}

/**
 * Upload folders: every `folder` an image field declares, plus `library` for
 * uploads made from the library page. Anything else is refused, so a key can
 * never contain a path the client chose.
 */
export const MEDIA_FOLDERS: ReadonlySet<string> = new Set([
  'library',
  ...Object.values(FIELDS_BY_TABLE)
    .flat()
    .flatMap((f) => (f.type === 'image' || f.type === 'imageList' ? [f.folder] : []))
]);

/** 10 MB: the most one upload may be, after the browser has resized it. Also `images:import`'s limit. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function newObjectKey(folder: string, type: StoredImageType): string {
  return `${folder}/${Date.now()}-${randomBytes(8).toString('hex')}.${EXTENSION_BY_TYPE[type]}`;
}

export function objectUrl(media: MediaConfig, key: string): string {
  return `${media.publicBaseUrl}/${key}`;
}

/**
 * Whether a URL points into our bucket. The trailing `/` matters:
 * `https://x.r2.dev.evil.com/a.jpg` starts with `https://x.r2.dev` but is
 * someone else's. A URL passing this is still only ours if it has a `media`
 * row; callers check that.
 */
export function isUnderBase(media: MediaConfig | null, url: string): boolean {
  return media !== null && url.startsWith(`${media.publicBaseUrl}/`);
}

/* ------------------------------------------------------------------ usage */

interface ImageColumn {
  table: ContentTableName;
  column: string;
  list: boolean;
  titleField: string;
}

/** The first text field is the row's title everywhere in the admin. */
function titleFieldOf(table: ContentTableName): string {
  return FIELDS_BY_TABLE[table].find((f) => f.type === 'text')?.name ?? 'id';
}

/** Every column that holds an image URL, straight from the shared field list. */
export const IMAGE_COLUMNS: readonly ImageColumn[] = CONTENT_TABLE_NAMES.flatMap((table) =>
  FIELDS_BY_TABLE[table].flatMap((f) =>
    f.type === 'image' || f.type === 'imageList'
      ? [{ table, column: f.name, list: f.type === 'imageList', titleField: titleFieldOf(table) }]
      : []
  )
);

/** The image URLs a row's values hold, for the columns of its table. */
export function imageUrlsIn(table: ContentTableName, values: Record<string, unknown>): string[] {
  const urls: string[] = [];
  for (const c of IMAGE_COLUMNS) {
    if (c.table !== table) continue;
    const value = values[c.column];
    if (typeof value === 'string' && value) urls.push(value);
    if (Array.isArray(value)) urls.push(...value.filter((v): v is string => typeof v === 'string'));
  }
  return urls;
}

/**
 * Form paths (`image`, `gallery.2`) of the fields in `values` holding any of
 * `urls`, so a 400 can point at the exact box.
 */
export function fieldPathsFor(
  table: ContentTableName,
  values: Record<string, unknown>,
  urls: ReadonlySet<string>,
  message: string
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const c of IMAGE_COLUMNS) {
    if (c.table !== table) continue;
    const value = values[c.column];
    if (typeof value === 'string' && urls.has(value)) fields[c.column] = message;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === 'string' && urls.has(v)) fields[`${c.column}.${i}`] = message;
      });
    }
  }
  return fields;
}

type Queryable = Pick<PoolClient, 'query'>;

/**
 * Which rows use each of `urls`, drafts included. One query: a union over
 * every image column, with identifiers from `IMAGE_COLUMNS` only.
 */
export async function usageOf(db: Queryable, urls: string[]): Promise<Map<string, MediaUsage[]>> {
  const usage = new Map<string, MediaUsage[]>(urls.map((u) => [u, []]));
  if (urls.length === 0) return usage;

  const selects = IMAGE_COLUMNS.map((c) =>
    c.list
      ? `select u.url, '${c.table}' as tbl, t.id, t."${c.titleField}"::text as title
           from public.${c.table} t join unnest($1::text[]) as u(url) on u.url = any(t."${c.column}")`
      : `select t."${c.column}" as url, '${c.table}' as tbl, t.id, t."${c.titleField}"::text as title
           from public.${c.table} t where t."${c.column}" = any($1::text[])`
  );

  const { rows } = await db.query<{ url: string; tbl: string; id: string; title: string }>(
    `select distinct url, tbl, id, title from (${selects.join(' union all ')}) used
      order by tbl, id`,
    [urls]
  );

  for (const r of rows) usage.get(r.url)?.push({ table: r.tbl, id: r.id, title: r.title });
  return usage;
}
