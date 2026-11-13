/**
 * The brand, Serendib Luxe Tours, in one place. Everything the site says about
 * itself reads from here: the header and footer logo, page
 * titles and share tags, JSON-LD, the web manifest, notification emails,
 * llms.txt, the admin's title, copyright lines, the 404 and error pages, and
 * alt texts. A rebrand is this file (or Admin → Settings → Brand for the text).
 *
 * Two kinds of value:
 *
 * - **Text** (`BrandText`): the defaults below, each one overridable in
 *   Admin → Settings (`site_settings.brand_*`, migration 0024). An empty
 *   setting means "use the default here".
 * - **Files and fixed values** (`BRAND_ASSETS`): logo files, favicon, the
 *   email domain, the default share image, the manifest's colours. They live
 *   in the repo, so they change here.
 *
 * `server/test/brand-strings.test.ts` fails on any earlier brand name in the
 * repo, so nothing can bypass this file.
 */

/** What the admin can edit. */
export interface BrandText {
  /** The full name: page titles, share tags, emails, JSON-LD, the manifest. */
  name: string;
  /**
   * Where room is short: the manifest's `short_name`, and the wordmark's large
   * line (`wordmarkLines`), with the rest of the name small underneath.
   */
  shortName: string;
  /** One line under the name: the home title, the footer, llms.txt. */
  tagline: string;
  /** The company's registered name: copyright lines, JSON-LD's `legalName`. */
  legalName: string;
}

export interface BrandAssets {
  /**
   * The logo as two SVG files under `public/brand/`: `onLight` for light
   * backgrounds (the header in the light theme), `onDark` for dark ones (the
   * footer, the dark theme, the header over the home photo). Both null: the
   * wordmark, "SERENDIB LUXE" over a small "TOURS" in DM Sans and the
   * site's colour tokens (`Logo.tsx`), which follows an admin's name change.
   */
  logo: { onLight: string | null; onDark: string | null };
  /** An SVG under `public/`: the "SL" monogram. */
  favicon: string;
  /**
   * The brand's domain: the example address on the admin's sign-in form, and
   * the contact email in fresh databases. Never the sender's address: emails
   * go from NOTIFY_EMAIL_FROM until Resend has verified this domain.
   */
  emailDomain: string;
  /**
   * The share image for pages that have no photo of their own: an absolute
   * https URL to a 1200 × 630 JPEG or PNG (on R2), or a site path. Link
   * previews don't read SVG. Null: those pages share without an image.
   */
  ogImage: string | null;
  /** The web manifest's colours (hex): the header's green and the page's pearl. */
  themeColor: string;
  backgroundColor: string;
}

export interface Brand extends BrandText, BrandAssets {}

/** The brand. The legal name is the trading name until the company is registered: set it in admin then. */
export const BRAND_TEXT_DEFAULTS: BrandText = {
  name: 'Serendib Luxe Tours',
  shortName: 'Serendib Luxe',
  tagline: 'Sri Lanka, planned around you.',
  legalName: 'Serendib Luxe Tours'
};

export const BRAND_ASSETS: BrandAssets = {
  logo: { onLight: null, onDark: null },
  favicon: '/favicon.svg',
  emailDomain: 'serendibluxetours.com',
  ogImage: null,
  themeColor: '#194D3B',
  backgroundColor: '#FAFBF8'
};

/** The brand with nothing overridden: build time, and whenever the database can't be read. */
export const BRAND: Brand = { ...BRAND_TEXT_DEFAULTS, ...BRAND_ASSETS };

/** The `site_settings` columns that override `BrandText` (0024). */
export const BRAND_COLUMNS = {
  name: 'brand_name',
  shortName: 'brand_short_name',
  tagline: 'brand_tagline',
  legalName: 'brand_legal_name'
} as const satisfies Record<keyof BrandText, string>;

export type BrandColumn = (typeof BRAND_COLUMNS)[keyof BrandText];
export type BrandSettings = Partial<Record<BrandColumn, string | null>>;

/** The longest each setting may be (the admin form and the database agree). */
export const BRAND_MAX_LENGTH: Record<BrandColumn, number> = {
  brand_name: 60,
  brand_short_name: 30,
  brand_tagline: 120,
  brand_legal_name: 120
};

/** The brand, with whatever the admin set on top of the defaults. Blank means unset. */
export function resolveBrand(settings: BrandSettings | null | undefined): Brand {
  const pick = (key: keyof BrandText): string => {
    const value = settings?.[BRAND_COLUMNS[key]]?.trim();
    return value ? value : BRAND_TEXT_DEFAULTS[key];
  };
  return {
    ...BRAND_ASSETS,
    name: pick('name'),
    shortName: pick('shortName'),
    tagline: pick('tagline'),
    legalName: pick('legalName')
  };
}

/** "© 2026 Serendib Luxe Tours": the footer's and the phone menu's line. */
export function copyrightLine(brand: Pick<Brand, 'legalName'>, year: number): string {
  return `© ${year} ${brand.legalName}`;
}

/** An address at the brand's domain: `you@serendibluxetours.com`. */
export function brandAddress(local: string, brand: Pick<Brand, 'emailDomain'> = BRAND): string {
  return `${local}@${brand.emailDomain}`;
}

/**
 * The wordmark's two lines: the short name large, the rest of the name small
 * underneath ("Serendib Luxe" over "Tours"; the logo sets both in capitals).
 * A name that doesn't start with the short name is one line.
 */
export function wordmarkLines(brand: Pick<Brand, 'name' | 'shortName'>): { main: string; sub: string } {
  const { name, shortName } = brand;
  if (shortName && name.toLowerCase().startsWith(shortName.toLowerCase()) && name.length > shortName.length) {
    return { main: name.slice(0, shortName.length).trim(), sub: name.slice(shortName.length).trim() };
  }
  return { main: name, sub: '' };
}

/** The hero's headline: the admin's (Settings), or the tagline. Split after its first comma, for the emphasis. */
export function heroHeadlineParts(headline: string): { lead: string; emphasis: string } {
  const at = headline.indexOf(', ');
  return at < 0 ? { lead: '', emphasis: headline } : { lead: headline.slice(0, at + 1), emphasis: headline.slice(at + 2) };
}

/**
 * An email's From: the brand's name before the address. Only the name comes
 * from the brand; the address is NOTIFY_EMAIL_FROM's (or Resend's test
 * sender), whatever name that variable carried.
 */
export function emailSender(from: string, brand: Pick<Brand, 'name'>): string {
  const address = /<([^<>]+)>\s*$/.exec(from)?.[1]?.trim() ?? from.trim();
  const name = /^[\w .'-]+$/.test(brand.name) ? brand.name : `"${brand.name.replace(/["\\]/g, '\\$&')}"`;
  return `${name} <${address}>`;
}
