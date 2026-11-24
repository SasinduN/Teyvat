/**
 * Public reads for the marketing site: one call to `GET /api/content`.
 *
 * The route returns only published rows, in `sort_order` then `id` order (see
 * `server/src/routes/content.ts`). This side only maps rows to the shapes the
 * approved components expect.
 */
import { documentBrand } from '@/lib/brand';
import { API_ROUTES, type SiteContentPayload, type SiteFeatures } from '@shared/api';
import { registerPhotoSets } from '@shared/photo-assets';
import {
  toArticle,
  toAttraction,
  toDestination,
  toExperienceCategory,
  toExperienceItem,
  toHeroSlide,
  toHiddenGem,
  toImageCredit,
  toPhotoStory,
  toPillar,
  toSiteSettings,
  toTourCategory,
  toTourPackage,
  type ExperienceCategory
} from '@/lib/mappers';
import { getJson } from '@/lib/api/http';
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
  TourCategory,
  TourPackage
} from '@/types';

/** Everything the public site renders, fetched once at boot. */
export interface SiteContent {
  destinations: Destination[];
  /** Only those whose destination is published too. */
  attractions: Attraction[];
  experienceCategories: ExperienceCategory[];
  featuredExperiences: ExperienceItem[];
  tours: TourPackage[];
  /** Published, in order (0030). */
  tourCategories: TourCategory[];
  articles: Article[];
  hiddenGems: HiddenGem[];
  photoStories: PhotoStory[];
  heroSlides: HeroSlide[];
  pillars: Pillar[];
  siteSettings: SiteSettings;
  imageCredits: ImageCredit[];
  features: SiteFeatures;
}

/**
 * What the hooks return before the fetch resolves. The public route does not
 * render any section until content has loaded (`PublicSiteRoute` in App.tsx),
 * so no approved component ever paints with these values.
 */
export const EMPTY_CONTENT: SiteContent = {
  destinations: [],
  attractions: [],
  experienceCategories: [],
  featuredExperiences: [],
  tours: [],
  tourCategories: [],
  articles: [],
  hiddenGems: [],
  photoStories: [],
  heroSlides: [],
  pillars: [],
  siteSettings: {
    postalAddress: '',
    phone: '',
    contactEmail: '',
    instagramUrl: '',
    facebookUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    privacyUrl: '',
    termsUrl: '',
    sustainabilityUrl: '',
    // No whatsappNumber: the button stays hidden until content has loaded.
    stats: [],
    // The splash's logo: the name the server put in the page, before content arrives.
    brand: documentBrand()
  },
  imageCredits: [],
  features: { bookings: false }
};

export async function fetchSiteContent(): Promise<SiteContent> {
  return toSiteContent(await getJson<SiteContentPayload>(API_ROUTES.content));
}

/**
 * The payload mapped to what the components read. The server's first screen uses it
 * too (`src/ssr/first-screen.tsx`), with the same payload, so both draw the same thing.
 * Registers the payload's photo sets (`TravelImage`'s `srcset`).
 */
export function toSiteContent(payload: SiteContentPayload): SiteContent {
  registerPhotoSets(payload.photoSets);

  return {
    destinations: payload.destinations.map(toDestination),
    attractions: payload.attractions.map(toAttraction),
    experienceCategories: payload.experienceCategories.map(toExperienceCategory),
    featuredExperiences: payload.featuredExperiences.map(toExperienceItem),
    tours: payload.tours.map(toTourPackage),
    tourCategories: payload.tourCategories.map(toTourCategory),
    articles: payload.articles.map(toArticle),
    hiddenGems: payload.hiddenGems.map(toHiddenGem),
    photoStories: payload.photoStories.map(toPhotoStory),
    heroSlides: payload.heroSlides.map(toHeroSlide),
    pillars: payload.pillars.map(toPillar),
    siteSettings: toSiteSettings(payload.siteSettings),
    imageCredits: payload.imageCredits.map(toImageCredit),
    features: payload.features
  };
}
