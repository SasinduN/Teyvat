import type * as Leaflet from 'leaflet';
import { CARTO_ATTRIBUTION, cartoDarkUrl, cartoVoyagerUrl } from '@shared/map-tiles';
import { currentTheme, onThemeChange, type Theme } from '@/lib/theme';

/**
 * The tile layer settings for the site's maps. `VITE_CARTO_KEY` is inlined at
 * build time (Railway has it as a variable, so the deployed build gets it);
 * without it the map falls back to keyless, watermarked tiles.
 */
export const mapTiles = {
  url: (theme: Theme) => (theme === 'dark' ? cartoDarkUrl : cartoVoyagerUrl)(import.meta.env.VITE_CARTO_KEY),
  attribution: CARTO_ATTRIBUTION
};

/** Calls `listener` on each theme change for as long as `map` exists. */
export function onThemeChangeWhileMapped(map: Leaflet.Map, listener: (theme: Theme) => void): void {
  map.on('unload', onThemeChange(listener));
}

/**
 * Adds the CARTO tiles for the current theme to `map`, and swaps them in
 * place when the theme changes: same map, same view.
 */
export function addThemedTiles(L: typeof Leaflet, map: Leaflet.Map, options: Leaflet.TileLayerOptions = {}): void {
  const layer = L.tileLayer(mapTiles.url(currentTheme()), { ...options, attribution: mapTiles.attribution }).addTo(map);
  onThemeChangeWhileMapped(map, (theme) => layer.setUrl(mapTiles.url(theme)));
}
