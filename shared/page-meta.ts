/**
 * Page titles, shared by the client (`document.title` on navigation) and by
 * Express (the `<title>` and share tags it sends), so the two can never
 * disagree. The brand comes in as an argument: the admin can change its name
 * (`resolveBrand`, `shared/brand.ts`), so no title is a constant.
 *
 * Titles say what people search for first and the brand last, in at most
 * TITLE_MAX characters (docs/reviews/seo-audit-2026-11.md, section 2). The
 * names the pages show (headings, breadcrumbs) are separate: PAGE_NAMES, CRUMB_NAMES.
 */
import type { BrandText } from './brand';

/** About what search results show before cutting a title off. */
export const TITLE_MAX = 60;

/** The home page's search phrase, before " | <brand>". */
export const HOME_TITLE_PHRASE = 'Sri Lanka Tours, Planned Around You';

/** One line, at most `max` characters, cut at a word with an ellipsis. */
export function cutAtWord(text: string, max: number): string {
  const line = text.replace(/\s+/g, ' ').trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max - 1);
  const atWord = cut.slice(0, Math.max(cut.lastIndexOf(' '), Math.floor(max / 2)));
  return `${atWord.replace(/[\s,.;:\u2013\u2014-]+$/, '')}…`;
}

/**
 * "<name> | <brand>" from the first candidate that fits in TITLE_MAX; when none
 * does, the last one cut at a word. The brand always ends it.
 */
export function fitTitle(candidates: readonly string[], brand: Pick<BrandText, 'name'>): string {
  const suffix = ` | ${brand.name}`;
  for (const candidate of candidates) {
    if (candidate.length + suffix.length <= TITLE_MAX) return `${candidate}${suffix}`;
  }
  const last = candidates[candidates.length - 1] ?? '';
  return `${cutAtWord(last, Math.max(12, TITLE_MAX - suffix.length))}${suffix}`;
}

/** The home page's title: "Sri Lanka Tours, Planned Around You | <brand>". */
export const homeTitle = (brand: Pick<BrandText, 'name'>): string => fitTitle([HOME_TITLE_PHRASE], brand);

/** The home page's description: what's offered, in about 150 characters. */
export const homeDescription = (brand: Pick<BrandText, 'name'>): string =>
  `Sri Lanka tours planned around you: tea country, ancient cities, wildlife and surf, on routes ${brand.name} shapes to your time and interests.`;

/** "<name> | <brand>" as it is: the pages that are never indexed. */
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

/** What a fixed page's title says before " | <brand>": the search phrase, where it differs from its name. */
export const PAGE_TITLES: Partial<Record<PageName, string>> = {
  destinations: 'Places to Visit in Sri Lanka',
  experiences: 'Things to Do in Sri Lanka',
  tours: 'Sri Lanka Tours and Itineraries',
  about: 'About Our Sri Lanka Travel Team',
  explore: 'Sri Lanka Map: Places and Routes',
  plan: 'Plan a Sri Lanka Trip',
  journal: 'Sri Lanka Travel Guides',
  whenToGo: 'Best Time to Visit Sri Lanka'
};

/** A fixed page's title: "Places to Visit in Sri Lanka | <brand>". */
export const fixedTitle = (page: PageName, brand: Pick<BrandText, 'name'>): string =>
  fitTitle([PAGE_TITLES[page] ?? PAGE_NAMES[page]], brand);

/** The page types that are a content row. */
export type ContentKind = 'destination' | 'experience' | 'tour' | 'article' | 'tourCategory';

const mentionsSriLanka = (name: string) => /sri lanka/i.test(name);

/**
 * A content page's title, from its own name: "Ella, Sri Lanka", "Island in 7 Days: Sri Lanka
 * Itinerary", each only when it fits (otherwise the name alone), and never "Sri Lanka" twice.
 * An article too long for it is cut at its colon ("The Ultimate Ella Travel Guide").
 */
export function contentTitle(kind: ContentKind, name: string, brand: Pick<BrandText, 'name'>): string {
  const plain = name.replace(/\s+/g, ' ').trim();
  const candidates: string[] = [];
  if (!mentionsSriLanka(plain)) {
    if (kind === 'destination' || kind === 'experience') candidates.push(`${plain}, Sri Lanka`);
    if (kind === 'tour') candidates.push(`${plain}: Sri Lanka Itinerary`);
  }
  candidates.push(plain);
  if (kind === 'article' && plain.includes(':')) candidates.push(plain.slice(0, plain.indexOf(':')).trim());
  return fitTitle(candidates, brand);
}

/**
 * The fixed pages' meta descriptions (search results and link previews), about 120 to 160
 * characters, saying only what the page shows. Their headers' visible subtitles stay
 * PAGE_DESCRIPTIONS, which the pages without an entry here use.
 */
export const META_DESCRIPTIONS: Partial<Record<PageName, string>> = {
  destinations:
    'Places to visit in Sri Lanka: the hill country, ancient cities, beaches and northern temples, each with what to do there and the attractions nearby.',
  experiences:
    'Things to do in Sri Lanka: safaris, sunrise hikes, surf breaks and slow afternoons in old forts, each with where it happens and how to fit it in.',
  tours:
    'Sri Lanka tour itineraries by travel style, from beaches and the hill country to wildlife, culture and honeymoons. Each route can change to suit you.',
  about:
    "Who we are: local travel designers who know Sri Lanka's roads and seasons, and plan each trip around you. Our address, phone and email are here.",
  explore:
    'Sri Lanka on a map: the places we plan trips to and quieter ones nearby, filtered by the kind of trip you want, to find a route around the island.',
  journal:
    'Sri Lanka travel guides and stories: practical advice and photographs from across the island, from the hill country to the coast.',
  whenToGo:
    'The best time to visit Sri Lanka, month by month: pick a month to see which places suit it, and how the two monsoons move around the island.',
  photoCredits:
    'Who took the photographs of Sri Lanka on this site, and the licence each one is shared under, with a link to the original where there is one.'
};

/** A fixed page's meta description: META_DESCRIPTIONS, else its header's subtitle. */
export const metaDescription = (page: PageName): string | undefined =>
  META_DESCRIPTIONS[page] ?? (PAGE_DESCRIPTIONS as Partial<Record<PageName, string>>)[page];

/** The breadcrumbs' names, as the pages show them (PageHero) and their JSON-LD repeats them. */
export const CRUMB_NAMES = {
  home: 'Home',
  destinations: 'Destinations',
  experiences: 'Experiences',
  tours: 'Tours',
  about: 'About',
  explore: 'Explore',
  plan: 'Plan Your Trip',
  journal: 'Journal',
  whenToGo: 'When to go',
  photoCredits: 'Photo Credits',
  wishlist: 'Wishlist',
  unsubscribe: 'Unsubscribe'
} as const;
