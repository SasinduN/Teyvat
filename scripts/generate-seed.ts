/**
 * Generates `db/migrations/0002_seed.sql` from the original hardcoded
 * data files in `scripts/fixtures/`.
 *
 *   npm run seed:generate
 *
 * The generated SQL is idempotent (`on conflict (id) do update`), so it can be
 * re-run to reset the demo content to its approved baseline.
 *
 * `sort_order` is the index of the record in its original array, which is what
 * preserves the exact on-page ordering of the approved design.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DESTINATIONS } from './fixtures/destinations';
import { EXPERIENCE_CATEGORIES, FEATURED_EXPERIENCES } from './fixtures/experiences';
import { HIDDEN_GEMS } from './fixtures/hiddenGems';
import { ARTICLES } from './fixtures/journal';
import { PHOTO_STORIES } from './fixtures/photoStories';
import { TOURS } from './fixtures/tours';
import { HERO_SLIDES } from './fixtures/heroSlides';
import { PILLARS } from './fixtures/pillars';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../db/migrations/0002_seed.sql');

/* ------------------------------------------------------------------ helpers */

/** Postgres string literal. */
const s = (v: string): string => `'${v.replace(/'/g, "''")}'`;

/** Nullable string literal. */
const sn = (v: string | null | undefined): string =>
  v === null || v === undefined ? 'null' : s(v);

/** text[] literal. */
const arr = (v: readonly string[] | undefined): string =>
  !v || v.length === 0 ? `'{}'::text[]` : `array[${v.map(s).join(', ')}]::text[]`;

/** jsonb literal. */
const json = (v: unknown): string => `${s(JSON.stringify(v))}::jsonb`;

const num = (v: number): string => String(v);
const bool = (v: boolean | undefined): string => (v ? 'true' : 'false');

/** "February 12, 2026" -> "2026-02-12" (kept UTC so no timezone drift). */
const toIsoDate = (label: string): string => {
  const parsed = Date.parse(`${label} UTC`);
  if (Number.isNaN(parsed)) {
    throw new Error(`Unparseable article date: "${label}"`);
  }
  return new Date(parsed).toISOString().slice(0, 10);
};

/**
 * Builds an idempotent multi-row upsert.
 * Every column except `id` and `created_at` is refreshed on conflict.
 */
function upsert(
  table: string,
  columns: readonly string[],
  rows: readonly string[][]
): string {
  const updates = columns
    .filter((c) => c !== 'id')
    .map((c) => `  ${c} = excluded.${c}`)
    .join(',\n');

  return [
    `-- ${rows.length} row(s) -> public.${table}`,
    `insert into public.${table} (${columns.join(', ')}) values`,
    rows.map((r) => `  (${r.join(', ')})`).join(',\n'),
    `on conflict (id) do update set`,
    updates + ',',
    `  updated_at = now();`,
    ''
  ].join('\n');
}

/* -------------------------------------------------------------- generators */

const destinationsSql = upsert(
  'destinations',
  [
    'id', 'name', 'latitude', 'longitude', 'region', 'province', 'category',
    'short_description', 'long_description', 'image', 'gallery', 'best_time',
    'experiences', 'highlights', 'rating', 'elevation', 'ideal_for', 'featured',
    'sort_order', 'published'
  ],
  DESTINATIONS.map((d, i) => [
    s(d.id), s(d.name), num(d.latitude), num(d.longitude), s(d.region),
    s(d.province), arr(d.category), s(d.shortDescription), s(d.longDescription),
    s(d.image), arr(d.gallery), s(d.bestTime), arr(d.experiences),
    arr(d.highlights), num(d.rating), sn(d.elevation), arr(d.idealFor),
    bool(d.featured), num(i), 'true'
  ])
);

const experienceCategoriesSql = upsert(
  'experience_categories',
  ['id', 'title', 'category', 'subtitle', 'image', 'description', 'sort_order', 'published'],
  EXPERIENCE_CATEGORIES.map((e, i) => [
    s(e.id), s(e.title), s(e.category), s(e.subtitle), s(e.image),
    s(e.description), num(i), 'true'
  ])
);

