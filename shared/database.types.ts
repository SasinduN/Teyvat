/**
 * Hand-maintained mirror of `db/migrations/*.sql`.
 *
 * Keep this file in sync whenever the schema changes.
 */

export type TourCategory = 'Luxury' | 'Culture' | 'Wildlife' | 'Adventure' | 'Full Island';

export type DestinationRegion =
  | 'South'
  | 'Central'
  | 'East'
  | 'North'
  | 'Cultural Triangle'
  | 'West';

/** `CategoryType` minus the UI-only 'All' member. */
export type StoredCategory =
  | 'Beaches'
  | 'Mountains'
  | 'Culture'
  | 'Wildlife'
  | 'Adventure'
  | 'Food'
  | 'Hidden Gems';

export type PhotoAspect = 'square' | 'portrait' | 'landscape';

/** Since 0014_bookings; the request's own shape is `BookingInput` (shared/booking.ts). */
export interface BookingVehicleRow {
  id: string;
  name: string;
  type: 'Car' | 'SUV' | 'Van' | 'Minibus';
  passenger_capacity: number | null;
  luggage_capacity: number | null;
  accepting_requests: boolean;
}
export interface BookingRow {
  id: string;
  reference: string;
  guest_hash: string;
  guest_expires_at: string;
  idempotency_key: string;
  request_hash: string;
  tour_id: string | null;
  destination_id: string | null;
  vehicle_id: string;
  passengers: number;
  departure_at: string;
  return_at: string | null;
  details: import('./booking').BookingDetails;
  status: import('./booking').BookingStatus;
  version: number;
  created_at: string;
  updated_at: string;
}
export interface BookingHistoryRow {
  id: number;
  booking_id: string;
  status: import('./booking').BookingStatus;
  action: 'created' | 'edited' | 'status_changed';
  actor: string;
  created_at: string;
}
export interface BookingAttemptRow {
  ip: string;
  action: 'session' | 'create' | 'change';
  attempts: number;
  window_started: string;
}
export interface BookingNotificationRow {
  id: string;
  booking_id: string;
  event: string;
  status: 'queued' | 'sent' | 'failed';
  attempts: number;
  next_attempt_at: string;
  created_at: string;
}

