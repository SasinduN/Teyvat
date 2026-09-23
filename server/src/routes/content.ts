/**
 * `GET /api/content` — the public marketing site's entire content payload.
 *
 * Unauthenticated and read-only. This is the one route a traveller's browser
 * hits, so it is also the route where the two guarantees RLS used to enforce
 * now live: only published rows, in the approved order.
 */
import { Router } from 'express';
import type { QueryResultRow } from 'pg';

import type { SiteContentPayload } from '../../../shared/api';
import type {
  ArticleRow,
  DestinationRow,
  ExperienceCategoryRow,
  FeaturedExperienceRow,
  HiddenGemRow,
  PhotoStoryRow,
  TourRow
} from '../../../shared/database.types';
import { pool } from '../db';
import { asyncRoute } from '../http';

/**
 * Table names are interpolated into SQL, so they come only from this frozen
 * list — never from a request. Postgres has no parameter form for an
 * identifier, and quoting one by hand is how injection bugs get written.
 */
const CONTENT_TABLES = [
  'destinations',
  'experience_categories',
  'featured_experiences',
  'tours',
  'articles',
  'hidden_gems',
  'photo_stories'
] as const;

type ContentTable = (typeof CONTENT_TABLES)[number];

/**
 * `published = true` reproduces the dropped `public read published` policy, and
 * the ordering is what preserves the approved page order: `sort_order` holds
 * each record's index in the original hardcoded array, with `id` as a stable
 * tiebreaker.
 *
 * Note this returns published rows even to a signed-in admin. That is
 * deliberate and matches the previous behaviour — the public page must not
 * change shape just because someone happens to be logged in.
 */
async function selectPublished<T extends QueryResultRow>(table: ContentTable): Promise<T[]> {
  const { rows } = await pool.query<T>(
    `select * from public.${table} where published = true order by sort_order asc, id asc`
  );
  return rows;
}

export const contentRouter = Router();

contentRouter.get(
  '/content',
  asyncRoute(async (_req, res) => {
    // One round trip per table, all in flight together. Seven small reads in
    // parallel beat one join that would have to be unpicked client-side.
    const [
      destinations,
      experienceCategories,
      featuredExperiences,
      tours,
      articles,
      hiddenGems,
      photoStories
    ] = await Promise.all([
      selectPublished<DestinationRow>('destinations'),
      selectPublished<ExperienceCategoryRow>('experience_categories'),
      selectPublished<FeaturedExperienceRow>('featured_experiences'),
      selectPublished<TourRow>('tours'),
      selectPublished<ArticleRow>('articles'),
      selectPublished<HiddenGemRow>('hidden_gems'),
      selectPublished<PhotoStoryRow>('photo_stories')
    ]);

    const payload: SiteContentPayload = {
      destinations,
      experienceCategories,
      featuredExperiences,
      tours,
      articles,
      hiddenGems,
      photoStories
    };

    // No caching headers on purpose. An admin save must show on the public site
    // without a reload, and TanStack Query already holds this in memory for five
    // minutes client-side (src/lib/queryClient.ts), so a CDN or browser cache
    // here would only add a second layer of staleness to reason about.
    res.json(payload);
  })
);
