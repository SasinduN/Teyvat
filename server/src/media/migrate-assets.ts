/**
 * Moves the photographs committed in public/assets/ into R2, and points the
 * rows at them. Used by `npm run images:migrate-assets`.
 *
 * The site shows those files because `shared/public-photos.ts` swaps URLs as it
 * reads, not because a row names them: a pinned destination cover or a corrected
 * seed photo is resolved in code. So "what a row should hold" is worked out by
 * asking those same rules what the row shows today.
 *
 * For each photograph, in its own transaction once its files are up:
 *
 *   1. upload its widths to `assets/<width>-<hash>.webp`. The hash is the file's
 *      own SHA-256, so the key is stable and re-uploading changes nothing;
 *   2. record them in `media`, as a photo set (`photo_key`, `width`);
 *   3. make sure the main file has its `image_credits` row.
 *
 * Then every image column showing a file from public/assets/ is rewritten to the
 * R2 URL, only if it still holds what was read. Each row is one statement, and a
 * re-run finds nothing left to do, so stopping anywhere is safe.
 *
 * Nothing is uploaded twice:
 *
 *   - a width already in the photo's set is left alone;
 *   - a photo `images:import` already copied from Wikimedia (a `media` row whose
 *     credit has the same source page) keeps that file as its 1280 px width. All
 *     33 came from Wikimedia's 1280 px thumbnails. Rows already on it don't change.
 *
 * Skipped: a photo nothing refers to, one without a clear licence, and the
 * 1920 px files of Jaffna and Udawalawe, which were upscaled. Nothing here
 * deletes a file, in the repo or in R2.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import type { PoolClient } from 'pg';

import { sniffImage, SNIFF_BYTES } from '../../../shared/image-sniff';
import { committedVariants, photoAsset, PRIMARY_WIDTH, usableVariants, type PhotoSets, type PhotoVariant } from '../../../shared/photo-assets';
import { PHOTO_CORRECTIONS } from '../../../shared/photo-corrections';
import { photoResolver } from '../../../shared/public-photos';
import photographs from '../../../shared/travel-photos.json';
import { IMAGE_COLUMNS, MAX_UPLOAD_BYTES, objectUrl, type MediaConfig } from './media';
import { loadPhotoSets } from './photo-sets';

type Queryable = Pick<PoolClient, 'query'>;

/** Where the dry run says the files would go when this environment has no R2 settings. */
const NO_BASE = 'https://<R2_PUBLIC_BASE_URL>';
const ASSET_PATH = '/assets/';

/** What the site does today, before any of this: the rules with nothing in R2. */
const today = photoResolver();

export interface PlannedFile {
  width: number;
  /** The file's name in public/assets/. */
  file: string;
  bytes: number;
  objectKey: string;
  url: string;
  action: 'upload' | 'already in R2' | 'reuse';
}

export interface PlannedPhoto {
  key: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
  /** What makes the site need it. */
  usedBy: 'corrections' | 'rows' | 'nothing';
  skip: 'not referenced' | 'no clear licence' | null;
  /** The file `images:import` already put in R2, kept as the 1280 px width. */
  copyInR2: string | null;
  /** Upscaled widths left out. */
  leftOut: number[];
  files: PlannedFile[];
}

export interface RowChange {
  table: string;
  id: string;
  column: string;
  from: string | string[];
  to: string | string[];
}

export interface AssetPlan {
  photos: PlannedPhoto[];
  rows: RowChange[];
}

interface ImageRow {
  table: string;
  id: string;
  column: string;
  list: boolean;
  value: string | string[];
}

async function imageRows(db: Queryable): Promise<ImageRow[]> {
  const found: ImageRow[] = [];
  for (const c of IMAGE_COLUMNS) {
    const { rows } = await db.query<{ id: string; value: string | string[] | null }>(
      `select id, "${c.column}" as value from public.${c.table} order by id`
    );
    for (const r of rows) {
      if (r.value !== null) found.push({ table: c.table, id: r.id, column: c.column, list: c.list, value: r.value });
    }
  }
  return found;
}

