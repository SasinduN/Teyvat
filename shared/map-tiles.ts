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
export const OSM_TILE_URL = `${OSM_TILES_ORIGIN}/{z}/{x}/{y}.png`;
export const OSM_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

/** Use real, attributed map tiles even when a local CARTO key is absent. */
export function mapTileConfig(theme: 'light' | 'dark', key?: string | null) {
  if (!key?.trim()) return { url: OSM_TILE_URL, attribution: OSM_ATTRIBUTION };
  return {
    url: (theme === 'dark' ? cartoDarkUrl : cartoVoyagerUrl)(key),
    attribution: CARTO_ATTRIBUTION
  };
}

const VOYAGER_PATH = '/rastertiles/voyager/{z}/{x}/{y}{r}.png';
/** The dark theme's basemap: same host and key, so the CSP is unchanged. */
const DARK_PATH = '/rastertiles/dark_all/{z}/{x}/{y}{r}.png';

const withKey = (path: string, key: string | undefined | null): string => {
  const trimmed = key?.trim();
  return `${CARTO_TILES_ORIGIN}${path}${trimmed ? `?key=${encodeURIComponent(trimmed)}` : ''}`;
};

/**
 * The Voyager tile URL template, with the key when there is one. Without a
 * key the map still renders (markers and all) on watermark tiles, rather than
 * failing.
 */
export function cartoVoyagerUrl(key: string | undefined | null): string {
  return withKey(VOYAGER_PATH, key);
}

/** CARTO's dark basemap (`dark_all`), for the dark theme. */
export function cartoDarkUrl(key: string | undefined | null): string {
  return withKey(DARK_PATH, key);
}

/**
 * Required by the OpenStreetMap licence (ODbL) and CARTO's terms: credit both,
 * linked. Shown in Leaflet's attribution control.
 */
export const CARTO_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors ' +
  '© <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
