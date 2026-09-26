/**
 * `GET /api/content` — the public marketing site's entire content payload.
 *
 * Unauthenticated and read-only. This is the one route a traveller's browser
 * hits, so it is also the route where the two guarantees RLS used to enforce
 * now live: only published rows, in the approved order.
 */
import { Router } from 'express';
import type { QueryResultRow } from 'pg';

import {
  PUBLIC_SITE_SETTINGS_COLUMNS,
  type PublicSiteSettings,
  type SiteContentPayload
} from '../../../shared/api';
import type {
  ArticleRow,
  DestinationRow,
  ExperienceCategoryRow,
  FeaturedExperienceRow,
  HeroSlideRow,
  HiddenGemRow,
  PhotoStoryRow,
  PillarRow,
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
  'photo_stories',
  'hero_slides',
  'pillars'
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

/**
 * The Footer's settings, by explicit column list rather than `select *`, so a
 * private setting added to the table later is not published by default. The
 * column names come from a constant, never from a request.
 *
 * The row is created by `0001_init.sql`, so its absence is a broken database,
 * not an empty state: fail the whole request rather than render a footer with
 * blanks in it.
 */
async function selectSiteSettings(): Promise<PublicSiteSettings> {
  const { rows } = await pool.query<PublicSiteSettings>(
    `select ${PUBLIC_SITE_SETTINGS_COLUMNS.join(', ')} from public.site_settings where id`
  );
  if (rows.length === 0) {
    throw new Error('public.site_settings has no row; run `npm run migrate`.');
  }
  return rows[0];
}

export const contentRouter = Router();

contentRouter.get(
  '/content',
  asyncRoute(async (_req, res) => {
    // One round trip per table, all in flight together. Ten small reads in
    // parallel beat one join that would have to be unpicked client-side.
    const [
      destinations,
      experienceCategories,
      featuredExperiences,
      tours,
      articles,
      hiddenGems,
      photoStories,
      heroSlides,
      pillars,
      siteSettings
    ] = await Promise.all([
      selectPublished<DestinationRow>('destinations'),
      selectPublished<ExperienceCategoryRow>('experience_categories'),
      selectPublished<FeaturedExperienceRow>('featured_experiences'),
      selectPublished<TourRow>('tours'),
      selectPublished<ArticleRow>('articles'),
      selectPublished<HiddenGemRow>('hidden_gems'),
      selectPublished<PhotoStoryRow>('photo_stories'),
      selectPublished<HeroSlideRow>('hero_slides'),
      selectPublished<PillarRow>('pillars'),
      selectSiteSettings()
    ]);

    const payload: SiteContentPayload = {
      destinations,
      experienceCategories,
      featuredExperiences,
      tours,
      articles,
      hiddenGems,
      photoStories,
      heroSlides,
      pillars,
      siteSettings
    };

    // No caching headers on purpose. An admin save must show on the public site
    // without a reload, and TanStack Query already holds this in memory for five
    // minutes client-side (src/lib/queryClient.ts), so a CDN or browser cache
    // here would only add a second layer of staleness to reason about.
    res.json(payload);
  })
);
