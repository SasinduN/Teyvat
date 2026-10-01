/**
 * One-off maintenance over every stored image URL. Both walk `IMAGE_COLUMNS`
 * (built from the shared field list), so a new image column is covered with
 * no change here. Used by `npm run images:audit` and `npm run media:rebase`.
 */
import type { PoolClient } from 'pg';

import { normaliseBaseUrl } from '../env';
import { isAllowedImageUrl } from '../../../shared/image-hosts';
import { IMAGE_COLUMNS } from './media';

type Queryable = Pick<PoolClient, 'query'>;

export interface StoredImage {
  table: string;
  id: string;
  column: string;
  url: string;
}

/** Every image URL in the content tables, drafts included. */
export async function storedImages(db: Queryable): Promise<StoredImage[]> {
  const found: StoredImage[] = [];
  for (const c of IMAGE_COLUMNS) {
    const sql = c.list
      ? `select t.id, u.url from public.${c.table} t, unnest(t."${c.column}") as u(url)`
      : `select t.id, t."${c.column}" as url from public.${c.table} t where t."${c.column}" is not null`;
    const { rows } = await db.query<{ id: string; url: string }>(sql);
    for (const r of rows) found.push({ table: c.table, id: r.id, column: c.column, url: r.url });
  }
  return found;
}

/** The stored images the CSP would block: not on the allow-list. */
export async function auditImages(db: Queryable, origins: readonly string[]): Promise<StoredImage[]> {
  return (await storedImages(db)).filter((img) => !isAllowedImageUrl(img.url, origins));
}

export interface RebaseResult {
  media: number;
  /** "table.column" -> rows changed. */
  columns: Record<string, number>;
}

/**
 * Rewrites every URL under `from` to the same path under `to`: `media.url`
 * and every image column, plain and list. For moving uploads from `r2.dev`
 * to a custom domain. Runs in the caller's transaction, so a dry run is a
 * rollback.
 *
 * Content rows it touches get a new `updated_at`, so an editor open on one
 * at that moment gets the usual 409 and reloads. Do it when nobody is
 * editing.
 */
export async function rebaseMedia(db: Queryable, fromBase: string, toBase: string): Promise<RebaseResult> {
  const from = `${normaliseBaseUrl(fromBase)}/`;
  const to = `${normaliseBaseUrl(toBase)}/`;
  for (const base of [from, to]) {
    if (!/^https:\/\/[^\s/]+\/$/.test(base) && !/^https:\/\/[^\s/]+\/.+\/$/.test(base)) {
      throw new Error(`Not an https:// base URL: ${base}`);
    }
  }
  if (from === to) throw new Error('--from and --to are the same.');

  const moved = (sql: string) => db.query(sql, [from, to]).then((r) => r.rowCount ?? 0);

  const media = await moved(
    `update public.media set url = $2 || substr(url, length($1) + 1) where starts_with(url, $1)`
  );

  const columns: Record<string, number> = {};
  for (const c of IMAGE_COLUMNS) {
    columns[`${c.table}.${c.column}`] = await moved(
      c.list
        ? `update public.${c.table} set "${c.column}" = array(
             select case when starts_with(u, $1) then $2 || substr(u, length($1) + 1) else u end
               from unnest("${c.column}") with ordinality as x(u, n) order by n)
           where exists (select 1 from unnest("${c.column}") as y(u) where starts_with(u, $1))`
        : `update public.${c.table} set "${c.column}" = $2 || substr("${c.column}", length($1) + 1)
           where starts_with("${c.column}", $1)`
    );
  }
  return { media, columns };
}
