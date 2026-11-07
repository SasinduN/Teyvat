/**
 * `npm run content:import`: researched destinations and attractions from a JSON file
 * (`scripts/content/places.json`), into the database as drafts.
 *
 *   - Upserts by slug, but only rows this import created and nobody has edited since:
 *     `public.content_imports` holds the `updated_at` each import left, and any other
 *     value means an admin saved it. Rows it didn't create (the seed's, an admin's) are
 *     left alone, and a row an admin deleted is not created again.
 *   - Everything it creates is unpublished. Updating never changes `published`.
 *   - Each photo is downloaded from Wikimedia Commons (politely, one at a time), put in
 *     R2 with a `media` row, and credited in `image_credits` (author, licence, the
 *     Commons page). A photo already copied, found by its Commons page, isn't copied again.
 *   - Safe to run twice: the second run finds every row unchanged.
 *
 * Each row is its own transaction on the one connection given, so a failure leaves the
 * rest done. A dry run only reads.
 */
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { z } from 'zod';

import { CATEGORY_OPTIONS, REGION_OPTIONS, fieldErrors, schemaForTable } from '../../shared/content-schema';
import { UNSPLASH_ORIGIN } from '../../shared/image-hosts';
import { normalizeMonths } from '../../shared/best-months';
import { TOUR_STOP_BOUNDS } from '../../shared/tour-stops';
import { sniffImage, SNIFF_BYTES } from '../../shared/image-sniff';
import { createDownloader, type ImportOptions } from './media/import';
import { newObjectKey, objectUrl, type MediaConfig } from './media/media';

type Queryable = Pick<PoolClient, 'query'>;

/* --------------------------------------------------------------- the file */

const photoSchema = z.object({
  /** The Commons file page: the credit's link, and how a copy already made is found. */
  source: z.url({ protocol: /^https$/ }),
  /** What is downloaded: Commons' 1280 px rendering, or the original if smaller. */
  download: z.url({ protocol: /^https$/ }).refine((u) => new URL(u).hostname === 'upload.wikimedia.org', 'Photos come from upload.wikimedia.org.'),
  width: z.number().int().positive(),
  author: z.string().trim().min(1).max(200),
  license: z.string().trim().min(1).max(100),
  // image_credits takes https:// links only.
  license_url: z.url({ protocol: /^https$/ }).nullable()
});

const months = z.array(z.number().int().min(1).max(12)).transform(normalizeMonths);

const destinationSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.enum(REGION_OPTIONS),
  province: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  category: z.array(z.enum(CATEGORY_OPTIONS)),
  short_description: z.string(),
  long_description: z.string(),
  best_time: z.string(),
  best_months: months,
  photo: photoSchema.nullable()
});

const attractionSchema = z.object({
  id: z.string(),
  destination_id: z.string(),
  name: z.string(),
  category: z.enum(CATEGORY_OPTIONS),
  short_description: z.string(),
  latitude: z.number().min(TOUR_STOP_BOUNDS.lat.min).max(TOUR_STOP_BOUNDS.lat.max),
  longitude: z.number().min(TOUR_STOP_BOUNDS.lng.min).max(TOUR_STOP_BOUNDS.lng.max),
  best_months: months,
  photo: photoSchema.nullable()
});

export type PlacePhoto = z.output<typeof photoSchema>;
export type ImportDestination = z.output<typeof destinationSchema>;
export type ImportAttraction = z.output<typeof attractionSchema>;
export interface PlacesFile {
  destinations: ImportDestination[];
  attractions: ImportAttraction[];
}

/**
 * The file, checked: its own shape (extra keys such as `sources` and `osm` are notes for
 * people and are ignored), and every row as the admin form would check it, so nothing it
 * writes is a row the admin then can't save.
 */
