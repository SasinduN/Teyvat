/**
 * One-off maintenance over every stored image URL. Both walk `IMAGE_COLUMNS`
 * (built from the shared field list), so a new image column is covered with
 * no change here. Used by `npm run images:audit` and `npm run media:rebase`.
 *
 * Moving R2 to another bucket or domain: docs/runbooks/move-r2-to-client.md.
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
  /** `media` rows: every upload, and every width of every photo set (0020). */
  media: number;
  /** "table.column" -> rows changed. */
  columns: Record<string, number>;
  /** `image_credits` rows moved: a credit is keyed by its photo's URL. */
  credits: number;
  /**
   * Credits left on the old base because the same photo already has one on the new
   * base (credited again after an earlier, partial move). The new one wins; the old
   * one credits a URL nothing uses any more, so it never shows.
   */
  creditsAlreadyMoved: number;
}

/**
 * Rewrites every URL under `from` to the same path under `to`: `media.url`
 * (uploads and photo sets), every image column, plain and list, and
 * `image_credits.url`. Only a value that *starts with* `from` + "/" changes:
 * Unsplash, the seed's photos, and a URL that merely contains the old base are
 * left alone. A second run finds nothing under `from` and changes nothing.
 * For moving uploads from `r2.dev` to a custom domain. Runs in the caller's
 * transaction, so a dry run is a rollback (`runRebase`).
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
  // A credit's URL is its primary key, so never onto one that already exists.
  const credits = await moved(
    `update public.image_credits c set url = $2 || substr(c.url, length($1) + 1)
      where starts_with(c.url, $1)
        and not exists (select 1 from public.image_credits n where n.url = $2 || substr(c.url, length($1) + 1))`
  );
  const { rows } = await db.query<{ n: number }>(
    'select count(*)::int as n from public.image_credits where starts_with(url, $1)',
    [from]
  );
  return { media, columns, credits, creditsAlreadyMoved: rows[0].n };
}

const quoteIdent = (name: string): string => `"${name.replace(/"/g, '""')}"`;

/**
 * Every text, text[] and JSON column in the public schema, every table, holding
 * `text` anywhere in a value: "table.column" -> rows. A rebase's check that
 * nothing it doesn't know about still names the old base (a setting, a
 * paragraph, a column added later). Counts only: no value is read back.
 */
export async function columnsMentioning(db: Queryable, text: string): Promise<Record<string, number>> {
  const { rows: columns } = await db.query<{ table_name: string; column_name: string }>(
    `select c.table_name, c.column_name
       from information_schema.columns c
       join information_schema.tables t
         on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
      where c.table_schema = 'public'
        and c.table_name <> 'schema_migrations'
        and (c.data_type in ('text', 'character varying', 'json', 'jsonb')
             or (c.data_type = 'ARRAY' and c.udt_name in ('_text', '_varchar')))
      order by c.table_name, c.column_name`
  );
  const found: Record<string, number> = {};
  for (const { table_name: table, column_name: column } of columns) {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.${quoteIdent(table)} where position($1 in ${quoteIdent(column)}::text) > 0`,
      [text]
    );
    if (rows[0].n > 0) found[`${table}.${column}`] = rows[0].n;
  }
  return found;
}

export interface RebaseRun extends RebaseResult {
  /** What still names the old base afterwards (`columnsMentioning`): should be `{}`. */
  leftover: Record<string, number>;
  committed: boolean;
}

/**
 * `npm run media:rebase`: the rebase and the check for leftovers in one
 * transaction, committed, or rolled back for `dryRun` (which then reports
 * exactly what a real run would change and leave).
 */
export async function runRebase(
  client: Pick<PoolClient, 'query'>,
  fromBase: string,
  toBase: string,
  options: { dryRun: boolean }
): Promise<RebaseRun> {
  await client.query('begin');
  try {
    const result = await rebaseMedia(client, fromBase, toBase);
    const leftover = await columnsMentioning(client, normaliseBaseUrl(fromBase));
    await client.query(options.dryRun ? 'rollback' : 'commit');
    return { ...result, leftover, committed: !options.dryRun };
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  }
}

/** Every distinct URL under `base` the database uses: the library, every image column, the credits. */
export async function urlsUnder(db: Queryable, base: string): Promise<string[]> {
  const prefix = `${normaliseBaseUrl(base)}/`;
  const urls = new Set<string>();
  for (const img of await storedImages(db)) if (img.url.startsWith(prefix)) urls.add(img.url);
  for (const table of ['media', 'image_credits']) {
    const { rows } = await db.query<{ url: string }>(`select url from public.${table} where starts_with(url, $1)`, [prefix]);
    for (const { url } of rows) urls.add(url);
  }
  return [...urls].sort();
}

/**
 * The URLs that don't answer 200 with an image: a HEAD for each, eight at a
 * time. Before a rebase, run over the new base, it proves every file was
 * copied (`media:rebase --verify-files`).
 */
export async function missingFiles(
  urls: readonly string[],
  head: (url: string) => Promise<{ status: number; contentType: string | null }> = async (url) => {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return { status: res.status, contentType: res.headers.get('content-type') };
  }
): Promise<{ url: string; problem: string }[]> {
  const missing: { url: string; problem: string }[] = [];
  let next = 0;
  async function worker(): Promise<void> {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        const { status, contentType } = await head(url);
        if (status !== 200) missing.push({ url, problem: `HTTP ${status}` });
        else if (!contentType?.startsWith('image/')) missing.push({ url, problem: `Content-Type ${contentType ?? 'missing'}` });
      } catch (error) {
        missing.push({ url, problem: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, urls.length) }, worker));
  return missing.sort((a, b) => a.url.localeCompare(b.url));
}
