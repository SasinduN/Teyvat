/**
 * Every public URL the site links to, built in one place: the links, the
 * WhatsApp messages, and (phase 8b) the server's page resolver and the
 * sitemap all use these. Ids are content slugs, already `[a-z0-9-]`.
 */
export const paths = {
  home: '/',
  explore: '/#explore-map',
  journalSection: '/#journal',
  destinations: '/destinations',
  destinationsIn: (category: string) => `/destinations?category=${encodeURIComponent(category)}`,
  destination: (id: string) => `/destinations/${encodeURIComponent(id)}`,
  experiences: '/experiences',
  experience: (id: string) => `/experiences/${encodeURIComponent(id)}`,
  tours: '/tours',
  tour: (id: string) => `/tours/${encodeURIComponent(id)}`,
  article: (id: string) => `/journal/${encodeURIComponent(id)}`,
  about: '/about',
  contact: '/about#contact'
} as const;

/** The site's navigation, in order: the Navbar (desktop and mobile) and the Footer. */
export const NAV_LINKS: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Home', to: paths.home },
  { label: 'Explore', to: paths.explore },
  { label: 'Destinations', to: paths.destinations },
  { label: 'Experiences', to: paths.experiences },
  { label: 'Tours', to: paths.tours },
  { label: 'About', to: paths.about },
  { label: 'Contact', to: paths.contact }
];
