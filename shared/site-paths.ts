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
  /** A month slider, the map by suitability, and the monsoons explained. */
  whenToGo: '/when-to-go',
  destinations: '/destinations',
  destinationsIn: (category: string) => `/destinations?category=${encodeURIComponent(category)}`,
  destination: (id: string) => `/destinations/${encodeURIComponent(id)}`,
  /** An attraction's card on its destination's page (search results, map popups). */
  attraction: (destinationId: string, id: string) => `/destinations/${encodeURIComponent(destinationId)}#attraction-${encodeURIComponent(id)}`,
  /** A destination picked on the Explore map, its nearby attractions shown ("View on map"). */
  destinationOnMap: (id: string) => `/explore?place=${encodeURIComponent(id)}#explore-map`,
  experiences: '/experiences',
  experience: (id: string) => `/experiences/${encodeURIComponent(id)}`,
  tours: '/tours',
  tour: (id: string) => `/tours/${encodeURIComponent(id)}`,
  article: (id: string) => `/journal/${encodeURIComponent(id)}`,
  about: '/about',
  contact: '/about#contact',
  /** Who took the photos, and their licences (linked from the Footer). */
  photoCredits: '/photo-credits',
  /** What the visitor saved, kept in their browser. Linked from the Footer; never indexed. */
  wishlist: '/wishlist',
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

export interface NavLink {
  label: string;
  to: string;
}

/** A top-level item of the header: a link, or a group that opens a dropdown (a section on phones). */
export type NavItem = NavLink | { label: string; links: ReadonlyArray<NavLink> };

export const isNavGroup = (item: NavItem): item is { label: string; links: ReadonlyArray<NavLink> } => 'links' in item;

/**
 * The header, in order: at most six items, so they keep their spacing at 1100 px
 * (`browser-text-size`). The logo is the link home. New guides go inside Discover.
 */
const NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    label: 'Discover',
    links: [
      { label: 'Explore map', to: paths.explore },
      { label: 'Destinations', to: paths.destinations },
      { label: 'Experiences', to: paths.experiences },
      { label: 'When to go', to: paths.whenToGo }
    ]
  },
  { label: 'Tours', to: paths.tours },
  { label: 'Book Your Ride', to: paths.booking },
  { label: 'Journal', to: paths.journal },
  {
    label: 'About',
    links: [
      { label: 'About', to: paths.about },
      { label: 'Contact', to: paths.contact }
    ]
  }
];

/** The header's items: Book Your Ride only while bookings are on. */
export function navItems(features: { bookings: boolean }): ReadonlyArray<NavItem> {
  return features.bookings ? NAV_ITEMS : NAV_ITEMS.filter((item) => isNavGroup(item) || item.to !== paths.booking);
}

/** Every link in the header, flat and in order: the Footer's Navigation list. */
export function navLinks(features: { bookings: boolean }): ReadonlyArray<NavLink> {
  return navItems(features).flatMap((item) => (isNavGroup(item) ? item.links : [item]));
}

/** The flat list with bookings off. */
export const NAV_LINKS: ReadonlyArray<NavLink> = navLinks({ bookings: false });

/** The phone menu: each group is a section with its heading, and the plain links between them one without. */
export function navSections(features: { bookings: boolean }): ReadonlyArray<{ label?: string; links: ReadonlyArray<NavLink> }> {
  const sections: { label?: string; links: NavLink[] }[] = [];
  for (const item of navItems(features)) {
    if (isNavGroup(item)) sections.push({ label: item.label, links: [...item.links] });
    else if (sections.at(-1) && !sections.at(-1)!.label) sections.at(-1)!.links.push(item);
    else sections.push({ links: [item] });
  }
  return sections;
}
