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

/** Leaflet's module, once its stylesheet has loaded too. */
export async function loadLeaflet(): Promise<typeof import('leaflet')> {
  const [L] = await Promise.all([import('leaflet'), loadLeafletCss()]);
  return L;
}
