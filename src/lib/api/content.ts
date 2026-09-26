/**
 * Public reads for the marketing site: one call to `GET /api/content`.
 *
 * The route returns only published rows, in `sort_order` then `id` order (see
 * `server/src/routes/content.ts`). This side only maps rows to the shapes the
 * approved components expect.
 */
import { API_ROUTES, type SiteContentPayload } from '@shared/api';
import {
  toArticle,
  toDestination,
  toExperienceCategory,
  toExperienceItem,
  toHeroSlide,
  toHiddenGem,
  toPhotoStory,
  toPillar,
  toSiteSettings,
  toTourPackage,
  type ExperienceCategory
} from '@/lib/mappers';
import { getJson } from '@/lib/api/http';
import type {
  Article,
  Destination,
  ExperienceItem,
  HeroSlide,
  HiddenGem,
  PhotoStory,
  Pillar,
  SiteSettings,
  TourPackage
} from '@/types';

/** Everything the public site renders, fetched once at boot. */
export interface SiteContent {
  destinations: Destination[];
  experienceCategories: ExperienceCategory[];
  featuredExperiences: ExperienceItem[];
  tours: TourPackage[];
  articles: Article[];
  hiddenGems: HiddenGem[];
  photoStories: PhotoStory[];
  heroSlides: HeroSlide[];
  pillars: Pillar[];
  siteSettings: SiteSettings;
}

/**
 * What the hooks return before the fetch resolves. The public route does not
 * render any section until content has loaded (`PublicSiteRoute` in App.tsx),
 * so no approved component ever paints with these values.
 */
export const EMPTY_CONTENT: SiteContent = {
  destinations: [],
  experienceCategories: [],
  featuredExperiences: [],
  tours: [],
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
    sustainabilityUrl: ''
  }
};

export async function fetchSiteContent(): Promise<SiteContent> {
  const payload = await getJson<SiteContentPayload>(API_ROUTES.content);

  return {
    destinations: payload.destinations.map(toDestination),
    experienceCategories: payload.experienceCategories.map(toExperienceCategory),
    featuredExperiences: payload.featuredExperiences.map(toExperienceItem),
    tours: payload.tours.map(toTourPackage),
    articles: payload.articles.map(toArticle),
    hiddenGems: payload.hiddenGems.map(toHiddenGem),
    photoStories: payload.photoStories.map(toPhotoStory),
    heroSlides: payload.heroSlides.map(toHeroSlide),
    pillars: payload.pillars.map(toPillar),
    siteSettings: toSiteSettings(payload.siteSettings)
  };
}
