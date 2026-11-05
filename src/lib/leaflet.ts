/**
 * Leaflet, loaded only when a map is about to render: the JS as its own chunk
 * (dynamic import) and the stylesheet as its own same-origin file, from the
 * `leaflet` package.
 *
 * The `<link>` goes in front of the site's own stylesheet, so `index.css`'s map
 * rules still override Leaflet's. A CSS import would go after it, which is why
 * this asks Vite for the file's URL instead. The stylesheet's rules that name
 * Leaflet's PNGs never apply here: markers are `divIcon`s and there's no layers
 * control, so nothing requests them (`browser-csp` records it).
 */
import LEAFLET_CSS from 'leaflet/dist/leaflet.css?url';

let css: Promise<void> | null = null;

function loadLeafletCss(): Promise<void> {
  css ??= new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
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
