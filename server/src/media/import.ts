/**
 * Copies the Wikimedia Commons photos the content uses into our R2 bucket,
 * and points the rows at the copies. Used by `npm run images:import`.
 *
 * Migration 0010 hotlinked about 30 photos from upload.wikimedia.org, which
 * ties the site to someone else's rate limits (a burst of requests is
 * answered with 429). Once nothing uses that host, it leaves the CSP
 * (docs/plans/fix-pr11.md, PR B).
 *
 * For each distinct Wikimedia URL in any image column, drafts included:
 *
 *   1. download it, politely: one request at a time, a pause between them, a
 *      User-Agent that says who is asking, and `Retry-After` honoured;
 *   2. check it is a JPEG, PNG, WebP or AVIF of at most 10 MB, by its bytes;
 *   3. upload it to R2 (`library/…`) with a `media` row, so it shows in the
 *      media library like any upload;
 *   4. in one transaction: rewrite every image column that **still holds
 *      that exact URL** to the R2 URL, and move its photo credit along.
 *
 * Each photo is its own transaction, so a failure leaves the others done and
 * a re-run picks up only what is left. If a transaction fails, its R2 object
 * is deleted again, as a failed upload is.
 *
 * Content rows it touches get a new `updated_at`, so an editor open on one
 * at that moment gets the usual 409 and reloads. Run it when nobody is
 * editing.
 */
import type { PoolClient } from 'pg';

import { sniffImage, SNIFF_BYTES } from '../../../shared/image-sniff';
import { storedImages, type StoredImage } from './maintenance';
import { IMAGE_COLUMNS, MAX_UPLOAD_BYTES, newObjectKey, objectUrl, type MediaConfig } from './media';

type Queryable = Pick<PoolClient, 'query'>;

/** The host migration 0010's photos are on. */
export const WIKIMEDIA_UPLOADS = 'https://upload.wikimedia.org/';

/**
 * Wikimedia's policy asks automated clients to identify themselves with a
 * way to reach whoever runs them: the repository, here.
 */
export const IMPORT_USER_AGENT = 'Teyvat-image-import/1.0 (+https://github.com/SasinduN/Teyvat; one-off copy of credited photos)';

export interface ImportOptions {
  /** Stand-ins for tests. */
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** The least time between two requests' starts. */
  minIntervalMs?: number;
  /** Tries per photo, for 429, 503 and network errors. */
  maxTries?: number;
  /** The first back-off when the server doesn't say how long to wait; doubles each time. */
  backoffMs?: number;
  log?: (line: string) => void;
}

export type ImportOutcome =
  | { url: string; status: 'moved'; to: string; rows: number; credit: boolean }
  | { url: string; status: 'failed'; reason: string };

/** Every Wikimedia URL in the content, with where each is used. */
export async function wikimediaImagesInUse(db: Queryable): Promise<Map<string, StoredImage[]>> {
  const byUrl = new Map<string, StoredImage[]>();
  for (const image of await storedImages(db)) {
    if (!image.url.startsWith(WIKIMEDIA_UPLOADS)) continue;
    byUrl.set(image.url, [...(byUrl.get(image.url) ?? []), image]);
  }
  return byUrl;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Seconds, or an HTTP date; anything else is no answer. */
function retryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

class Downloader {
  private last = 0;
  constructor(private readonly options: Required<Omit<ImportOptions, 'log'>> & { log: (line: string) => void }) {}

  /** The photo's bytes, or a reason it couldn't be fetched. */
  async get(url: string): Promise<{ bytes: Uint8Array } | { reason: string }> {
    const { fetch: fetcher, sleep, minIntervalMs, maxTries, backoffMs, log } = this.options;
    let lastReason = 'no answer';
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      const wait = this.last + minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      this.last = Date.now();

      let res: Response;
      try {
        res = await fetcher(url, { headers: { 'User-Agent': IMPORT_USER_AGENT, Accept: 'image/*' }, redirect: 'follow' });
      } catch (error) {
        lastReason = `network error: ${(error as Error).message}`;
        await sleep(backoffMs * 2 ** (attempt - 1));
        continue;
      }

      if (res.status === 429 || res.status === 503) {
        await res.body?.cancel().catch(() => undefined);
        const delay = retryAfterMs(res.headers.get('retry-after')) ?? backoffMs * 2 ** (attempt - 1);
        lastReason = `HTTP ${res.status}`;
        log(`    ${res.status}; waiting ${Math.round(delay / 1000)} s (try ${attempt} of ${maxTries})`);
        await sleep(delay);
        continue;
      }
      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined);
        return { reason: `HTTP ${res.status}` };
      }

      const declared = Number(res.headers.get('content-length'));
      if (declared > MAX_UPLOAD_BYTES) {
        await res.body?.cancel().catch(() => undefined);
        return { reason: `larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB` };
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length === 0) return { reason: 'empty response' };
      if (bytes.length > MAX_UPLOAD_BYTES) return { reason: `larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB` };
      return { bytes };
    }
    return { reason: `gave up after ${maxTries} tries (${lastReason})` };
  }
}

