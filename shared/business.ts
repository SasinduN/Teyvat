/**
 * The business's contact details and links from Admin → Settings, with the
 * placeholders taken out: what the footer links to and what the TravelAgency
 * JSON-LD says (docs/reviews/seo-audit-2026-11.md, Q2 and Q6). A setting that
 * is empty or still a placeholder counts as not set, so nothing shows a link
 * that goes nowhere and search engines are never told something made up.
 */

/** Hosts that are never a real profile or page. */
const EXAMPLE_HOSTS = /(^|\.)(example\.(com|org|net)|example|test|invalid|localhost)$/i;

/**
 * An `https://` link to a real page, or undefined. A site's bare home page
 * (`https://www.instagram.com/`) is the placeholder an empty profile leaves, so
 * it counts as not set, like an empty value or an example host.
 */
export function realLink(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || EXAMPLE_HOSTS.test(url.hostname)) return undefined;
  if (url.pathname.replace(/\/+$/, '') === '' && !url.search && !url.hash) return undefined;
  return raw;
}

const mentionsPlaceholder = (value: string) => /placeholder/i.test(value);

/** A phone number, unless it's a placeholder: too few digits, or nothing but zeros after +94. */
export function realPhone(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw || mentionsPlaceholder(raw)) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 9) return undefined;
  const national = digits.startsWith('94') ? digits.slice(2) : digits;
  if (/^0*$/.test(national)) return undefined;
  return raw;
}

/** An email address, unless it's a placeholder or at an example domain. */
export function realEmail(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw || mentionsPlaceholder(raw)) return undefined;
  const match = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(raw);
  if (!match || EXAMPLE_HOSTS.test(match[1])) return undefined;
  return raw;
}

/** A postal address, unless it's the seed's "Placeholder address" (0026). */
export function realAddress(value: string | null | undefined): string | undefined {
  const raw = value?.replace(/\s+/g, ' ').trim();
  if (!raw || mentionsPlaceholder(raw)) return undefined;
  return raw;
}

/** The settings columns the business's details come from. */
export interface BusinessSettings {
  postal_address: string | null;
  phone: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
}

export const BUSINESS_COLUMNS = [
  'postal_address',
  'phone',
  'contact_email',
  'instagram_url',
  'facebook_url',
  'tiktok_url',
  'youtube_url'
] as const satisfies readonly (keyof BusinessSettings)[];

/** Only what's really set: each field is absent when its setting is empty or a placeholder. */
export interface BusinessDetails {
  address?: string;
  phone?: string;
  email?: string;
  /** The social profiles, in the footer's order. */
  profiles: string[];
}

export function businessDetails(row: Partial<BusinessSettings> | undefined): BusinessDetails {
  const profiles = [row?.instagram_url, row?.facebook_url, row?.tiktok_url, row?.youtube_url]
    .map(realLink)
    .filter((link): link is string => Boolean(link));
  return {
    ...(realAddress(row?.postal_address) ? { address: realAddress(row?.postal_address) } : {}),
    ...(realPhone(row?.phone) ? { phone: realPhone(row?.phone) } : {}),
    ...(realEmail(row?.contact_email) ? { email: realEmail(row?.contact_email) } : {}),
    profiles
  };
}

/** No details: what pages use when the settings can't be read. */
export const NO_BUSINESS_DETAILS: BusinessDetails = { profiles: [] };
