/**
 * A page's `<head>` tags, as Express writes them into `index.html`: the
 * title, description, canonical URL and the Open Graph / Twitter tags that
 * link previews (WhatsApp, Facebook, X) read, and the brand's JSON-LD. Pure
 * functions; `pages.ts` supplies the values.
 */
import { BRAND_ASSETS, type Brand } from '../../../shared/brand';
import { escapeHtml } from '../../../shared/html';
import type { TextSize } from '../../../shared/text-size';
import { isPalette, type Palette } from '../../../shared/palette';
import { NO_BUSINESS_DETAILS, type BusinessDetails } from '../../../shared/business';

export interface PageMeta {
  title: string;
  /** Trimmed to DESCRIPTION_MAX here. */
  description: string;
  /** The canonical path (`/destinations/ella`); null for pages that have none (the 404, the admin). */
  path: string | null;
  /** The share image as stored: absolute, or relative to the site. */
  image: string | null;
  /** The share image's alt text: the photo's own, where it has one (`photoAlt`). */
  imageAlt?: string;
  type: 'website' | 'article';
  /** Never indexed, whatever SITE_INDEXABLE says (the 404, the admin). */
  noindex?: boolean;
  /** The trail to this page, as its breadcrumbs show it: a BreadcrumbList (paths relative to the site). */
  breadcrumbs?: ReadonlyArray<{ name: string; path: string }>;
  /** What the page lists, in order: an ItemList. Names and links only: no ratings, no prices. */
  itemList?: ReadonlyArray<{ name: string; path: string }>;
}

/** schema.org's BreadcrumbList and ItemList for a page, with absolute URLs. */
export function pageJsonLd(meta: Pick<PageMeta, 'breadcrumbs' | 'itemList'>, origin: string): Record<string, unknown>[] {
  const url = (path: string) => `${origin}${path}`;
  const blocks: Record<string, unknown>[] = [];
  if (meta.breadcrumbs?.length) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: meta.breadcrumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, name: crumb.name, item: url(crumb.path) }))
    });
  }
  if (meta.itemList) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      numberOfItems: meta.itemList.length,
      itemListElement: meta.itemList.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: url(item.path) }))
    });
  }
  return blocks;
}

export interface HeadSite {
  /** `PUBLIC_SITE_URL`, or the request's origin when it isn't set. */
  origin: string;
  /** `SITE_INDEXABLE`: false puts noindex on every page. */
  indexable: boolean;
  /** `shared/brand.ts` with the admin's settings on top. */
  brand: Brand;
  /** The contact details and profiles really set in Admin → Settings (none: left out). */
  business?: BusinessDetails;
}

/**
 * JSON for a `<script type="application/ld+json">`: `<`, `>`, `&` and U+2028/9
 * as `\u` escapes, so no value can close the element. It is data, never run,
 * so the CSP's `script-src` doesn't apply to it.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
}

/** The logo search engines show: the brand's square PNG icon (they don't take SVG). */
export const SCHEMA_LOGO =
  BRAND_ASSETS.manifestIcons.find((icon) => icon.purpose === 'any' && icon.sizes === '512x512')?.src ?? BRAND_ASSETS.manifestIcons[0]?.src;

/**
 * The business as schema.org's TravelAgency: what search engines know it by. The name, logo and
 * area, then each contact detail and profile only when Admin → Settings really has it
 * (`shared/business.ts`: empty and placeholder settings are left out). Never a rating, review,
 * price or opening hours.
 */
export function brandJsonLd(brand: Brand, origin: string, business: BusinessDetails = NO_BUSINESS_DETAILS): Record<string, unknown> {
  const absolute = (path: string | null | undefined) => (path ? new URL(path, `${origin}/`).toString() : undefined);
  const logo = absolute(SCHEMA_LOGO);
  const image = absolute(brand.ogImage);
  const address = business.address
    ? {
        '@type': 'PostalAddress',
        streetAddress: business.address,
        // Only when the address itself says so.
        ...(/sri lanka/i.test(business.address) ? { addressCountry: 'LK' } : {})
      }
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: brand.name,
    ...(brand.shortName !== brand.name ? { alternateName: brand.shortName } : {}),
    legalName: brand.legalName,
    slogan: brand.tagline,
    url: `${origin}/`,
    ...(logo ? { logo } : {}),
    ...(image ? { image } : {}),
    ...(business.email ? { email: business.email } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(address ? { address } : {}),
    areaServed: { '@type': 'Country', name: 'Sri Lanka' },
    ...(business.profiles.length ? { sameAs: business.profiles } : {})
  };
}

/** About what search results and previews show before cutting off. */
export const DESCRIPTION_MAX = 160;

