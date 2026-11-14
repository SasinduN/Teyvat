/**
 * Where images on the site may come from. One list, used twice:
 *
 *   - the Content-Security-Policy's `img-src` (server/src/security-headers.ts),
 *     which makes the browser refuse any other image host;
 *   - the admin API's image-field validation, so an admin can't save a URL
 *     the browser would then refuse to show.
 *
 * The R2 origin comes from R2_PUBLIC_BASE_URL at runtime. Two more, for moving
 * R2 to the client's Cloudflare account (docs/runbooks/move-r2-to-client.md):
 *
 *   - the new custom domain, always, so rows can be moved onto it while
 *     R2_PUBLIC_BASE_URL still names the old bucket, and moved back if needed;
 *   - the old base, from R2_PREVIOUS_PUBLIC_BASE_URL, while it's set: anything
 *     still on it keeps showing after R2_PUBLIC_BASE_URL changes. Removed once
 *     the move is verified.
 */
import { BRAND_ASSETS } from './brand';

/** The seeded content's photos. */
export const UNSPLASH_ORIGIN = 'https://images.unsplash.com';

/**
 * The map's tiles: exactly CARTO's bare host (no a–d subdomains since the
 * move to keyed tiles; a `*.` wildcard would not match it). In the CSP only;
 * not an image-field host.
 */
export { CARTO_TILES_ORIGIN as MAP_TILES_SOURCE } from './map-tiles';

/** R2's custom domain on the client's Cloudflare account: `images.` on the brand's domain. */
export const R2_CUSTOM_DOMAIN_ORIGIN = `https://images.${BRAND_ASSETS.emailDomain}`;

/**
 * Origins an image field may point at: Unsplash, R2's custom domain, our R2
 * bucket when uploads are set up, and the bucket before it during a move.
 */
export function allowedImageOrigins(r2PublicBaseUrl: string | null, previousR2BaseUrl: string | null = null): string[] {
  const origins = [UNSPLASH_ORIGIN, R2_CUSTOM_DOMAIN_ORIGIN];
  for (const base of [r2PublicBaseUrl, previousR2BaseUrl]) {
    if (!base) continue;
    const origin = new URL(base).origin;
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

export function isAllowedImageUrl(url: string, origins: readonly string[]): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && origins.includes(parsed.origin);
  } catch {
    return false;
  }
}

export const IMAGE_HOST_REFUSED = 'Images must come from the media library or Unsplash.';
