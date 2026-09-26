import type { PillarIconName } from '@shared/database.types';

export type CategoryType = 'All' | 'Beaches' | 'Mountains' | 'Culture' | 'Wildlife' | 'Adventure' | 'Food' | 'Hidden Gems';

export interface Destination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: 'South' | 'Central' | 'East' | 'North' | 'Cultural Triangle' | 'West';
  province: string;
  category: CategoryType[];
  shortDescription: string;
  longDescription: string;
  image: string;
  gallery?: string[];
  bestTime: string;
  experiences: string[];
  highlights: string[];
  rating: number;
  elevation?: string;
  idealFor: string[];
  featured?: boolean;
}

export interface ExperienceItem {
  id: string;
  title: string;
  subtitle?: string;
  location: string;
  duration: string;
  category: CategoryType;
  image: string;
  description: string;
  highlights: string[];
  recommendedTime?: string;
  rating: number;
}

export interface TourPackage {
  id: string;
  title: string;
  subtitle: string;
  days: number;
  route: string[];
  shortDesc: string;
  fullDesc: string;
  image: string;
  highlights: string[];
  includedPlaces: string[];
  priceFrom: number;
  category: 'Luxury' | 'Culture' | 'Wildlife' | 'Adventure' | 'Full Island';
  itinerary: {
    day: number;
    title: string;
    description: string;
    location: string;
  }[];
}

export interface Article {
  id: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  snippet: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  content?: string[];
}

export interface HiddenGem {
  id: string;
  name: string;
  region: string;
  image: string;
  description: string;
  whyVisit: string;
  tag: string;
}

export interface PhotoStory {
  id: string;
  title: string;
  location: string;
  category: string;
  image: string;
  caption: string;
  aspect?: 'square' | 'portrait' | 'landscape';
}

export interface PlannerState {
  style: string;
  duration: string;
  region: string;
  travelers: string;
}

/** A full-screen slide in the hero carousel. */
export interface HeroSlide {
  id: string;
  url: string;
  title: string;
  caption: string;
}

/**
 * Allowed `Pillar.icon` values: the CHECK constraint on `public.pillars.icon`,
 * declared once in `shared/database.types.ts`. Adding an icon means changing
 * that constraint, that type, and the icon map in `WhyTravelEye` together.
 */
export type PillarIcon = PillarIconName;

/** A "Why Travel Eye" value proposition. */
export interface Pillar {
  id: string;
  /** Lucide icon name, resolved to a component by the rendering component. */
  icon: PillarIcon;
  title: string;
  desc: string;
}

/** The contact details and links the Footer renders, from `site_settings`. */
export interface SiteSettings {
  postalAddress: string;
  phone: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  privacyUrl: string;
  termsUrl: string;
  sustainabilityUrl: string;
}
