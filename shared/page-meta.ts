/**
 * Page titles, shared by the client (`document.title` on navigation) and by
 * Express (the `<title>` and share tags it sends), so the two can never
 * disagree. The brand comes in as an argument: the admin can change its name
 * (`resolveBrand`, `shared/brand.ts`), so no title is a constant.
 */
import type { BrandText } from './brand';

/** The home page's title: "<brand> | <tagline>". */
export const homeTitle = (brand: Pick<BrandText, 'name' | 'tagline'>): string => `${brand.name} | ${brand.tagline}`;

/** The home page's description. */
export const homeDescription = (brand: Pick<BrandText, 'name'>): string =>
  `Tea country, ancient cities, wildlife and surf in Sri Lanka, with routes planned by ${brand.name}.`;

/** Any other page: "Ella | <brand>". */
export const pageTitle = (name: string, brand: Pick<BrandText, 'name'>): string => `${name} | ${brand.name}`;

/** The names of the pages that aren't a content row: their titles before " | <brand>". */
export const PAGE_NAMES = {
  destinations: 'Destinations',
  experiences: 'Experiences',
  tours: 'Tours',
  about: 'About Us',
  explore: 'Explore Sri Lanka',
  plan: 'Plan Your Trip',
  journal: 'Journal',
  whenToGo: 'When to go',
  photoCredits: 'Photo Credits',
  unsubscribe: 'Unsubscribe',
  wishlist: 'Your wishlist',
  booking: 'Book Your Ride',
  notFound: 'Page not found',
  admin: 'Admin'
} as const;

export type PageName = keyof typeof PAGE_NAMES;

/**
 * The fixed pages' descriptions: their headers' subtitles, and (phase 8b)
 * their `<meta name="description">` and share text.
 */
export const PAGE_DESCRIPTIONS = {
  destinations: 'Highlands, ancient cities, beaches and northern temples: the places we plan trips to.',
  experiences: "Safaris, sunrise hikes, surf breaks and slow afternoons in old forts: what to do once you're here.",
  tours: 'Multi-day routes planned by local experts. Each one can change to suit you.',
  about: "Local travel designers who know the island's roads and seasons.",
  explore: 'See Sri Lanka on the map and find a route around the island.',
  plan: 'Shape a sample Sri Lankan journey around your interests, time and preferred regions, then plan the details with a local travel designer.',
  journal: 'Local travel stories, practical guides and photographic moments from across Sri Lanka.',
  whenToGo: 'Pick a month to see which places in Sri Lanka suit it, and how the two monsoons move around the island.',
  photoCredits: 'The photographers behind the pictures on this site, and the licences their work is shared under.',
  unsubscribe: 'Stop receiving our newsletter.',
  wishlist: 'The places, experiences and tours you saved.',
  booking: 'Choose your pickup, destination, and travel details for a comfortable journey across Sri Lanka.',
  notFound: 'The page may have moved, or the link may be mistyped.'
} as const;
