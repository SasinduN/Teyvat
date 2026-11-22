/**
 * The tours half of `npm run content:import` (0031, docs/plans/new-tours.md): the drafts
 * in `scripts/content/tours.json`, with the same rules as the places
 * (`content-import.ts`):
 *
 *   - created unpublished, with no price ("Price on request");
 *   - updated only while it is a tour this import created and nobody has saved since
 *     (`content_imports`); a tour it didn't create, or one deleted in the admin, is left alone;
 *   - each tour, its stops and its categories are one transaction;
 *   - a tour whose destinations or categories aren't in the database is skipped, saying which.
 *
 * Run after the places, so a destination they create (Kitulgala) is there for its tour.
 * The cover is a destination's photo: its verified photo in R2 when `media` has it, else
 * the destination's stored cover. No photo is downloaded.
 */
import type { PoolClient } from 'pg';
import { z } from 'zod';

import { fieldErrors, schemaForTable, SLUG_PATTERN, TOUR_CATEGORY_OPTIONS } from '../../shared/content-schema';
import { UNSPLASH_ORIGIN } from '../../shared/image-hosts';
import { PRIMARY_WIDTH } from '../../shared/photo-assets';
import { contentHash, current, decide, months, type Queryable, type RowOutcome } from './content-import';
import { replaceCategoryLinks } from './tour-categories';
import { replaceStops } from './tour-stops';

const tourSchema = z.object({
  id: z.string().regex(SLUG_PATTERN),
  title: z.string(),
  subtitle: z.string(),
  days: z.number().int().min(1).max(60),
  /** tour_categories ids, in order: the first is the card's label. */
  categories: z.array(z.string().regex(SLUG_PATTERN)).min(1),
  /** The old `tours.category` (0001): NOT NULL, shown nowhere since 0030. */
  old_category: z.enum(TOUR_CATEGORY_OPTIONS),
  /** The destination whose photo is the cover. */
  cover: z.string(),
  best_months: months,
  /** Destination ids, in order: the route. */
  stops: z.array(z.string()).min(1),
  short_desc: z.string(),
  full_desc: z.string(),
  highlights: z.array(z.string()),
  itinerary: z.array(z.object({ title: z.string(), description: z.string(), location: z.string() })).min(1)
});

export type ImportTour = z.output<typeof tourSchema>;
export interface ToursFile {
  tours: ImportTour[];
}

/** The tour's columns, as the admin's form has them. The cover comes from the database. */
function tourRow(t: ImportTour, image: string, includedPlaces: string[]): Record<string, unknown> {
  return {
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
    days: t.days,
    // "Price on request" until the owner confirms one.
    price_from: null,
    category: t.old_category,
    image,
    short_desc: t.short_desc,
    full_desc: t.full_desc,
    highlights: t.highlights,
    included_places: includedPlaces,
    itinerary: t.itinerary.map((day, i) => ({ day: i + 1, ...day })),
    best_months: t.best_months,
    published: false
  };
}

/**
 * The file, checked: its shape, a day in the itinerary for every day of the tour, and every
 * tour as the admin's form would check it (with a stand-in cover, which comes from the
 * database), so nothing it writes is a tour the admin then can't save.
 */
export function parseToursFile(input: unknown): ToursFile {
  const file = z.object({ tours: z.array(tourSchema) }).parse(input);
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const t of file.tours) {
    if (ids.has(t.id)) problems.push(`tours/${t.id}: listed twice`);
    ids.add(t.id);
    if (t.itinerary.length !== t.days) problems.push(`tours/${t.id}: ${t.days} days, but ${t.itinerary.length} in the itinerary`);
    const checked = schemaForTable('tours', 'create').safeParse({
      ...tourRow(t, `${UNSPLASH_ORIGIN}/stand-in`, []),
      stops: t.stops.map((id) => ({ kind: 'destination', destination_id: id, name: null })),
      category_ids: t.categories
    });
    if (!checked.success) problems.push(`tours/${t.id}: ${JSON.stringify(fieldErrors(checked.error))}`);
  }
  if (problems.length > 0) throw new Error(`The tours file has problems:\n  ${problems.join('\n  ')}`);
  return file;
}

export interface ToursImportOptions {
  dryRun?: boolean;
  /** Destinations the places file creates in this run: in a dry run, they count as there. */
  plannedDestinations?: Iterable<string>;
  log?: (line: string) => void;
}

/** The cover: the destination's verified photo in R2 (its 1280 px file), else its stored cover. */
async function coverOf(db: Queryable, destinationId: string): Promise<string> {
  const { rows } = await db.query<{ url: string | null }>(
    `select coalesce(
       (select m.url from public.media m where m.photo_key = $1 and m.width = $2 order by m.url limit 1),
       (select d.image from public.destinations d where d.id = $1)
     ) as url`,
    [destinationId, PRIMARY_WIDTH]
  );
  return rows[0]?.url ?? '';
}