/** One line, at most `max` characters, cut at a word boundary with an ellipsis. */
export function summarise(text: string, max = DESCRIPTION_MAX): string {
  const line = text.replace(/\s+/g, ' ').trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max - 1);
  const atWord = cut.slice(0, Math.max(cut.lastIndexOf(' '), Math.floor(max / 2)));
  return `${atWord.replace(/[\s,.;:–—-]+$/, '')}…`;
}

export interface ShareImage {
  url: string;
  width?: number;
  height?: number;
}

/** The size link previews are drawn at (Facebook's recommendation, 1.91:1). */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/**
 * The image as an absolute https URL, or null when it can't be one (an
 * `http://` URL, or nothing usable). A relative path is resolved against the
 * site's origin. Unsplash images are asked for at the preview size, cropped,
 * as JPEG (which every previewer reads).
 */
export function shareImage(raw: string | null, origin: string): ShareImage | null {
  const value = raw?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value, `${origin}/`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  if (url.hostname === 'images.unsplash.com') {
    url.searchParams.delete('auto');
    url.searchParams.set('w', String(SHARE_IMAGE_SIZE.width));
    url.searchParams.set('h', String(SHARE_IMAGE_SIZE.height));
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('fm', 'jpg');
    url.searchParams.set('q', '80');
    return { url: url.toString(), ...SHARE_IMAGE_SIZE };
  }
  // The brand's default (public/brand/og-default.jpg) is made at exactly this size.
  if (value === BRAND_ASSETS.ogImage) return { url: url.toString(), ...SHARE_IMAGE_SIZE };
  return { url: url.toString() };
}

/** The tags, one per line, every value escaped for its context. */
export function renderHead(meta: PageMeta, site: HeadSite): string {
  const e = escapeHtml;
  const description = summarise(meta.description);
  const url = meta.path ? `${site.origin}${meta.path}` : null;
  const image = shareImage(meta.image ?? site.brand.ogImage, site.origin);
  // The photo's own alt text; the default share image is the brand's logo.
  const alt = meta.imageAlt ?? (meta.image ? meta.title : `${site.brand.name} logo`);

  const property = (name: string, content: string) => `<meta property="${name}" content="${e(content)}">`;
  const named = (name: string, content: string) => `<meta name="${name}" content="${e(content)}">`;

  const tags = [`<title>${e(meta.title)}</title>`, named('description', description), named('application-name', site.brand.name)];
  if (!site.indexable || meta.noindex) tags.push(named('robots', 'noindex'));
  if (url) tags.push(`<link rel="canonical" href="${e(url)}">`);

  tags.push(property('og:type', meta.type), property('og:site_name', site.brand.name), property('og:title', meta.title));
  tags.push(property('og:description', description));
  if (url) tags.push(property('og:url', url));
  if (image) {
    tags.push(property('og:image', image.url));
    if (image.width && image.height) {
      tags.push(property('og:image:width', String(image.width)), property('og:image:height', String(image.height)));
    }
    tags.push(property('og:image:alt', alt));
  }

  tags.push(named('twitter:card', image ? 'summary_large_image' : 'summary'));
  tags.push(named('twitter:title', meta.title), named('twitter:description', description));
  if (image) tags.push(named('twitter:image', image.url), named('twitter:image:alt', alt));
  tags.push(`<script type="application/ld+json">${jsonForScript(brandJsonLd(site.brand, site.origin, site.business))}</script>`);
  for (const block of pageJsonLd(meta, site.origin)) tags.push(`<script type="application/ld+json">${jsonForScript(block)}</script>`);

  return tags.join('\n    ');
}

const START = '<!--page-meta-->';
const END = '<!--/page-meta-->';

/**
 * `index.html` with its default title and description (between the
 * `page-meta` markers) replaced by `head`.
 */
/**
 * The admin's text size on <html>: an attribute the stylesheet turns into the
 * root font-size, so it arrives with the page (no flash) and is no inline style.
 */
export function injectTextSize(html: string, size: TextSize): string {
  return html.replace('<html', `<html data-text-size="${size}"`);
}

/**
 * The admin's colour theme on <html> (`site_settings.palette`, docs/plans/brand-themes.md):
 * like the text size, an attribute in the HTML itself, so the first paint is already in the
 * theme, with no script and nothing for the CSP. Only the saved value is ever written:
 * nothing in the request is read.
 */
export function injectPalette(html: string, palette: Palette): string {
  if (!isPalette(palette)) throw new Error(`Not a colour theme: ${String(palette)}`);
  return html.replace('<html', `<html data-palette="${palette}"`);
}

export function injectHead(template: string, head: string): string {
  const start = template.indexOf(START);
  const end = template.indexOf(END);
  if (start === -1 || end < start) {
    // An index.html without the markers still gets the tags, at the end of <head>.
    return template.replace('</head>', `    ${head}\n  </head>`);
  }
  return `${template.slice(0, start + START.length)}\n    ${head}\n    ${template.slice(end)}`;
}