export function parsePlacesFile(input: unknown): PlacesFile {
  const file = z.object({ destinations: z.array(destinationSchema), attractions: z.array(attractionSchema) }).parse(input);
  const problems: string[] = [];
  const ids = { destinations: new Set<string>(), attractions: new Set<string>() };
  for (const d of file.destinations) {
    if (ids.destinations.has(d.id)) problems.push(`destinations/${d.id}: listed twice`);
    ids.destinations.add(d.id);
    // The admin requires a cover image and a best time. Where no open photo or no source
    // exists, the row has none yet: check the rest with stand-ins. The page shows its
    // placeholder and leaves the season out, and the admin asks for both at the first save.
    const checked = schemaForTable('destinations', 'create').safeParse({
      ...destinationRow(d, ''),
      image: `${UNSPLASH_ORIGIN}/stand-in`,
      best_time: d.best_time || 'stand-in'
    });
    if (!checked.success) problems.push(`destinations/${d.id}: ${JSON.stringify(fieldErrors(checked.error))}`);
  }
  for (const a of file.attractions) {
    if (ids.attractions.has(a.id)) problems.push(`attractions/${a.id}: listed twice`);
    ids.attractions.add(a.id);
    const checked = schemaForTable('attractions', 'create').safeParse(attractionRow(a, null));
    if (!checked.success) problems.push(`attractions/${a.id}: ${JSON.stringify(fieldErrors(checked.error))}`);
  }
  if (problems.length > 0) throw new Error(`The places file has problems:\n  ${problems.join('\n  ')}`);
  return file;
}

/** A destination's columns. Lists the file doesn't fill stay empty, for an admin. */
function destinationRow(d: ImportDestination, image: string): Record<string, unknown> {
  return {
    id: d.id,
    name: d.name,
    region: d.region,
    province: d.province,
    latitude: d.latitude,
    longitude: d.longitude,
    category: d.category,
    short_description: d.short_description,
    long_description: d.long_description,
    image,
    gallery: [],
    best_time: d.best_time,
    best_months: d.best_months,
    elevation: null,
    travel_time_from_airport: null,
    // Not shown anywhere: ratings come back only with real reviews (no-ratings).
    rating: 0,
    featured: false,
    experiences: [],
    highlights: [],
    ideal_for: [],
    published: false
  };
}

function attractionRow(a: ImportAttraction, image: string | null): Record<string, unknown> {
  return {
    id: a.id,
    destination_id: a.destination_id,
    name: a.name,
    category: a.category,
    short_description: a.short_description,
    latitude: a.latitude,
    longitude: a.longitude,
    image,
    best_months: a.best_months,
    published: false
  };
}

/** What a row's content is, for "unchanged since the last run": stable key order. */
function contentHash(item: ImportDestination | ImportAttraction): string {
  const stable = (value: unknown): unknown =>
    Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable((value as Record<string, unknown>)[k])]))
      : value;
  return createHash('sha256').update(JSON.stringify(stable(item))).digest('hex');
}

/* ------------------------------------------------------------- the import */

export type Table = 'destinations' | 'attractions';

export interface RowOutcome {
  table: Table;
  id: string;
  action: 'create' | 'update' | 'unchanged' | 'skip' | 'failed';
  reason?: string;
  photo?: 'upload' | 'reuse' | 'none' | 'skipped';
}

export interface PlacesImportOptions extends ImportOptions {
  dryRun?: boolean;
  /** R2. Needed unless `dryRun` or `skipPhotos`. */
  media?: MediaConfig | null;
  /** Rows without photos (a local database with no R2): `image` stays empty. */
  skipPhotos?: boolean;
}

const SKIP = {
  deleted: 'deleted in the admin after an earlier import: not created again',
  notOurs: 'already exists, and this import did not create it (the seed or an admin): left alone',
  edited: 'edited in the admin since it was imported: left alone',
  noParent: (id: string) => `its destination "${id}" isn't in the database`
};

interface Existing {
  exists: boolean;
  recorded: boolean;
  untouched: boolean;
  hash: string | null;
}

/** The row as it stands, and whether this import made it and nobody has saved it since. */
async function current(db: Queryable, table: Table, id: string, lock: boolean): Promise<Existing> {
  // The row first, locked when writing (a lock can't reach across an outer join).
  const row = await db.query(`select 1 from public.${table} where id = $1${lock ? ' for update' : ''}`, [id]);
  // Compared in SQL: updated_at has microseconds, which a JS Date would drop.
  const { rows } = await db.query<{ untouched: boolean | null; hash: string }>(
    `select ci.row_updated_at = t.updated_at as untouched, ci.content_hash as hash
       from public.content_imports ci
       left join public.${table} t on t.id = ci.row_id
      where ci.table_name = $1 and ci.row_id = $2`,
    [table, id]
  );
  return { exists: (row.rowCount ?? 0) > 0, recorded: rows.length > 0, untouched: rows[0]?.untouched === true, hash: rows[0]?.hash ?? null };
}

