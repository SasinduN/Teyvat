/**
 * Regression guard for the promise that the public site stays pixel-identical.
 *
 *   npm run verify:roundtrip
 *
 * Takes the original approved content from `src/data/*.ts`, pushes it through
 * the same shape transformation the seed performs (TS object -> database row),
 * then back through the runtime mappers the app uses (row -> domain object),
 * and asserts the result is deep-equal to what the components used to import.
 *
 * If this passes, every value the approved components render is unchanged —
 * including ordering, optional-field presence, and the article date strings.
 */
import { DESTINATIONS } from '../src/data/destinations';
import { EXPERIENCE_CATEGORIES, FEATURED_EXPERIENCES } from '../src/data/experiences';
import { HIDDEN_GEMS } from '../src/data/hiddenGems';
import { ARTICLES } from '../src/data/journal';
import { PHOTO_STORIES } from '../src/data/photoStories';
import { TOURS } from '../src/data/tours';

import {
  toArticle,
  toDestination,
  toExperienceCategory,
  toExperienceItem,
  toHiddenGem,
  toPhotoStory,
  toTourPackage
} from '../src/lib/mappers';
import type {
  ArticleRow,
  DestinationRow,
  ExperienceCategoryRow,
  FeaturedExperienceRow,
  HiddenGemRow,
  PhotoStoryRow,
  TourRow
} from '../src/lib/database.types';

/* --------------------------------------------------- comparison utilities */