/**
 * The same polite downloader, for `npm run content:import`'s photos: one request at a
 * time with a pause between, `Retry-After` honoured, 10 MB at most.
 */
export function createDownloader(options: ImportOptions = {}): { get(url: string): Promise<{ bytes: Uint8Array } | { reason: string }> } {
  return new Downloader({
    fetch: options.fetch ?? fetch,
    sleep: options.sleep ?? defaultSleep,
    minIntervalMs: options.minIntervalMs ?? 2000,
    maxTries: options.maxTries ?? 5,
    backoffMs: options.backoffMs ?? 5000,
    log: options.log ?? (() => undefined)
  });
}

/** Rewrites every image column holding exactly `from` to `to`; returns the rows changed. */
async function repoint(db: Queryable, from: string, to: string): Promise<number> {
  let rows = 0;
  for (const c of IMAGE_COLUMNS) {
    const result = await db.query(
      c.list
        ? `update public.${c.table} set "${c.column}" = array_replace("${c.column}", $1, $2) where $1 = any("${c.column}")`
        : `update public.${c.table} set "${c.column}" = $2 where "${c.column}" = $1`,
      [from, to]
    );
    rows += result.rowCount ?? 0;
  }
  return rows;
}

/**
 * Imports every Wikimedia photo in use. `db` must be a single connection (a
 * `pg.Client` or a pool client): each photo's rewrite is a transaction on it.
 */
export async function importWikimediaImages(
  db: Queryable,
  media: MediaConfig,
  options: ImportOptions = {}
): Promise<ImportOutcome[]> {
  const log = options.log ?? (() => undefined);
  const downloader = createDownloader({ ...options, log });

  const outcomes: ImportOutcome[] = [];
  const urls = [...(await wikimediaImagesInUse(db)).keys()];
  for (const [i, url] of urls.entries()) {
    log(`[${i + 1}/${urls.length}] ${url}`);
    const downloaded = await downloader.get(url);
    if ('reason' in downloaded) {
      outcomes.push({ url, status: 'failed', reason: downloaded.reason });
      log(`    failed: ${downloaded.reason}`);
      continue;
    }

    const sniffed = sniffImage(downloaded.bytes.subarray(0, SNIFF_BYTES));
    if (sniffed.kind !== 'image') {
      outcomes.push({ url, status: 'failed', reason: 'not a JPEG, PNG, WebP or AVIF image' });
      log('    failed: not a JPEG, PNG, WebP or AVIF image');
      continue;
    }

    const key = newObjectKey('library', sniffed.type);
    const to = objectUrl(media, key);
    try {
      await media.store.put(key, downloaded.bytes, sniffed.type);
    } catch (error) {
      outcomes.push({ url, status: 'failed', reason: `R2 upload failed: ${(error as Error).message}` });
      log(`    failed: R2 upload failed: ${(error as Error).message}`);
      continue;
    }

    try {
      await db.query('begin');
      await db.query(
        `insert into public.media (key, url, content_type, bytes, uploaded_by) values ($1, $2, $3, $4, null)`,
        [key, to, sniffed.type, downloaded.bytes.length]
      );
      const rows = await repoint(db, url, to);
      // The credit follows its photo. A credit already on the new URL (there
      // can't be one: the key is new) would win, and the old one goes.
      const credit = await db.query(
        `update public.image_credits set url = $2
          where url = $1 and not exists (select 1 from public.image_credits where url = $2)`,
        [url, to]
      );
      await db.query('commit');
      outcomes.push({ url, status: 'moved', to, rows, credit: (credit.rowCount ?? 0) > 0 });
      log(`    -> ${to}  (${rows} row(s)${(credit.rowCount ?? 0) > 0 ? ', credit moved' : ', no credit on file'})`);
    } catch (error) {
      await db.query('rollback').catch(() => undefined);
      await media.store.delete(key).catch((e: Error) => log(`    orphaned ${key} in R2: ${e.message}`));
      outcomes.push({ url, status: 'failed', reason: `database update failed: ${(error as Error).message}` });
      log(`    failed: database update failed: ${(error as Error).message}`);
    }
  }
  return outcomes;
}