function decide(existing: Existing, hash: string): Pick<RowOutcome, 'action' | 'reason'> {
  if (!existing.exists) return existing.recorded ? { action: 'skip', reason: SKIP.deleted } : { action: 'create' };
  if (!existing.recorded) return { action: 'skip', reason: SKIP.notOurs };
  if (!existing.untouched) return { action: 'skip', reason: SKIP.edited };
  return existing.hash === hash ? { action: 'unchanged' } : { action: 'update' };
}

/** A copy already in R2 of this Commons photo, found by its credit's source link. */
async function copiedPhoto(db: Queryable, source: string): Promise<string | null> {
  const { rows } = await db.query<{ url: string }>(
    `select ic.url from public.image_credits ic join public.media m on m.url = ic.url
      where ic.source_url = $1 order by ic.created_at limit 1`,
    [source]
  );
  return rows[0]?.url ?? null;
}

const insertSql = (table: Table, columns: string[]) =>
  `insert into public.${table} (${columns.map((c) => `"${c}"`).join(', ')}, sort_order)
   values (${columns.map((_, i) => `$${i + 1}`).join(', ')}, (select coalesce(max(sort_order) + 1, 0) from public.${table}))`;

const updateSql = (table: Table, columns: string[]) =>
  `update public.${table} set ${columns.map((c, i) => `"${c}" = $${i + 1}`).join(', ')} where id = $${columns.length + 1}`;

