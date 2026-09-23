/**
 * Hand-maintained mirror of `supabase/migrations/0001_init.sql`.
 *
 * Keep this file in sync whenever the schema changes. (If you adopt the
 * Supabase CLI, `supabase gen types typescript` can generate the same shape.)
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

export type InquiryStatus = 'new' | 'in_progress' | 'responded' | 'closed' | 'archived';

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
  route: string[];
  short_desc: string;
  full_desc: string;
  image: string;
  highlights: string[];
  included_places: string[];
  price_from: number;
  category: TourCategory;
  itinerary: ItineraryDayRow[];
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
}

export interface AdminRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
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
}

export type ContentTableName = keyof ContentTables;
