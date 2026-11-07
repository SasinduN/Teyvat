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
  Attraction,
  Destination,
  ExperienceItem,
  HeroSlide,
  HiddenGem,
  ImageCredit,
  PhotoStory,
  Pillar,
  SiteSettings,
  TourPackage
} from '@/types';
import type {
  ArticleRow,
  AttractionRow,
  ExperienceCategoryRow,
  HeroSlideRow,
  HiddenGemRow,
  PhotoStoryRow,
  PillarRow,
} from '@shared/database.types';
import type { PublicDestinationRow, PublicFeaturedExperienceRow, PublicSiteSettings, PublicTourRow } from '@shared/api';
import type { PublicImageCredit } from '@shared/image-credits';

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

export const toDestination = (r: PublicDestinationRow): Destination => ({
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
  bestMonths: r.best_months,
  experiences: r.experiences,
  highlights: r.highlights,
  elevation: opt(r.elevation),
  idealFor: r.ideal_for,
  featured: r.featured,
  travelTimeFromAirport: opt(r.travel_time_from_airport)
});

export const toAttraction = (r: AttractionRow): Attraction => ({
  id: r.id,
  destinationId: r.destination_id,
  name: r.name,
  category: r.category,
  shortDescription: r.short_description,
  latitude: r.latitude,
  longitude: r.longitude,
  image: opt(r.image) || undefined,
  bestMonths: r.best_months
});

export const toExperienceCategory = (r: ExperienceCategoryRow): ExperienceCategory => ({
  id: r.id,
  title: r.title,
  category: r.category,
  subtitle: r.subtitle,
  image: r.image,
  description: r.description
});

export const toExperienceItem = (r: PublicFeaturedExperienceRow): ExperienceItem => ({
  id: r.id,
  title: r.title,
  subtitle: opt(r.subtitle),
  location: r.location,
  duration: r.duration,
  category: r.category,
  image: r.image,
  description: r.description,
  highlights: r.highlights,
  recommendedTime: opt(r.recommended_time)
});

export const toTourPackage = (r: PublicTourRow): TourPackage => ({
  id: r.id,
  title: r.title,
  subtitle: r.subtitle,
  days: r.days,
  // The chips read the stops' names, as `tours.route` did before 0007.
  route: r.stops.map((s) => s.name),
  stops: r.stops.map((s) => ({
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    destinationId: opt(s.destinationId)
  })),
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

/** The column is `image` like every other table; the carousel's prop is `url`. */
export const toHeroSlide = (r: HeroSlideRow): HeroSlide => ({
  id: r.id,
  url: r.image,
  title: r.title,
  caption: r.caption
});

export const toPillar = (r: PillarRow): Pillar => ({
  id: r.id,
  icon: r.icon,
  title: r.title,
  desc: r.description
});

export const toSiteSettings = (r: PublicSiteSettings): SiteSettings => ({
  postalAddress: r.postal_address,
  phone: r.phone,
  contactEmail: r.contact_email,
  // NULL means "not set": undefined, so React leaves the href off entirely.
  instagramUrl: r.instagram_url ?? undefined,
  facebookUrl: r.facebook_url ?? undefined,
  tiktokUrl: r.tiktok_url ?? undefined,
  youtubeUrl: r.youtube_url ?? undefined,
  privacyUrl: r.privacy_url ?? undefined,
  termsUrl: r.terms_url ?? undefined,
  sustainabilityUrl: r.sustainability_url ?? undefined,
  whatsappNumber: r.whatsapp_number ?? undefined,
  stats: r.stats ?? [],
  whenToGoExplainer: r.when_to_go_explainer ?? undefined
});

export const toImageCredit = (r: PublicImageCredit): ImageCredit => ({
  url: r.url,
  author: r.author,
  license: r.license,
  licenseUrl: r.license_url ?? undefined,
  sourceUrl: r.source_url ?? undefined
});