/** What a tour needs that isn't there: its destinations (stops and cover) and its categories. */
async function missingFor(db: Queryable, t: ImportTour, planned: Set<string>): Promise<string[]> {
  const destinations = [...new Set([...t.stops, t.cover])];
  const { rows: d } = await db.query<{ id: string }>('select id from public.destinations where id = any($1::text[])', [destinations]);
  const { rows: c } = await db.query<{ id: string }>('select id from public.tour_categories where id = any($1::text[])', [t.categories]);
  const present = new Set(d.map((r) => r.id));
  const categories = new Set(c.map((r) => r.id));
  return [
    ...destinations.filter((id) => !present.has(id) && !planned.has(id)).map((id) => `destination "${id}"`),
    ...t.categories.filter((id) => !categories.has(id)).map((id) => `category "${id}"`)
  ];
}

export async function importTours(db: Queryable, file: ToursFile, options: ToursImportOptions = {}): Promise<RowOutcome[]> {
  const log = options.log ?? (() => undefined);
  const planned = new Set(options.dryRun ? (options.plannedDestinations ?? []) : []);
  const outcomes: RowOutcome[] = [];
  const done = (outcome: RowOutcome) => {
    outcomes.push(outcome);
    const action = outcome.action === 'create' && !options.dryRun ? 'created (draft)' : outcome.action;
    log(`tours/${outcome.id}: ${action}${outcome.reason ? `, ${outcome.reason}` : ''}`);
  };

  for (const t of file.tours) {
    const hash = contentHash(t);
    const missing = await missingFor(db, t, planned);
    if (missing.length > 0) {
      done({ table: 'tours', id: t.id, action: 'skip', reason: `${missing.join(', ')} isn't in the database` });
      continue;
    }
    const first = decide(await current(db, 'tours', t.id, false), hash);
    if (options.dryRun || (first.action !== 'create' && first.action !== 'update')) {
      done({ table: 'tours', id: t.id, ...first });
      continue;
    }

    try {
      await db.query('begin');
      // Again, under the row's lock: an admin may have saved it since the first look.
      const decided = decide(await current(db, 'tours', t.id, true), hash);
      if (decided.action !== 'create' && decided.action !== 'update') {
        await db.query('rollback');
        done({ table: 'tours', id: t.id, ...decided });
        continue;
      }
      const image = await coverOf(db, t.cover);
      if (!image) throw new Error(`its cover, "${t.cover}", has no photo`);
      const { rows: names } = await db.query<{ id: string; name: string }>(
        'select id, name from public.destinations where id = any($1::text[])',
        [t.stops]
      );
      const row = tourRow(t, image, t.stops.map((id) => names.find((n) => n.id === id)?.name ?? id));
      const value = (column: string) => (column === 'itinerary' ? JSON.stringify(row[column]) : row[column]);
      const placeholder = (column: string, i: number) => (column === 'itinerary' ? `$${i}::jsonb` : `$${i}`);
      if (decided.action === 'create') {
        const columns = Object.keys(row);
        await db.query(
          `insert into public.tours (${columns.map((c) => `"${c}"`).join(', ')}, sort_order)
           values (${columns.map((c, i) => placeholder(c, i + 1)).join(', ')}, (select coalesce(max(sort_order) + 1, 0) from public.tours))`,
          columns.map(value)
        );
      } else {
        // Never `published`, `sort_order`, or the slug.
        const columns = Object.keys(row).filter((c) => c !== 'published' && c !== 'id');
        await db.query(
          `update public.tours set ${columns.map((c, i) => `"${c}" = ${placeholder(c, i + 1)}`).join(', ')} where id = $${columns.length + 1}`,
          [...columns.map(value), t.id]
        );
      }
      // Both take a PoolClient for its query method only; the CLI's Client has the same one.
      const client = db as PoolClient;
      await replaceStops(client, t.id, t.stops.map((id) => ({ kind: 'destination' as const, destination_id: id, name: null })));
      await replaceCategoryLinks(client, t.id, t.categories);
      // The tour's updated_at as the database has it (to the microsecond), never via JS.
      await db.query(
        `insert into public.content_imports (table_name, row_id, content_hash, row_updated_at)
         select 'tours', id, $2, updated_at from public.tours where id = $1
         on conflict (table_name, row_id) do update
           set content_hash = excluded.content_hash, row_updated_at = excluded.row_updated_at, imported_at = now()`,
        [t.id, hash]
      );
      await db.query('commit');
      done({ table: 'tours', id: t.id, action: decided.action });
    } catch (error) {
      await db.query('rollback').catch(() => undefined);
      done({ table: 'tours', id: t.id, action: 'failed', reason: (error as Error).message });
    }
  }
  return outcomes;
}