/** Since 0006_inquiries. `closed_at` is set exactly when the status is `closed`. */
export const INQUIRY_STATUSES = ['new', 'contacted', 'closed'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export interface ItineraryDayRow {
  day: number;
  title: string;
  description: string;
  location: string;
}

interface Timestamps {
  created_at: string;
  updated_at: string;
}

interface Orderable {
  sort_order: number;
  published: boolean;
}

export interface DestinationRow extends Timestamps, Orderable {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: DestinationRegion;
  province: string;
  category: StoredCategory[];
  short_description: string;
  long_description: string;
  image: string;
  gallery: string[];
  best_time: string;
  experiences: string[];
  highlights: string[];
  rating: number;
  elevation: string | null;
  ideal_for: string[];
  featured: boolean;
  /** Since 0007. Short text such as "~4 h"; NULL when not set. */
  travel_time_from_airport: string | null;
}

export interface ExperienceCategoryRow extends Timestamps, Orderable {
  id: string;
  title: string;
  category: StoredCategory;
  subtitle: string;
  image: string;
  description: string;
}

export interface FeaturedExperienceRow extends Timestamps, Orderable {
  id: string;
  title: string;
  subtitle: string | null;
  location: string;
  duration: string;
  category: StoredCategory;
  image: string;
  description: string;
  highlights: string[];
  recommended_time: string | null;
  rating: number;
}

export interface TourRow extends Timestamps, Orderable {
  id: string;
  title: string;
  subtitle: string;
  days: number;
  short_desc: string;
  full_desc: string;
  image: string;
  highlights: string[];
  included_places: string[];
  price_from: number;
  category: TourCategory;
  itinerary: ItineraryDayRow[];
}

/**
 * One stop on a tour's route, in order (since 0007; it replaced
 * `tours.route`). Either a linked destination, which takes its coordinates
 * from the destination, or a custom place with its own. On a linked stop,
 * `name` is an optional label for the route chip (NULL: the destination's
 * name), so "Yala" can stay "Yala" rather than "Yala National Park".
 */
export interface TourStopRow {
  id: number;
  tour_id: string;
  position: number;
  destination_id: string | null;
  name: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ArticleRow extends Timestamps, Orderable {
  id: string;
  title: string;
  category: string;
  published_at: string;
  read_time: string;
  image: string;
  snippet: string;
  author_name: string;
  author_avatar: string;
  author_role: string;
  content: string[];
}

export interface HiddenGemRow extends Timestamps, Orderable {
  id: string;
  name: string;
  region: string;
  image: string;
  description: string;
  why_visit: string;
  tag: string;
}

export interface PhotoStoryRow extends Timestamps, Orderable {
  id: string;
  title: string;
  location: string;
  category: string;
  image: string;
  caption: string;
  aspect: PhotoAspect | null;
}

export interface HeroSlideRow extends Timestamps, Orderable {
  id: string;
  image: string;
  title: string;
  caption: string;
}

/**
 * Allowed `pillars.icon` values: the column's CHECK constraint. Same list as
 * `PillarIcon` in `src/types` and the icon map in `WhyTravelEye`. A runtime
 * array, not just a type, so the admin can offer it as a dropdown and the API
 * can validate against it.
 */
export const PILLAR_ICON_NAMES = [
  'Users',
  'Compass',
  'Sliders',
  'Leaf',
  'Heart',
  'ShieldCheck',
  'Star',
  'MapPin',
  'Camera',
  'Globe',
  'Sparkles',
  'Award',
  'Clock',
  'Handshake',
  'Mountain',
  'Waves',
  'Utensils',
  'Binoculars'
] as const;

export type PillarIconName = (typeof PILLAR_ICON_NAMES)[number];

export interface PillarRow extends Timestamps, Orderable {
  id: string;
  icon: PillarIconName;
  title: string;
  description: string;
}

/**
 * The single `site_settings` row. Each link is NULL (not set; the Footer
 * renders it without an href) or an https:// URL, per 0004_site_settings_links.
 */
export interface SiteSettingsRow extends Timestamps {
  id: true;
  postal_address: string;
  phone: string;
  contact_email: string;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  privacy_url: string | null;
  terms_url: string | null;
  sustainability_url: string | null;
  /** Digits only, e.g. 94771234567 (0008). NULL: the WhatsApp button is hidden. */
  whatsapp_number: string | null;
}

export interface InquiryRow extends Timestamps {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  travelers: string;
  dates: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  admin_notes: string | null;
  /** Set when the form's hidden honeypot field was filled in. */
  spam: boolean;
  closed_at: string | null;
}

/** `public.users`. Every user is an admin; there is no role column. */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Columns the database fills in itself. Admin forms build
 * `Insert<T>` / `Update<T>` payloads rather than whole rows.
 */
type Generated = 'created_at' | 'updated_at';

export type Insert<T> = Omit<T, Generated>;
export type Update<T> = Partial<Omit<T, 'id' | Generated>>;

/**
 * Table-name -> row-type map. Used to keep the generic CRUD helpers in
 * `src/lib/api/admin.ts` honest.
 */
export interface ContentTables {
  destinations: DestinationRow;
  experience_categories: ExperienceCategoryRow;
  featured_experiences: FeaturedExperienceRow;
  tours: TourRow;
  articles: ArticleRow;
  hidden_gems: HiddenGemRow;
  photo_stories: PhotoStoryRow;
  hero_slides: HeroSlideRow;
  pillars: PillarRow;
}

export type ContentTableName = keyof ContentTables;

/** Every content table, in admin-menu order. Also the API's table allow-list. */
export const CONTENT_TABLE_NAMES = [
  'destinations',
  'experience_categories',
  'featured_experiences',
  'tours',
  'articles',
  'hidden_gems',
  'photo_stories',
  'hero_slides',
  'pillars'
] as const satisfies readonly ContentTableName[];
