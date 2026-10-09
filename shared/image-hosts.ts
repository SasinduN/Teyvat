/**
 * Where images on the site may come from. One list, used twice:
 *
 *   - the Content-Security-Policy's `img-src` (server/src/security-headers.ts),
 *     which makes the browser refuse any other image host;
 *   - the admin API's image-field validation, so an admin can't save a URL
 *     the browser would then refuse to show.
 *
 * The R2 origin comes from R2_PUBLIC_BASE_URL at runtime, so moving uploads
 * to a custom domain changes both without a code change.
 */

/** The seeded content's photos. */
export const UNSPLASH_ORIGIN = 'https://images.unsplash.com';
/**
 * Temporary: the credited Wikimedia Commons photos migration 0010 put in the
 * content tables. `npm run images:import` copies them into R2; once
 * production's rows no longer use this host, a follow-up PR removes it
 * (docs/plans/fix-pr11.md, PR B).
 */
export const WIKIMEDIA_ORIGIN = 'https://upload.wikimedia.org';

/**
 * The map's tiles: exactly CARTO's bare host (no a–d subdomains since the
 * move to keyed tiles; a `*.` wildcard would not match it). In the CSP only;
 * not an image-field host.
 */
export { CARTO_TILES_ORIGIN as MAP_TILES_SOURCE } from './map-tiles';

/** Origins an image field may point at: Unsplash, Wikimedia (for now), plus our R2 bucket when uploads are set up. */
export function allowedImageOrigins(r2PublicBaseUrl: string | null): string[] {
  const origins = [UNSPLASH_ORIGIN, WIKIMEDIA_ORIGIN];
  if (r2PublicBaseUrl) origins.push(new URL(r2PublicBaseUrl).origin);
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

export const IMAGE_HOST_REFUSED = 'Images must come from the media library, Unsplash or Wikimedia Commons.';
