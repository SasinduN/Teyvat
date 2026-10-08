import { CARTO_ATTRIBUTION, cartoVoyagerUrl } from '@shared/map-tiles';

/**
 * The tile layer settings for the site's map. `VITE_CARTO_KEY` is inlined at
 * build time (Railway has it as a variable, so the deployed build gets it);
 * without it the map falls back to keyless, watermarked tiles.
 */
export const mapTiles = {
  url: cartoVoyagerUrl(import.meta.env.VITE_CARTO_KEY),
  attribution: CARTO_ATTRIBUTION
};