export async function importPlaces(db: Queryable, file: PlacesFile, options: PlacesImportOptions = {}): Promise<RowOutcome[]> {
  const log = options.log ?? (() => undefined);
  const media = options.media ?? null;
  const usePhotos = !options.skipPhotos;
  if (!options.dryRun && usePhotos && !media) {
    throw new Error('R2 is not configured: set all five R2_* variables, as on the Railway service, or pass --skip-photos.');
  }
  const downloader = createDownloader({ ...options, log });
  const outcomes: RowOutcome[] = [];
  const planned = new Set<string>(file.destinations.map((d) => d.id));

  const items: { table: Table; item: ImportDestination | ImportAttraction }[] = [
    ...file.destinations.map((item) => ({ table: 'destinations' as const, item })),
    ...file.attractions.map((item) => ({ table: 'attractions' as const, item }))
  ];

  for (const { table, item } of items) {
    const hash = contentHash(item);
    const label = `${table}/${item.id}`;

    if (table === 'attractions') {
      const parent = (item as ImportAttraction).destination_id;
      const { rowCount } = await db.query('select 1 from public.destinations where id = $1', [parent]);
      // In a dry run, a destination this file creates counts as there.
      if (!rowCount && !(options.dryRun && planned.has(parent))) {
        outcomes.push({ table, id: item.id, action: 'skip', reason: SKIP.noParent(parent) });
        log(`${label}: skip, ${SKIP.noParent(parent)}`);
        continue;
      }
    }

    if (options.dryRun) {
      const plan = decide(await current(db, table, item.id, false), hash);
      let photo: RowOutcome['photo'] = 'none';
      if (plan.action === 'create' || plan.action === 'update') {
        photo = !item.photo ? 'none' : !usePhotos ? 'skipped' : (await copiedPhoto(db, item.photo.source)) ? 'reuse' : 'upload';
      }
      outcomes.push({ table, id: item.id, ...plan, ...(plan.action === 'create' || plan.action === 'update' ? { photo } : {}) });
      log(`${label}: ${plan.action}${plan.reason ? `, ${plan.reason}` : ''}${plan.action === 'create' || plan.action === 'update' ? ` (photo: ${photo})` : ''}`);
      continue;
    }

    // A first look without a lock: nothing to download for a row that will be skipped.
    const first = decide(await current(db, table, item.id, false), hash);
    if (first.action !== 'create' && first.action !== 'update') {
      outcomes.push({ table, id: item.id, ...first });
      log(`${label}: ${first.action}${first.reason ? `, ${first.reason}` : ''}`);
      continue;
    }

    // The photo, before the transaction: downloading can take a while.
    let image: string | null = null;
    let uploaded: { key: string; url: string; type: string; bytes: number } | null = null;
    let photo: RowOutcome['photo'] = 'none';
    if (item.photo && usePhotos) {
      const copy = await copiedPhoto(db, item.photo.source);
      if (copy) {
        image = copy;
        photo = 'reuse';
      } else {
        const got = await downloader.get(item.photo.download);
        const sniffed = 'bytes' in got ? sniffImage(got.bytes.subarray(0, SNIFF_BYTES)) : null;
        if (!('bytes' in got) || sniffed?.kind !== 'image') {
          const reason = 'bytes' in got ? 'not a JPEG, PNG, WebP or AVIF image' : got.reason;
          outcomes.push({ table, id: item.id, action: 'failed', reason: `photo: ${reason}` });
          log(`${label}: failed, photo: ${reason}`);
          continue;
        }
        const key = newObjectKey(table, sniffed.type);
        try {
          await media!.store.put(key, got.bytes, sniffed.type);
        } catch (error) {
          outcomes.push({ table, id: item.id, action: 'failed', reason: `R2 upload failed: ${(error as Error).message}` });
          log(`${label}: failed, R2 upload failed: ${(error as Error).message}`);
          continue;
        }
        uploaded = { key, url: objectUrl(media!, key), type: sniffed.type, bytes: got.bytes.length };
        image = uploaded.url;
        photo = 'upload';
      }
    } else if (item.photo) {
      photo = 'skipped';
    }

    try {
      await db.query('begin');
      // Again, under the row's lock: an admin may have saved it while the photo came.
      const decided = decide(await current(db, table, item.id, true), hash);
      if (decided.action !== 'create' && decided.action !== 'update') {
        await db.query('rollback');
        if (uploaded) await media!.store.delete(uploaded.key).catch(() => undefined);
        outcomes.push({ table, id: item.id, ...decided });
        log(`${label}: ${decided.action}${decided.reason ? `, ${decided.reason}` : ''}`);
        continue;
      }
      if (uploaded) {
        await db.query(`insert into public.media (key, url, content_type, bytes, uploaded_by) values ($1, $2, $3, $4, null)`, [uploaded.key, uploaded.url, uploaded.type, uploaded.bytes]);
      }
      if (image && item.photo) {
        await db.query(
          `insert into public.image_credits (url, author, license, license_url, source_url) values ($1, $2, $3, $4, $5)
           on conflict (url) do nothing`,
          [image, item.photo.author, item.photo.license, item.photo.license_url, item.photo.source]
        );
      }

      const row = table === 'destinations' ? destinationRow(item as ImportDestination, image ?? '') : attractionRow(item as ImportAttraction, image);
      if (decided.action === 'create') {
        const columns = Object.keys(row);
        await db.query(insertSql(table, columns), columns.map((c) => row[c]));
      } else {
        // Never `published`, `sort_order`, or the slug.
        const columns = Object.keys(row).filter((c) => c !== 'published' && c !== 'id');
        await db.query(updateSql(table, columns), [...columns.map((c) => row[c]), item.id]);
      }
      // The row's updated_at as the database has it (to the microsecond), never via JS.
      await db.query(
        `insert into public.content_imports (table_name, row_id, content_hash, row_updated_at)
         select $1, id, $3, updated_at from public.${table} where id = $2
         on conflict (table_name, row_id) do update
           set content_hash = excluded.content_hash, row_updated_at = excluded.row_updated_at, imported_at = now()`,
        [table, item.id, hash]
      );
      await db.query('commit');
      outcomes.push({ table, id: item.id, action: decided.action, photo });
      log(`${label}: ${decided.action === 'create' ? 'created (draft)' : 'updated'} (photo: ${photo})`);
    } catch (error) {
      await db.query('rollback').catch(() => undefined);
      if (uploaded) await media!.store.delete(uploaded.key).catch(() => undefined);
      outcomes.push({ table, id: item.id, action: 'failed', reason: (error as Error).message });
      log(`${label}: failed, ${(error as Error).message}`);
    }
  }
  return outcomes;
}
