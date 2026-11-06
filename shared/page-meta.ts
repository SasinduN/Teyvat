/**
 * Page titles, shared by the client (`document.title` on navigation) and,
 * from phase 8b, by Express (the `<title>` and share tags it sends), so the
 * two can never disagree.
 */
import { BRAND_NAME, BRAND_TAGLINE } from './brand';

/** The home page's title: the one `index.html` has always had. */
export const HOME_TITLE = `${BRAND_NAME} | ${BRAND_TAGLINE}`;

/** The home page's description: the one `index.html` has always had. */
export const HOME_DESCRIPTION = `Tea country, ancient cities, wildlife and surf in Sri Lanka, with routes planned by ${BRAND_NAME}.`;

/** Any other page: "Ella | Travel Eye". */
export const pageTitle = (name: string): string => `${name} | ${BRAND_NAME}`;

/** The fixed titles of the pages that aren't a content row. */
export const PAGE_TITLES = {
  destinations: pageTitle('Destinations'),
  experiences: pageTitle('Experiences'),
  tours: pageTitle('Tours'),
  about: pageTitle('About Us'),
  explore: pageTitle('Explore Sri Lanka'),
  plan: pageTitle('Plan Your Trip'),
  journal: pageTitle('Journal'),
  photoCredits: pageTitle('Photo Credits'),
  unsubscribe: pageTitle('Unsubscribe'),
  wishlist: pageTitle('Your wishlist'),
  booking: pageTitle('Book Your Ride'),
  notFound: pageTitle('Page not found')
} as const;

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
  photoCredits: 'The photographers behind the pictures on this site, and the licences their work is shared under.',
  unsubscribe: 'Stop receiving our newsletter.',
  wishlist: 'The places, experiences and tours you saved.',
  booking: 'Choose your pickup, destination, and travel details for a comfortable journey across Sri Lanka.',
  notFound: 'The page may have moved, or the link may be mistyped.'
} as const;
