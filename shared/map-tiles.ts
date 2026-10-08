/**
 * The map's tiles: CARTO's Voyager basemap.
 *
 * CARTO now requires an API key; without one, every tile comes back as an
 * "API KEY REQUIRED" image with no map on it. The key is public by design
 * (it's in the page, like any tile key), and is protected by restricting it
 * to the site's domains in the CARTO dashboard, not by being secret.
 *
 * `{r}` is Leaflet's retina token: `@2x` on high-density screens. With the key
 * CARTO serves real 512 px tiles for it (checked when this was written);
 * keyless, `@2x` only ever returns the watermark.
 */

/** The one host tiles come from, for the CSP (`shared/image-hosts.ts`). */
export const CARTO_TILES_ORIGIN = 'https://basemaps.cartocdn.com';
export const OSM_TILES_ORIGIN = 'https://tile.openstreetmap.org';

const VOYAGER_PATH = '/rastertiles/voyager/{z}/{x}/{y}{r}.png';

/**
 * The Voyager tile URL template, with the key when there is one. Without a
 * key the map still renders (markers and all) on watermark tiles, rather than
 * failing.
 */
export function cartoVoyagerUrl(key: string | undefined | null): string {
  const trimmed = key?.trim();
  return `${CARTO_TILES_ORIGIN}${VOYAGER_PATH}${trimmed ? `?key=${encodeURIComponent(trimmed)}` : ''}`;
}

/** Human-viewed, browser-cached map tiles when a CARTO key is not configured. */
export function publicBasemap(key: string | undefined | null): { url: string; attribution: string } {
  return key?.trim() ? { url: cartoVoyagerUrl(key), attribution: CARTO_ATTRIBUTION } : {
    url: `${OSM_TILES_ORIGIN}/{z}/{x}/{y}.png`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
  };
}

/**
 * Required by the OpenStreetMap licence (ODbL) and CARTO's terms: credit both,
 * linked. Shown in Leaflet's attribution control.
 */
export const CARTO_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors ' +
  '© <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
