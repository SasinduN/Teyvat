/**
 * Every public URL the site links to, built in one place: the links, the
 * WhatsApp messages, and (phase 8b) the server's page resolver and the
 * sitemap all use these. Ids are content slugs, already `[a-z0-9-]`.
 */
export const paths = {
  home: '/',
  /** The map, hidden gems and the quick search (redesign PR 3). */
  explore: '/explore',
  /** A tour's route on the Explore map ("View route on map"). */
  tourOnMap: (id: string) => `/explore?mapTour=${encodeURIComponent(id)}#explore-map`,
  /** The journey builder. */
  plan: '/plan',
  /** Booking requests, only while BOOKINGS_ENABLED (server/src/routes/bookings.ts). */
  booking: '/booking',
  bookTour: (id: string) => `/booking?tour=${encodeURIComponent(id)}`,
  /** Every article and the photo stories. */
  journal: '/journal',
  destinations: '/destinations',
  destinationsIn: (category: string) => `/destinations?category=${encodeURIComponent(category)}`,
  destination: (id: string) => `/destinations/${encodeURIComponent(id)}`,
  experiences: '/experiences',
  experience: (id: string) => `/experiences/${encodeURIComponent(id)}`,
  tours: '/tours',
  tour: (id: string) => `/tours/${encodeURIComponent(id)}`,
  article: (id: string) => `/journal/${encodeURIComponent(id)}`,
  about: '/about',
  contact: '/about#contact',
  /** Who took the photos, and their licences (linked from the Footer). */
  photoCredits: '/photo-credits',
  /** Not linked from the site: only from newsletter emails (`newsletterUnsubscribeUrl`). */
  unsubscribe: '/unsubscribe'
} as const;

/**
 * An unsubscribe token: the subscriber's random UUID (migration 0012). Here,
 * not beside the Zod schema, so the public page can check a link without
 * loading Zod.
 */
export const UNSUBSCRIBE_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The link every newsletter email must carry (and its `List-Unsubscribe`
 * header). `origin` is PUBLIC_SITE_URL; the token is the subscriber's
 * `unsubscribe_token`.
 */
export const newsletterUnsubscribeUrl = (origin: string, token: string): string =>
  `${origin}${paths.unsubscribe}?token=${encodeURIComponent(token)}`;

/**
 * The home page's old sections, each now on a page of its own (redesign
 * PR 4): a saved `/#planner` still lands on the planner. Hashes never reach
 * the server, so `HomeRoute` (src/App.tsx) redirects these in the browser.
 */
export const LEGACY_HOME_SECTIONS: Readonly<Record<string, string>> = {
  'explore-map': `${paths.explore}#explore-map`,
  'hidden-gems': paths.explore,
  planner: paths.plan,
  journal: paths.journal,
  tours: paths.tours,
  experiences: paths.experiences,
  about: paths.about
};

/** The site's navigation, in order: the Navbar (desktop and mobile) and the Footer. */
export const NAV_LINKS: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Home', to: paths.home },
  { label: 'Explore', to: paths.explore },
  { label: 'Destinations', to: paths.destinations },
  { label: 'Experiences', to: paths.experiences },
  { label: 'Tours', to: paths.tours },
  { label: 'Journal', to: paths.journal },
  { label: 'About', to: paths.about },
  { label: 'Contact', to: paths.contact }
];

/** The navigation as shown: with "Book a Trip" after Tours while bookings are on. */
export function navLinks(features: { bookings: boolean }): ReadonlyArray<{ label: string; to: string }> {
  if (!features.bookings) return NAV_LINKS;
  const at = NAV_LINKS.findIndex((link) => link.to === paths.tours) + 1;
  return [...NAV_LINKS.slice(0, at), { label: 'Book a Trip', to: paths.booking }, ...NAV_LINKS.slice(at)];
}