const featuredExperiencesSql = upsert(
  'featured_experiences',
  [
    'id', 'title', 'subtitle', 'location', 'duration', 'category', 'image',
    'description', 'highlights', 'recommended_time', 'rating', 'sort_order', 'published'
  ],
  FEATURED_EXPERIENCES.map((e, i) => [
    s(e.id), s(e.title), sn(e.subtitle), s(e.location), s(e.duration),
    s(e.category), s(e.image), s(e.description), arr(e.highlights),
    sn(e.recommendedTime), num(e.rating), num(i), 'true'
  ])
);

const toursSql = upsert(
  'tours',
  [
    'id', 'title', 'subtitle', 'days', 'route', 'short_desc', 'full_desc',
    'image', 'highlights', 'included_places', 'price_from', 'category',
    'itinerary', 'sort_order', 'published'
  ],
  TOURS.map((t, i) => [
    s(t.id), s(t.title), s(t.subtitle), num(t.days), arr(t.route),
    s(t.shortDesc), s(t.fullDesc), s(t.image), arr(t.highlights),
    arr(t.includedPlaces), num(t.priceFrom), s(t.category), json(t.itinerary),
    num(i), 'true'
  ])
);

const articlesSql = upsert(
  'articles',
  [
    'id', 'title', 'category', 'published_at', 'read_time', 'image', 'snippet',
    'author_name', 'author_avatar', 'author_role', 'content', 'sort_order', 'published'
  ],
  ARTICLES.map((a, i) => [
    s(a.id), s(a.title), s(a.category), s(toIsoDate(a.date)), s(a.readTime),
    s(a.image), s(a.snippet), s(a.author.name), s(a.author.avatar),
    s(a.author.role), arr(a.content), num(i), 'true'
  ])
);

const hiddenGemsSql = upsert(
  'hidden_gems',
  ['id', 'name', 'region', 'image', 'description', 'why_visit', 'tag', 'sort_order', 'published'],
  HIDDEN_GEMS.map((g, i) => [
    s(g.id), s(g.name), s(g.region), s(g.image), s(g.description),
    s(g.whyVisit), s(g.tag), num(i), 'true'
  ])
);

const photoStoriesSql = upsert(
  'photo_stories',
  ['id', 'title', 'location', 'category', 'image', 'caption', 'aspect', 'sort_order', 'published'],
  PHOTO_STORIES.map((p, i) => [
    s(p.id), s(p.title), s(p.location), s(p.category), s(p.image), s(p.caption),
    sn(p.aspect), num(i), 'true'
  ])
);

const heroSlidesSql = upsert(
  'hero_slides',
  ['id', 'image', 'title', 'caption', 'sort_order', 'published'],
  HERO_SLIDES.map((h, i) => [
    s(h.id), s(h.url), s(h.title), s(h.caption), num(i), 'true'
  ])
);

const pillarsSql = upsert(
  'pillars',
  ['id', 'icon', 'title', 'description', 'sort_order', 'published'],
  PILLARS.map((p, i) => [
    s(p.id), s(p.icon), s(p.title), s(p.desc), num(i), 'true'
  ])
);

/* ------------------------------------------------------------------- output */

const sql = `-- =============================================================================
-- Teyvat / Travel Eye Sri Lanka — content seed
-- =============================================================================
-- GENERATED FILE — do not edit by hand.
-- Regenerate with:  npm run seed:generate
-- Source of truth:  scripts/fixtures/*.ts (the original approved demo content)
--
-- Safe to re-run: every statement is an upsert keyed on the slug id, so this
-- restores the approved baseline content without duplicating rows.
-- =============================================================================

begin;

${destinationsSql}
${experienceCategoriesSql}
${featuredExperiencesSql}
${toursSql}
${articlesSql}
${hiddenGemsSql}
${photoStoriesSql}
${heroSlidesSql}
${pillarsSql}
commit;
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, sql, 'utf8');

console.log(`Wrote ${OUT}`);
console.log(
  `  destinations ${DESTINATIONS.length}` +
    `  experience_categories ${EXPERIENCE_CATEGORIES.length}` +
    `  featured_experiences ${FEATURED_EXPERIENCES.length}` +
    `  tours ${TOURS.length}` +
    `  articles ${ARTICLES.length}` +
    `  hidden_gems ${HIDDEN_GEMS.length}` +
    `  photo_stories ${PHOTO_STORIES.length}` +
    `  hero_slides ${HERO_SLIDES.length}` +
    `  pillars ${PILLARS.length}`
);
