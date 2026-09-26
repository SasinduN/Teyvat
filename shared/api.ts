/**
 * The wire contract for every `/api/*` route.
 *
 * Imported by BOTH the Express route handlers and `src/lib/api/*.ts`, so one
 * definition describes each payload. Rename a field here and both sides stop
 * compiling, instead of the client quietly reading `undefined` at runtime.
 *
 * Route paths live here too, for the same reason: a typo in a URL string is
 * otherwise a 404 nobody notices until the page is blank.
 */
import type {
  ArticleRow,
  DestinationRow,
  ExperienceCategoryRow,
  FeaturedExperienceRow,
  HeroSlideRow,
  HiddenGemRow,
  PhotoStoryRow,
  PillarRow,
  SiteSettingsRow,
  TourRow
} from './database.types';

export const API_ROUTES = {
  health: '/api/health',
  content: '/api/content'
} as const;

/**
 * `GET /api/content` — everything the public marketing site renders.
 *
 * Deliberately raw database rows, not mapped domain objects. `src/lib/mappers.ts`
 * already converts rows to the exact shapes the approved components expect, and
 * `npm run verify:roundtrip` proves that conversion is lossless. Mapping on the
 * server instead would move that logic out from under its own regression test
 * for no gain.
 *
 * Only published rows appear here, ordered by `sort_order` then `id`. Both were
 * guaranteed by RLS before the move off Supabase and are now the route
 * handler's responsibility — see the header of `db/migrations/0001_init.sql`.
 */
export interface SiteContentPayload {
  destinations: DestinationRow[];
  experienceCategories: ExperienceCategoryRow[];
  featuredExperiences: FeaturedExperienceRow[];
  tours: TourRow[];
  articles: ArticleRow[];
  hiddenGems: HiddenGemRow[];
  photoStories: PhotoStoryRow[];
  heroSlides: HeroSlideRow[];
  pillars: PillarRow[];
  siteSettings: PublicSiteSettings;
}

/**
 * The `site_settings` columns the public Footer renders, and nothing else.
 *
 * An allow-list rather than the whole row: the route selects exactly these
 * columns by name, so a setting added later for admin use only cannot reach
 * `/api/content` without someone adding it here on purpose.
 */
export const PUBLIC_SITE_SETTINGS_COLUMNS = [
  'postal_address',
  'phone',
  'contact_email',
  'instagram_url',
  'facebook_url',
  'tiktok_url',
  'youtube_url',
  'privacy_url',
  'terms_url',
  'sustainability_url'
] as const satisfies readonly (keyof SiteSettingsRow)[];

export type PublicSiteSettings = Pick<
  SiteSettingsRow,
  (typeof PUBLIC_SITE_SETTINGS_COLUMNS)[number]
>;

/** `GET /api/health` — for Railway's healthcheck and for "is the API up?". */
export interface HealthPayload {
  status: 'ok';
  /** Whether the database answered a trivial query, not merely that it is configured. */
  database: 'up' | 'down';
  uptimeSeconds: number;
}

/**
 * The single error shape every route returns on a non-2xx, so the client has
 * one thing to parse. `code` is stable and safe to branch on; `message` is
 * human-facing and may be reworded.
 */
export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'internal';
