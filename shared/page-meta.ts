/**
 * Page titles, shared by the client (`document.title` on navigation) and,
 * from phase 8b, by Express (the `<title>` and share tags it sends), so the
 * two can never disagree.
 */
import { BRAND_NAME, BRAND_TAGLINE } from './brand';

/** The home page's title: the one `index.html` has always had. */
export const HOME_TITLE = `${BRAND_NAME} | ${BRAND_TAGLINE}`;

/** The home page's description: the one `index.html` has always had. */
export const HOME_DESCRIPTION = `Discover hidden places, timeless culture, wild adventures and unforgettable moments across Sri Lanka with ${BRAND_NAME}.`;

/** Any other page: "Ella | Travel Eye". */
export const pageTitle = (name: string): string => `${name} | ${BRAND_NAME}`;

/** The fixed titles of the pages that aren't a content row. */
export const PAGE_TITLES = {
  destinations: pageTitle('Destinations'),
  experiences: pageTitle('Experiences'),
  tours: pageTitle('Tours'),
  about: pageTitle('About Us'),
  photoCredits: pageTitle('Photo Credits'),
  unsubscribe: pageTitle('Unsubscribe'),
  notFound: pageTitle('Page not found')
} as const;

/**
 * The fixed pages' descriptions: their headers' subtitles, and (phase 8b)
 * their `<meta name="description">` and share text.
 */
export const PAGE_DESCRIPTIONS = {
  destinations: 'Misty peaks, ancient citadels, turquoise bays and northern kovils: every place we know and love.',
  experiences: "Safaris, sunrise hikes, surf breaks and slow afternoons in old forts: what to do once you're here.",
  tours: 'Multi-day journeys planned by local experts, each one a starting point we tailor to you.',
  about: "Local travel designers who know the island's back roads, its seasons and its people.",
  photoCredits: 'The photographers behind the pictures on this site, and the licences their work is shared under.',
  unsubscribe: 'Stop receiving our newsletter.',
  notFound: 'The page may have moved, or the link may be mistyped.'
} as const;