/** What a column shows the visitor under `rules`: the same calls as `GET /api/content`. */
function shown(row: ImageRow, rules: ReturnType<typeof photoResolver>): string[] {
  if (row.list) {
    const list = row.value as string[];
    return (row.table === 'destinations' ? rules.publicGallery(row.id, list) : list).map(rules.localPhoto);
  }
  const value = row.value as string;
  return [row.column === 'image' ? rules.publicPhoto(row.table, row.id, value) : rules.localPhoto(value)];
}

const primaryOf = (sets: PhotoSets, key: string | undefined) =>
  key ? sets[key]?.find((v) => v.width === PRIMARY_WIDTH)?.url : undefined;

/** The row's new value, or null when it needs none. A list changes only once all of it can. */
function repointed(row: ImageRow, sets: PhotoSets): string | string[] | null {
  const showing = shown(row, today);
  if (!showing.some((url) => url.startsWith(ASSET_PATH))) return null;
  const next = showing.map((url) => (url.startsWith(ASSET_PATH) ? primaryOf(sets, photoAsset(url)?.key) : url));
  if (next.some((url) => url === undefined)) return null;
  const urls = next as string[];
  if (row.list) return JSON.stringify(urls) === JSON.stringify(row.value) ? null : urls;
  return urls[0] === row.value ? null : urls[0];
}

