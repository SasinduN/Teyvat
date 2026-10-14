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
import { publicImageCredits } from '../media/credits';
import { asyncRoute } from '../http';
import { publicStopsByTour } from '../tour-stops';
import { localPhoto, publicPhoto, publicGallery, photoStoryLocation, photoStoryCopy } from '../../../shared/public-photos';
import photographs from '../../../shared/travel-photos.json';

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
  asyncRoute(async (req, res) => {
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
      siteSettings,
      stopsByTour,
      imageCredits
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
      selectSiteSettings(),
      publicStopsByTour(pool),
      publicImageCredits(pool)
    ]);

    const payload: SiteContentPayload = {
      destinations,
      experienceCategories,
      featuredExperiences,
      // Each tour carries its route stops, resolved, so the client joins nothing.
      tours: tours.map((tour) => ({ ...tour, stops: stopsByTour.get(tour.id) ?? [] })),
      articles,
      hiddenGems,
      photoStories,
      heroSlides,
      pillars,
      siteSettings,
      imageCredits,
      features: { bookings: req.app.locals.bookings === true }
    };

    // Pin existing destination covers to their verified places; restore other
    // exact legacy seed photos while preserving curated replacements and rows.
    const photoCollections = [
      ['destinations', payload.destinations], ['experience_categories', payload.experienceCategories],
      ['featured_experiences', payload.featuredExperiences], ['tours', payload.tours],
      ['articles', payload.articles], ['hidden_gems', payload.hiddenGems],
      ['photo_stories', payload.photoStories], ['hero_slides', payload.heroSlides]
    ] as const;
    for (const [table, rows] of photoCollections) {
      for (const row of rows) {
        if (table === 'photo_stories' && 'location' in row) {
          row.location = photoStoryLocation(row.id, row.image, row.location);
          if ('caption' in row && 'title' in row) Object.assign(row, photoStoryCopy(row.id, row.image, row.title, row.caption));
        }
        row.image = publicPhoto(table, row.id, row.image);
      }
    }
    for (const row of payload.destinations) row.gallery = publicGallery(row.id, row.gallery).map(localPhoto);
    const used = new Set(photoCollections.flatMap(([, rows]) => rows.map(row => row.image)));
    for (const row of payload.destinations) for (const image of row.gallery) used.add(image);
    payload.imageCredits = payload.imageCredits
      .map(credit => ({ ...credit, url: localPhoto(credit.url) }))
      .filter(credit => used.has(credit.url));
    for (const photo of photographs) {
      for (const url of new Set([localPhoto(photo.image), localPhoto(photo.original)])) {
        if (used.has(url) && !payload.imageCredits.some(credit => credit.url === url)) {
          payload.imageCredits.push({ url, author: photo.author, license: photo.license,
            license_url: photo.licenseUrl, source_url: photo.source });
        }
      }
    }

    // An admin save must show on the next page load. `no-cache` lets the
    // browser keep a copy but makes it revalidate every time (the ETag Express
    // adds turns an unchanged payload into a 304). Nothing else caches this:
    // TanStack Query holds it in memory for five minutes, which a reload
    // resets, and an admin save in the same tab invalidates it.
    res.set('Cache-Control', 'no-cache');
    res.json(payload);
  })
);
