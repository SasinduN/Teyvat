/**
 * Page titles, shared by the client (`document.title` on navigation) and,
 * from phase 8b, by Express (the `<title>` and share tags it sends), so the
 * two can never disagree.
 */
import { BRAND_NAME, BRAND_TAGLINE } from './brand';

/** The home page's title: the one `index.html` has always had. */
export const HOME_TITLE = `${BRAND_NAME} | ${BRAND_TAGLINE}`;

/** Any other page: "Ella | Travel Eye". */
export const pageTitle = (name: string): string => `${name} | ${BRAND_NAME}`;

/** The fixed titles of the pages that aren't a content row. */
export const PAGE_TITLES = {
  destinations: pageTitle('Destinations'),
  experiences: pageTitle('Experiences'),
  tours: pageTitle('Tours'),
  about: pageTitle('About Us'),
  notFound: pageTitle('Page not found')
} as const;