const licensed = (photo: (typeof photographs)[number]) =>
  Boolean(photo.author?.trim() && photo.license?.trim() && /^https:\/\//.test(photo.licenseUrl ?? '') && /^https:\/\//.test(photo.source ?? ''));

/** `<key>-<width>-<hash>.webp` to `assets/<width>-<hash>.webp`, which `media.key`'s check allows. */
export function objectKeyFor(file: string): string {
  const match = /-(\d+)-([0-9a-f]{16})\.webp$/.exec(file);
  if (!match) throw new Error(`${file}: not <key>-<width>-<hash>.webp`);
  return `assets/${match[1]}-${match[2]}.webp`;
}

export const defaultAssetsDir = () => resolve(process.cwd(), 'public', 'assets');

/**
 * Everything the run would do, read-only: what `--dry-run` prints, and what the
 * real run then carries out.
 */
export async function planAssetMigration(
  db: Queryable,
  options: { publicBaseUrl?: string | null; assetsDir?: string } = {}
): Promise<AssetPlan> {
  const assetsDir = options.assetsDir ?? defaultAssetsDir();
  const base = options.publicBaseUrl ?? NO_BASE;
  const sets = await loadPhotoSets(db);
  const rows = await imageRows(db);

  const shownByRows = new Set(
    rows.flatMap((row) => shown(row, today)).filter((url) => url.startsWith(ASSET_PATH)).map((url) => photoAsset(url)?.key)
  );
  const pinned = new Set(Object.values(PHOTO_CORRECTIONS).flatMap((byId) => Object.values(byId)));

  const { rows: copies } = await db.query<{ source_url: string; url: string }>(
    `select c.source_url, m.url from public.image_credits c join public.media m on m.url = c.url
      where m.photo_key is null and c.source_url = any($1::text[]) order by m.created_at, m.url`,
    [photographs.map((photo) => photo.source)]
  );

  const photos = photographs.map((photo): PlannedPhoto => {
    const all = committedVariants(photo.image);
    const usable = usableVariants(photo.key, all);
    const inSet = sets[photo.key] ?? [];
    const copy = inSet.some((v) => v.width === PRIMARY_WIDTH)
      ? null
      : (copies.find((row) => row.source_url === photo.source)?.url ?? null);
    const usedBy = pinned.has(photo.key) ? 'corrections' : shownByRows.has(photo.key) ? 'rows' : 'nothing';

    const files = usable.map((variant: PhotoVariant): PlannedFile => {
      const file = basename(variant.url);
      const path = join(assetsDir, file);
      const objectKey = objectKeyFor(file);
      const bytes = existsSync(path) ? readFileSync(path).length : 0;
      const existing = inSet.find((v) => v.width === variant.width);
      if (existing) return { width: variant.width, file, bytes, objectKey, url: existing.url, action: 'already in R2' };
      if (copy && variant.width === PRIMARY_WIDTH) return { width: variant.width, file, bytes, objectKey, url: copy, action: 'reuse' };
      return { width: variant.width, file, bytes, objectKey, url: `${base}/${objectKey}`, action: 'upload' };
    });

    return {
      key: photo.key,
      author: photo.author,
      license: photo.license,
      licenseUrl: photo.licenseUrl,
      source: photo.source,
      usedBy,
      skip: !licensed(photo) ? 'no clear licence' : usedBy === 'nothing' ? 'not referenced' : null,
      copyInR2: copy,
      leftOut: all.filter((v) => !usable.some((u) => u.width === v.width)).map((v) => v.width),
      files
    };
  });

  // The rows as they will be once the sets above exist.
  const planned: Record<string, PhotoVariant[]> = {};
  for (const photo of photos) {
    if (!photo.skip) planned[photo.key] = photo.files.map(({ width, url }) => ({ width, url }));
  }
  const changes: RowChange[] = [];
  for (const row of rows) {
    const to = repointed(row, planned);
    if (to !== null) changes.push({ table: row.table, id: row.id, column: row.column, from: row.value, to });
  }
  return { photos, rows: changes };
}

export type MigrateOutcome =
  | { key: string; status: 'moved'; uploaded: number; reused: boolean; creditAdded: boolean }
  | { key: string; status: 'skipped'; reason: string }
  | { key: string; status: 'failed'; reason: string };

export interface MigrateResult {
  photos: MigrateOutcome[];
  rowsChanged: number;
  rowsFailed: { table: string; id: string; column: string; reason: string }[];
}

/** The file's bytes, once they prove to be the file its name says. */
function verifiedBytes(assetsDir: string, file: PlannedFile): Uint8Array {
  const bytes = readFileSync(join(assetsDir, file.file));
  const hash = /-([0-9a-f]{16})\.webp$/.exec(file.file)?.[1];
  if (createHash('sha256').update(bytes).digest('hex').slice(0, 16) !== hash) throw new Error(`${file.file} doesn't match the hash in its name`);
  const sniffed = sniffImage(bytes.subarray(0, SNIFF_BYTES));
  if (sniffed.kind !== 'image' || sniffed.type !== 'image/webp') throw new Error(`${file.file} isn't a WebP`);
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error(`${file.file} is over the upload limit`);
  return bytes;
}

/** Runs the plan. `db` must be one connection (a `pg.Client` or a pool client). */
export async function migrateAssets(
  db: Queryable,
  media: MediaConfig,
  options: { assetsDir?: string; log?: (line: string) => void } = {}
): Promise<MigrateResult> {
  const log = options.log ?? (() => undefined);
  const assetsDir = options.assetsDir ?? defaultAssetsDir();
  const plan = await planAssetMigration(db, { publicBaseUrl: media.publicBaseUrl, assetsDir });
  const outcomes: MigrateOutcome[] = [];

  for (const photo of plan.photos) {
    if (photo.skip) {
      outcomes.push({ key: photo.key, status: 'skipped', reason: photo.skip });
      log(`${photo.key}: skipped (${photo.skip})`);
      continue;
    }
    const toUpload = photo.files.filter((f) => f.action === 'upload');
    try {
      // Up first: a row must never name a file that isn't there yet.
      const uploads: { file: PlannedFile; bytes: number }[] = [];
      for (const file of toUpload) {
        const bytes = verifiedBytes(assetsDir, file);
        await media.store.put(file.objectKey, bytes, 'image/webp');
        uploads.push({ file, bytes: bytes.length });
      }

      const main = photo.files.find((f) => f.width === PRIMARY_WIDTH);
      if (!main) throw new Error(`no ${PRIMARY_WIDTH} px file`);

      await db.query('begin');
      for (const { file, bytes } of uploads) {
        await db.query(
          `insert into public.media (key, url, content_type, bytes, uploaded_by, photo_key, width)
           values ($1, $2, 'image/webp', $3, null, $4, $5)
           on conflict (key) do update set photo_key = excluded.photo_key, width = excluded.width`,
          [file.objectKey, objectUrl(media, file.objectKey), bytes, photo.key, file.width]
        );
      }
      if (main.action === 'reuse') {
        await db.query(`update public.media set photo_key = $2, width = $3 where url = $1`, [main.url, photo.key, main.width]);
      }
      const credit = await db.query(
        `insert into public.image_credits (url, author, license, license_url, source_url)
         values ($1, $2, $3, $4, $5) on conflict (url) do nothing`,
        [main.url, photo.author, photo.license, photo.licenseUrl, photo.source]
      );
      await db.query('commit');

      const creditAdded = (credit.rowCount ?? 0) > 0;
      outcomes.push({ key: photo.key, status: 'moved', uploaded: uploads.length, reused: main.action === 'reuse', creditAdded });
      log(`${photo.key}: ${uploads.length} uploaded${main.action === 'reuse' ? ', 1280 px already in R2' : ''}${creditAdded ? ', credit added' : ''}`);
    } catch (error) {
      await db.query('rollback').catch(() => undefined);
      outcomes.push({ key: photo.key, status: 'failed', reason: (error as Error).message });
      log(`${photo.key}: failed: ${(error as Error).message}`);
    }
  }

  // Only what is really in R2 now: a photo that failed above keeps its rows.
  const sets = await loadPhotoSets(db);
  let rowsChanged = 0;
  const rowsFailed: MigrateResult['rowsFailed'] = [];
  for (const row of await imageRows(db)) {
    const to = repointed(row, sets);
    if (to === null) continue;
    try {
      const cast = row.list ? '::text[]' : '';
      const result = await db.query(
        `update public.${row.table} set "${row.column}" = $1${cast} where id = $2 and "${row.column}" = $3${cast}`,
        [to, row.id, row.value]
      );
      rowsChanged += result.rowCount ?? 0;
      log(`${row.table}/${row.id} ${row.column}: repointed`);
    } catch (error) {
      rowsFailed.push({ table: row.table, id: row.id, column: row.column, reason: (error as Error).message });
      log(`${row.table}/${row.id} ${row.column}: failed: ${(error as Error).message}`);
    }
  }
  return { photos: outcomes, rowsChanged, rowsFailed };
}

export interface AssetAudit {
  /** Image columns holding a `/assets/` path. */
  rowsHoldingAssets: { table: string; id: string; column: string; url: string }[];
  /** Image columns the visitor still sees a `/assets/` file through, whatever they hold. */
  rowsShowingAssets: { table: string; id: string; column: string; url: string }[];
  /** Photos the code pins or corrects to that aren't in R2 yet. */
  photosNotInR2: string[];
}

/**
 * Whether the site still depends on public/assets/. A row can hold an R2 URL and
 * still show a committed file, because the rules swap URLs as they read; so a
 * clean result needs all three lists empty, not just the first.
 */
export async function auditAssets(db: Queryable): Promise<AssetAudit> {
  const sets = await loadPhotoSets(db);
  const rules = photoResolver(sets);
  const rows = await imageRows(db);
  const audit: AssetAudit = { rowsHoldingAssets: [], rowsShowingAssets: [], photosNotInR2: [] };
  for (const row of rows) {
    const where = { table: row.table, id: row.id, column: row.column };
    for (const url of [row.value].flat()) if (url.startsWith(ASSET_PATH)) audit.rowsHoldingAssets.push({ ...where, url });
    for (const url of shown(row, rules)) if (url.startsWith(ASSET_PATH)) audit.rowsShowingAssets.push({ ...where, url });
  }
  const pinned = new Set(Object.values(PHOTO_CORRECTIONS).flatMap((byId) => Object.values(byId)));
  audit.photosNotInR2 = [...pinned].filter((key) => !primaryOf(sets, key)).sort();
  return audit;
}
