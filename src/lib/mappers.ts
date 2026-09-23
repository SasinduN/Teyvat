/**
 * Database row  <->  front-end domain type.
 *
 * The public components were written against the shapes in `src/types/index.ts`
 * and must keep rendering byte-for-byte the same output, so every mapper here
 * reproduces the original values exactly — including `undefined` (rather than
 * `null`) for the optional fields, since components test them with plain
 * truthiness and optional chaining.
 */
import type {
  Article,
  Destination,
  ExperienceItem,
  HiddenGem,
  PhotoStory,
  TourPackage
} from '@/types';
import type {
  ArticleRow,
  DestinationRow,
  ExperienceCategoryRow,
  FeaturedExperienceRow,
  HiddenGemRow,
  PhotoStoryRow,
  TourRow
} from '@shared/database.types';

/** The `EXPERIENCE_CATEGORIES` tiles have no interface in `src/types`. */
export interface ExperienceCategory {
  id: string;
  title: string;
  category: ExperienceCategoryRow['category'];
  subtitle: string;
  image: string;
  description: string;
}

/** `null` -> `undefined`, so optional props behave as they did when hardcoded. */
const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

/**
 * Renders a `date` column the way the approved design shows it:
 * "February 12, 2026", "December 05, 2025" (day is zero-padded).
 * Parsed as UTC so the label never shifts by a day in western timezones.
 */
export function formatArticleDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

/** Inverse of `formatArticleDate` input: `Date` -> "YYYY-MM-DD". */
export function toDateInputValue(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export const toDestination = (r: DestinationRow): Destination => ({
  id: r.id,
  name: r.name,
  latitude: r.latitude,
  longitude: r.longitude,
  region: r.region,
  province: r.province,
  category: r.category,
  shortDescription: r.short_description,
  longDescription: r.long_description,
  image: r.image,
  // The original data omitted `gallery` entirely when there were no images;
  // an empty array would make `gallery?.length` falsy the same way, but
  // `undefined` keeps the shape identical to the approved demo.
  gallery: r.gallery.length > 0 ? r.gallery : undefined,
  bestTime: r.best_time,
  experiences: r.experiences,
  highlights: r.highlights,
  rating: Number(r.rating),
  elevation: opt(r.elevation),
  idealFor: r.ideal_for,
  featured: r.featured
});

export const toExperienceCategory = (r: ExperienceCategoryRow): ExperienceCategory => ({
  id: r.id,
  title: r.title,
  category: r.category,
  subtitle: r.subtitle,
  image: r.image,
  description: r.description
});

export const toExperienceItem = (r: FeaturedExperienceRow): ExperienceItem => ({
  id: r.id,
  title: r.title,
  subtitle: opt(r.subtitle),
  location: r.location,
  duration: r.duration,
  category: r.category,
  image: r.image,
  description: r.description,
  highlights: r.highlights,
  recommendedTime: opt(r.recommended_time),
  rating: Number(r.rating)
});

export const toTourPackage = (r: TourRow): TourPackage => ({
  id: r.id,
  title: r.title,
  subtitle: r.subtitle,
  days: r.days,
  route: r.route,
  shortDesc: r.short_desc,
  fullDesc: r.full_desc,
  image: r.image,
  highlights: r.highlights,
  includedPlaces: r.included_places,
  priceFrom: Number(r.price_from),
  category: r.category,
  itinerary: Array.isArray(r.itinerary) ? r.itinerary : []
});

export const toArticle = (r: ArticleRow): Article => ({
  id: r.id,
  title: r.title,
  category: r.category,
  date: formatArticleDate(r.published_at),
  readTime: r.read_time,
  image: r.image,
  snippet: r.snippet,
  author: {
    name: r.author_name,
    avatar: r.author_avatar,
    role: r.author_role
  },
  content: r.content.length > 0 ? r.content : undefined
});

export const toHiddenGem = (r: HiddenGemRow): HiddenGem => ({
  id: r.id,
  name: r.name,
  region: r.region,
  image: r.image,
  description: r.description,
  whyVisit: r.why_visit,
  tag: r.tag
});

export const toPhotoStory = (r: PhotoStoryRow): PhotoStory => ({
  id: r.id,
  title: r.title,
  location: r.location,
  category: r.category,
  image: r.image,
  caption: r.caption,
  aspect: opt(r.aspect)
});