/** Stable JSON with sorted keys; `undefined` and absent keys compare equal. */
function canonical(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (v === undefined) return undefined;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(v as object).sort()) {
        const inner = walk((v as Record<string, unknown>)[key]);
        if (inner !== undefined) out[key] = inner;
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

let failures = 0;

function compare<TSource, TResult>(
  label: string,
  originals: readonly TSource[],
  roundTripped: readonly TResult[],
  /**
   * Applied to the original before comparing, for the one place the database
   * is necessarily stricter than the hand-written literals. Documented at each
   * call site — never use this to paper over a real difference.
   */
  normalise: (value: TSource) => unknown = (v) => v
): void {
  if (originals.length !== roundTripped.length) {
    console.error(`FAIL ${label}: ${originals.length} in, ${roundTripped.length} out`);
    failures += 1;
    return;
  }

  let mismatches = 0;
  originals.forEach((original, i) => {
    const before = canonical(normalise(original));
    const after = canonical(roundTripped[i]);
    if (before !== after) {
      mismatches += 1;
      if (mismatches <= 2) {
        console.error(`FAIL ${label}[${i}]`);
        console.error(`  original : ${before.slice(0, 400)}`);
        console.error(`  roundtrip: ${after.slice(0, 400)}`);
      }
    }
  });

  if (mismatches > 0) {
    failures += 1;
    console.error(`FAIL ${label}: ${mismatches}/${originals.length} record(s) differ\n`);
  } else {
    console.log(`  ok  ${label.padEnd(22)} ${originals.length} record(s)`);
  }
}

/* ------------------------------ TS object -> the row Postgres would return */
/* `undefined` becomes NULL, omitted arrays become '{}', dates become ISO.    */

const nullable = <T>(v: T | undefined): T | null => (v === undefined ? null : v);
const list = (v: readonly string[] | undefined): string[] => (v ? [...v] : []);

/** Columns the app never reads but every row carries. */
const meta = (i: number) => ({
  sort_order: i,
  published: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
});

const destinationRows: DestinationRow[] = DESTINATIONS.map((d, i) => ({
  ...meta(i),
  id: d.id,
  name: d.name,
  latitude: d.latitude,
  longitude: d.longitude,
  region: d.region,
  province: d.province,
  category: d.category.filter((c): c is DestinationRow['category'][number] => c !== 'All'),
  short_description: d.shortDescription,
  long_description: d.longDescription,
  image: d.image,
  gallery: list(d.gallery),
  best_time: d.bestTime,
  experiences: list(d.experiences),
  highlights: list(d.highlights),
  rating: d.rating,
  elevation: nullable(d.elevation),
  ideal_for: list(d.idealFor),
  featured: d.featured ?? false
}));

const experienceCategoryRows: ExperienceCategoryRow[] = EXPERIENCE_CATEGORIES.map((e, i) => ({
  ...meta(i),
  id: e.id,
  title: e.title,
  category: e.category,
  subtitle: e.subtitle,
  image: e.image,
  description: e.description
}));

const featuredExperienceRows: FeaturedExperienceRow[] = FEATURED_EXPERIENCES.map((e, i) => ({
  ...meta(i),
  id: e.id,
  title: e.title,
  subtitle: nullable(e.subtitle),
  location: e.location,
  duration: e.duration,
  category: e.category as FeaturedExperienceRow['category'],
  image: e.image,
  description: e.description,
  highlights: list(e.highlights),
  recommended_time: nullable(e.recommendedTime),
  rating: e.rating
}));

const tourRows: TourRow[] = TOURS.map((t, i) => ({
  ...meta(i),
  id: t.id,
  title: t.title,
  subtitle: t.subtitle,
  days: t.days,
  route: list(t.route),
  short_desc: t.shortDesc,
  full_desc: t.fullDesc,
  image: t.image,
  highlights: list(t.highlights),
  included_places: list(t.includedPlaces),
  price_from: t.priceFrom,
  category: t.category,
  // jsonb round-trips through JSON, so mirror that here.
  itinerary: JSON.parse(JSON.stringify(t.itinerary))
}));

const articleRows: ArticleRow[] = ARTICLES.map((a, i) => ({
  ...meta(i),
  id: a.id,
  title: a.title,
  category: a.category,
  published_at: new Date(`${a.date} UTC`).toISOString().slice(0, 10),
  read_time: a.readTime,
  image: a.image,
  snippet: a.snippet,
  author_name: a.author.name,
  author_avatar: a.author.avatar,
  author_role: a.author.role,
  content: list(a.content)
}));

const hiddenGemRows: HiddenGemRow[] = HIDDEN_GEMS.map((g, i) => ({
  ...meta(i),
  id: g.id,
  name: g.name,
  region: g.region,
  image: g.image,
  description: g.description,
  why_visit: g.whyVisit,
  tag: g.tag
}));

const photoStoryRows: PhotoStoryRow[] = PHOTO_STORIES.map((p, i) => ({
  ...meta(i),
  id: p.id,
  title: p.title,
  location: p.location,
  category: p.category,
  image: p.image,
  caption: p.caption,
  aspect: nullable(p.aspect)
}));

/* -------------------------------------------------------------------- run */

console.log('Verifying data -> database row -> mapper round-trip\n');

// `featured` is a NOT NULL boolean column, so a destination that simply
// omitted the flag comes back as `false` rather than absent. Both are falsy,
// and no component reads the field, so rendering is unaffected.
compare('destinations', DESTINATIONS, destinationRows.map(toDestination), (d) => ({
  ...d,
  featured: d.featured ?? false
}));
compare('experience types', EXPERIENCE_CATEGORIES, experienceCategoryRows.map(toExperienceCategory));
compare('featured experiences', FEATURED_EXPERIENCES, featuredExperienceRows.map(toExperienceItem));
compare('tours', TOURS, tourRows.map(toTourPackage));
compare('articles', ARTICLES, articleRows.map(toArticle));
compare('hidden gems', HIDDEN_GEMS, hiddenGemRows.map(toHiddenGem));
compare('photo stories', PHOTO_STORIES, photoStoryRows.map(toPhotoStory));

if (failures > 0) {
  console.error(`\n${failures} collection(s) did not round-trip cleanly.`);
  process.exit(1);
}

console.log('\nAll collections round-trip identically. The public site renders unchanged.');
