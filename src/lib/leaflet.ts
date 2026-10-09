/**
 * Leaflet, loaded only when a map is about to render: the JS as its own chunk
 * (dynamic import) and the stylesheet from unpkg, as `index.html` used to
 * load it on every page.
 *
 * The `<link>` goes in front of the site's own stylesheet, where it sat in
 * `index.html`, so `index.css`'s map rules still override Leaflet's. Same
 * URL and SRI hash as before, so the CSP (which already allows unpkg for
 * styles) is unchanged.
 */
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_CSS_SRI = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';

let css: Promise<void> | null = null;

function loadLeafletCss(): Promise<void> {
  css ??= new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    link.integrity = LEAFLET_CSS_SRI;
    link.crossOrigin = '';
    link.dataset.leaflet = '';
    // A failed stylesheet still lets the map start; it just looks unstyled.
    link.onload = link.onerror = () => resolve();
    const first = document.head.querySelector('link[rel="stylesheet"], style');
    document.head.insertBefore(link, first);
  });
  return css;
}

type Leaflet = typeof import('leaflet');

/** Leaflet's private tile bookkeeping, as 1.9.4 has it. */
interface TileEntry {
  el: HTMLImageElement;
  coords: { z: number };
}
interface TileLayerInternals {
  _tiles: Record<string, TileEntry>;
  _tileZoom: number;
  fire(type: string, data: object): void;
}

let tilesPatched = false;

/**
 * Leaflet cancels a tile it no longer wants (removed after a zoom or pan,
 * or still loading when the zoom changes again) by pointing its `src` at a
 * `data:` GIF. The CSP's `img-src` doesn't allow `data:`, so every zoom
 * reported blocked images. These two methods are 1.9.4's own, except that
 * the tile's `src` is removed instead, which also stops the request and is
 * no image load at all. (Leaflet is pinned; re-check these on an upgrade.)
 * `browser-csp.test.ts` zooms the map while it records.
 */
function blankTilesWithoutDataUrls(L: Leaflet): void {
  if (tilesPatched) return;
  tilesPatched = true;
  L.TileLayer.include({
    _abortLoading(this: TileLayerInternals) {
      for (const key in this._tiles) {
        const entry = this._tiles[key];
        if (entry.coords.z === this._tileZoom) continue;
        const tile = entry.el;
        tile.onload = L.Util.falseFn;
        tile.onerror = L.Util.falseFn;
        if (!tile.complete) {
          tile.removeAttribute('src');
          L.DomUtil.remove(tile);
          delete this._tiles[key];
          this.fire('tileabort', { tile, coords: entry.coords });
        }
      }
    },
    _removeTile(this: TileLayerInternals, key: string) {
      const entry = this._tiles[key];
      if (!entry) return;
      // No load or error event from the blanked tile, so no stray 'tileerror'.
      entry.el.onload = null;
      entry.el.onerror = null;
      entry.el.removeAttribute('src');
      return (L.GridLayer.prototype as unknown as { _removeTile(key: string): void })._removeTile.call(this, key);
    }
  });
}

/** Leaflet's module, once its stylesheet has loaded too. */
export async function loadLeaflet(): Promise<Leaflet> {
  const [L] = await Promise.all([import('leaflet'), loadLeafletCss()]);
  blankTilesWithoutDataUrls(L);
  return L;
}
