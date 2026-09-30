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
  content: '/api/content',
  /** `POST`: the public enquiry form. */
  inquiries: '/api/inquiries',
  auth: {
    login: '/api/auth/login',
    me: '/api/auth/me',
    logout: '/api/auth/logout',
    logoutAll: '/api/auth/logout-all'
  },
  admin: {
    /** `/api/admin/content/:table`, then `/count`, `/order`, `/:id`, `/:id/published`. */
    content: '/api/admin/content',
    siteSettings: '/api/admin/site-settings',
    /** `POST ?folder=`, `GET`, `GET /usage?url=`, `DELETE /:id[?force=true]`. */
    media: '/api/admin/media',
    /** `GET ?status=&search=&spam=`, `GET /counts`, `GET /export.csv`, `GET|PATCH|DELETE /:id`. */
    inquiries: '/api/admin/inquiries'
  }
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
  /**
   * Image uploads. Informational only: the healthcheck passes on the database
   * alone, so an R2 outage can't fail a deploy.
   */
  media: 'up' | 'down' | 'not_configured';
  uptimeSeconds: number;
}

/**
 * The signed-in user, as `/api/auth/*` returns it. Deliberately not the
 * `users` row: the password hash and bookkeeping columns never leave the
 * server.
 *
 * There is no role field. Every user is an admin, so being signed in is the
 * whole of the authorisation question.
 */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
}

/** `POST /api/auth/login` and `GET /api/auth/me`. */
export interface AuthUserPayload {
  user: AuthUser;
}

/** `POST /api/auth/login` request body. Validated on the server with Zod. */
export interface LoginRequest {
  email: string;
  password: string;
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
    /**
     * Field-level messages for a 400 (and for a 409 on a taken slug), keyed
     * by path: `{ "itinerary.2.title": "Each day needs a title." }`.
     */
    fields?: Record<string, string>;
  };
}

/**
 * `PUT /api/admin/content/:table/:id` and `PUT /api/admin/site-settings`.
 *
 * `expectedUpdatedAt` is the `updated_at` the editor loaded. If the row has
 * been saved since, the write is refused with 409 rather than overwriting it.
 */
export interface VersionedUpdate<T> {
  values: T;
  expectedUpdatedAt: string;
}

/** `PUT /api/admin/content/:table/order`: every id in the table, in the new order. */
export interface ReorderRequest {
  ids: string[];
}

/** A row that uses an image, for the library's "Used by" and the delete 409. */
export interface MediaUsage {
  table: string;
  id: string;
  title: string;
}

/** One upload, as `GET /api/admin/media` lists it. */
export interface MediaItem {
  id: string;
  key: string;
  url: string;
  folder: string;
  contentType: string;
  bytes: number;
  createdAt: string;
  usedBy: MediaUsage[];
}

/** `GET /api/admin/media`. `uploadsEnabled` is false when R2 isn't configured. */
export interface MediaLibraryPayload {
  uploadsEnabled: boolean;
  items: MediaItem[];
}

/** `GET /api/admin/inquiries/counts`. `new` excludes spam; so do the others. */
export interface InquiryCounts {
  new: number;
  contacted: number;
  closed: number;
  spam: number;
}

/** `GET /api/admin/content/:table/count`. */
export interface CountPayload {
  count: number;
}

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  /** HTTP 429. Sent with a `Retry-After` header, in seconds. */
  | 'too_many_requests'
  /** HTTP 413. */
  | 'payload_too_large'
  /** HTTP 415: the bytes are not an image type we accept. */
  | 'unsupported_media_type'
  | 'internal'
  /** HTTP 502: a service we depend on (R2) refused the request. */
  | 'bad_gateway'
  /** HTTP 503: the feature needs configuration this server doesn't have. */
  | 'not_configured';
