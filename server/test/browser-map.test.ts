// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The map on the real built site (on /explore since redesign PR 4 trimmed
 * the home page), in headless Chrome.
 *
 *   1. Leaflet stays out of every first load: the home page, which has no
 *      map, loads nothing of it; /explore fetches it as its own chunk once
 *      the page is up (the map is within LAZY_MARGIN of the fold there, so
 *      straight away: accepted on #23); then the map comes up with all its
 *      markers.
 *   3. Changing the category filter fits the map to that category's markers.
 *   4. Each marker's colour and icon come from its destination's FIRST
 *      category; the legend shows all seven.
 * Plus quick checks for 2 (touch: one finger isn't captured) and 5 (labels,
 * keyboard), the dark theme's zoom buttons, and Quick Jump's scrolling.
 * The framing (the whole island, nothing under an overlay) is in
 * browser-map-framing.
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { MAP_CATEGORY_STYLES, type MapCategory } from '../../src/lib/mapMarkers';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

/** "#2E6F6A" -> "rgb(46, 111, 106)", as getComputedStyle reports it. */
const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

describe('the map, in Chrome', { skip }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  async function waitFor(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
      await sleep(100);
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  /** The page, scrolled to the map, with the map up and its markers drawn. */
  async function openMap(options: { mobile?: boolean } = {}): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: options.mobile ? 390 : 1280,
      height: options.mobile ? 844 : 900,
      deviceScaleFactor: 1,
      mobile: Boolean(options.mobile)
    });
    if (options.mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.send('Page.navigate', { url: `${app.baseUrl}/explore` });
    await waitFor(page, `document.querySelector('#explore-map')`, 'the page');
    await page.evaluate(`document.querySelector('#explore-map').scrollIntoView({ block: 'start' }), true`);
    await waitFor(page, `document.querySelectorAll('#explore-map .leaflet-marker-icon').length > 0`, 'markers');
    return page;
  }

  /** Waits until the map has stopped moving (its zoom and marker positions hold still). */
  async function settle(page: Page): Promise<void> {
    let last = '';
    for (let i = 0; i < 60; i += 1) {
      const now = await page.evaluate<string>(`JSON.stringify([
        document.querySelector('#explore-map .leaflet-container')?.dataset.zoom,
        [...document.querySelectorAll('#explore-map .leaflet-marker-icon')].map((m) => { const r = m.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; })
      ])`);
      if (now === last) return;
      last = now;
      await sleep(250);
    }
    throw new Error('the map never settled');
  }

  /** Every marker's centre is inside the map's box. */
  const allMarkersInView = (page: Page) =>
    page.evaluate<{ inside: number; total: number; zoom: number }>(`(() => {
      const box = document.querySelector('#explore-map .leaflet-container').getBoundingClientRect();
      const markers = [...document.querySelectorAll('#explore-map .leaflet-marker-icon')];
      const inside = markers.filter((m) => {
        const r = m.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      }).length;
      return { inside, total: markers.length, zoom: Number(document.querySelector('#explore-map .leaflet-container').dataset.zoom) };
    })()`);

  const clickFilter = (page: Page, label: string) =>
    page.evaluate(`[...document.querySelectorAll('#explore-map button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(label)})).click(), true`);

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('1. Leaflet stays out of the first load: none on the home page, its own chunk on /explore; then all markers draw', async () => {
    const mapResources = `(() => {
      const e = performance.getEntriesByType('resource').map((r) => r.name);
      return {
        leaflet: e.some((n) => n.includes('/assets/leaflet') && n.endsWith('.js')),
        tiles: e.filter((n) => n.includes('basemaps.cartocdn.com')).length,
        map: Boolean(document.querySelector('#explore-map .leaflet-container')),
        preload: Boolean(document.querySelector('link[rel=modulepreload][href*="leaflet"]'))
      };
    })()`;

    // The home page: nothing of the map at page load, nor scrolled to the end.
    const home = await chrome.newPage();
    await home.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await home.send('Page.navigate', { url: `${app.baseUrl}/` });
    await waitFor(home, `document.readyState === 'complete' && document.querySelector('#discover')`, 'the home page');
    await sleep(2000);
    const atLoad = await home.evaluate<{ leaflet: boolean; tiles: number; map: boolean; preload: boolean }>(mapResources);
    assert.deepEqual(atLoad, { leaflet: false, tiles: 0, map: false, preload: false }, 'nothing of the map at page load');
    await home.evaluate('window.scrollTo(0, document.body.scrollHeight), true');
    await sleep(1000);
    assert.deepEqual(await home.evaluate(mapResources), atLoad, 'nor at the end of the page');

    // /explore: never preloaded with the page; fetched once the page's own code has run.
    const page = await chrome.newPage();
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: `${app.baseUrl}/explore` });
    await waitFor(page, `document.querySelector('#explore-map .leaflet-container')`, 'the map to start');
    await waitFor(page, `[...document.querySelectorAll('img.leaflet-tile')].some((t) => t.complete && t.naturalWidth > 0)`, 'tiles');
    const order = await page.evaluate<{ preload: boolean; leafletStart: number; pageEnd: number }>(`(async () => {
      const e = performance.getEntriesByType('resource');
      const leaflet = e.find((r) => r.name.includes('/assets/leaflet') && r.name.endsWith('.js'));
      const explore = e.find((r) => r.name.includes('/assets/ExplorePage') && r.name.endsWith('.js'));
      // The page as the server sends it (once loaded, Vite adds the dynamic import's own preload).
      const html = await fetch('/explore').then((r) => r.text());
      return {
        preload: /<link[^>]+modulepreload[^>]+leaflet/.test(html),
        leafletStart: leaflet ? leaflet.startTime : -1,
        pageEnd: explore ? explore.responseEnd : Infinity
      };
    })()`);
    assert.equal(order.preload, false, 'Leaflet is not preloaded with the page');
    assert.ok(order.leafletStart >= order.pageEnd, `Leaflet fetched after the page's own chunk (${order.leafletStart} >= ${order.pageEnd})`);

    // The bug this replaced: markers only appeared after a filter was clicked.
    await waitFor(page, `document.querySelectorAll('#explore-map .leaflet-marker-icon').length === 20`, 'all 20 markers without any interaction');
  });

  test('3. a new category filter fits the map to its markers (max zoom 9); "All" fits all 20', async () => {
    const page = await openMap();
    await settle(page);

    // Zoom in first, so markers are off-screen and the filter has to move the
    // map to show them (at the starting zoom the whole island is in view, and
    // "all in view" would prove nothing).
    const zoomIn = async (times: number) => {
      for (let i = 0; i < times; i += 1) {
        await page.evaluate(`document.querySelector('#explore-map .leaflet-control-zoom-in').click(), true`);
        await settle(page);
      }
    };
    await zoomIn(3);
    let view = await allMarkersInView(page);
    assert.ok(view.inside < view.total, `precondition: some markers off-screen (${view.inside}/${view.total})`);

    await clickFilter(page, 'Beaches');
    await settle(page);
    view = await allMarkersInView(page);
    assert.equal(view.total, 6, 'the Beaches markers');
    assert.equal(view.inside, view.total, `${view.inside}/${view.total} Beaches markers in view`);
    assert.ok(view.zoom <= 9, `zoom ${view.zoom}`);

    // And back out: zoom in again, then "All" must frame all 20.
    await zoomIn(3);
    assert.ok((await allMarkersInView(page)).inside < 6, 'precondition: Beaches markers off-screen again');
    await clickFilter(page, 'All');
    await settle(page);
    view = await allMarkersInView(page);
    assert.equal(view.total, 20);
    assert.equal(view.inside, 20, `${view.inside}/20 markers in view`);
    assert.ok(view.zoom <= 9, `zoom ${view.zoom}`);
  });

  test("4. each marker's colour and icon come from its FIRST category; the legend shows all seven", async () => {
    const page = await openMap();
    const content = await (await fetch(`${app.baseUrl}/api/content`)).json() as {
      destinations: Array<{ name: string; category: string[] }>;
    };
    const firstCategory = new Map(content.destinations.map((d) => [d.name, d.category[0] as MapCategory]));

    const markers = await page.evaluate<Array<{ name: string; category: string; background: string }>>(`
      [...document.querySelectorAll('#explore-map .leaflet-marker-icon')].map((m) => ({
        name: m.getAttribute('aria-label'),
        category: m.querySelector('.map-marker').dataset.category,
        background: getComputedStyle(m.querySelector('.map-marker-disc')).backgroundColor
      }))`);
    assert.equal(markers.length, 20);
    for (const m of markers) {
      const expected = firstCategory.get(m.name);
      assert.ok(expected, `unknown marker ${m.name}`);
      assert.equal(m.category, expected, m.name);
      assert.equal(m.background, rgb(MAP_CATEGORY_STYLES[expected].color), `${m.name} colour`);
    }
    // Ella is listed Mountains, Adventure, Hidden Gems: Mountains it is.
    assert.equal(markers.find((m) => m.name === 'Ella')?.category, 'Mountains');

    const legend = await page.evaluate<Array<{ name: string; background: string }>>(`
      [...document.querySelectorAll('#explore-map [data-legend]')].map((li) => ({
        name: li.dataset.legend,
        background: getComputedStyle(li.querySelector('span')).backgroundColor
      }))`);
    assert.deepEqual(
      legend,
      (Object.keys(MAP_CATEGORY_STYLES) as MapCategory[]).map((name) => ({ name, background: rgb(MAP_CATEGORY_STYLES[name].color) }))
    );
  });

  test('5. names: hidden by default, shown for the active marker and at zoom 9+; markers are keyboard buttons', async () => {
    const page = await openMap();
    await settle(page);
    const labels = await page.evaluate<Array<{ name: string; active: boolean; opacity: string; tabIndex: number; role: string | null }>>(`
      [...document.querySelectorAll('#explore-map .leaflet-marker-icon')].map((m) => ({
        name: m.getAttribute('aria-label'),
        active: m.querySelector('.map-marker').classList.contains('is-active'),
        opacity: getComputedStyle(m.querySelector('.map-marker-label')).opacity,
        tabIndex: m.tabIndex,
        role: m.getAttribute('role')
      }))`);
    for (const l of labels) {
      assert.equal(l.tabIndex, 0, `${l.name} reachable with Tab`);
      assert.equal(l.role, 'button', l.name);
      assert.equal(l.opacity, l.active ? '1' : '0', `${l.name} label (active: ${l.active})`);
    }
    assert.equal(labels.filter((l) => l.active).map((l) => l.name).join(), 'Ella');

    for (let i = 0; i < 2; i += 1) {
      await page.evaluate(`document.querySelector('#explore-map .leaflet-control-zoom-in').click(), true`);
      await settle(page);
    }
    const zoomedOpacities = await page.evaluate<string[]>(
      `[...document.querySelectorAll('#explore-map .map-marker-label')].map((l) => getComputedStyle(l).opacity)`
    );
    assert.ok(zoomedOpacities.every((o) => o === '1'), 'every name shows at zoom 9+');
  });

  test('4. phones: a Key button opens the legend (all seven), Escape and a tap outside close it', async () => {
    const page = await openMap({ mobile: true });
    const key = `[...document.querySelectorAll('#explore-map button')].find((b) => b.textContent.trim() === 'Key')`;
    const state = () =>
      page.evaluate<{ visible: boolean; expanded: string | null; entries: string[] }>(`(() => {
        const button = ${key};
        const r = button.getBoundingClientRect();
        return {
          visible: r.width > 0 && r.height > 0,
          expanded: button.getAttribute('aria-expanded'),
          entries: [...document.querySelectorAll('#map-key-legend [data-legend]')].map((li) => li.dataset.legend)
        };
      })()`);

    assert.deepEqual(await state(), { visible: true, expanded: 'false', entries: [] }, 'closed at first');

    await page.evaluate(`(${key}).click(), true`);
    await sleep(150);
    assert.deepEqual(await state(), { visible: true, expanded: 'true', entries: Object.keys(MAP_CATEGORY_STYLES) });

    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(150);
    assert.equal((await state()).expanded, 'false', 'Escape closes it');

    await page.evaluate(`(${key}).click(), true`);
    await sleep(150);
    await page.evaluate(`document.querySelector('#explore-map h2').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), true`);
    await sleep(150);
    assert.equal((await state()).expanded, 'false', 'a tap outside closes it');
  });

  test('4. desktop: no Key button (the Map Guide shows the legend instead)', async () => {
    const page = await openMap();
    const visible = await page.evaluate<boolean>(`(() => {
      const button = [...document.querySelectorAll('#explore-map button')].find((b) => b.textContent.trim() === 'Key');
      if (!button) return false;
      const r = button.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })()`);
    assert.equal(visible, false);
  });

  /** /explore at `size` in `theme`, without motion (fits land at once), scrolled to the map, its markers drawn. */
  async function openMapAt(size: { width: number; height: number }, theme: 'light' | 'dark'): Promise<Page> {
    const mobile = size.width < 640;
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { ...size, deviceScaleFactor: 1, mobile });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
    if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.send('Page.navigate', { url: `${app.baseUrl}/explore` });
    await waitFor(page, `document.querySelector('#explore-map') && document.documentElement.dataset.theme === ${JSON.stringify(theme)}`, 'the page');
    await page.evaluate(`document.querySelector('#explore-map .leaflet-container, #explore-map [data-keep-clear]').scrollIntoView({ block: 'center' }), true`);
    await waitFor(page, `document.querySelectorAll('#explore-map .leaflet-marker-icon').length > 0 && document.querySelector('#explore-map .leaflet-container').dataset.view`, 'markers');
    return page;
  }

  /**
   * Everything that could hide a marker, against every marker as drawn (its
   * disc, scaled when active): the Map Guide (the Key on phones), Quick Jump,
   * the credit and the zoom buttons; the map's own edges; other markers; and
   * the active marker's name.
   */
  const markerClashes = (page: Page) =>
    page.evaluate<string[]>(`(() => {
      const map = document.querySelector('#explore-map .leaflet-container');
      const area = map.parentElement;
      const box = (el) => el.getBoundingClientRect();
      const shown = (el) => { const r = box(el); return r.width > 0 && r.height > 0; };
      const overlays = [
        ...[...area.querySelectorAll('[data-map-overlay]')].filter(shown).map((el) => [el.textContent.includes('Map Guide') ? 'the Map Guide' : 'the Key', box(el)]),
        ['Quick Jump', box(area.querySelector('[data-keep-clear]'))],
        ['the credit', box(map.querySelector('.leaflet-control-attribution'))],
        ['the zoom buttons', box(map.querySelector('.leaflet-control-zoom'))]
      ];
      const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const markers = [...map.querySelectorAll('.leaflet-marker-icon')].map((m) => ({
        name: m.getAttribute('aria-label'),
        disc: box(m.querySelector('.map-marker-disc')),
        label: m.querySelector('.map-marker.is-active') ? box(m.querySelector('.map-marker-label')) : null
      }));
      const frame = box(map);
      const out = [];
      for (const m of markers) {
        for (const [what, r] of overlays) if (overlap(m.disc, r)) out.push(m.name + ' under ' + what);
        if (m.disc.left < frame.left || m.disc.right > frame.right || m.disc.top < frame.top || m.disc.bottom > frame.bottom) out.push(m.name + ' off the map');
        for (const n of markers) {
          if (n === m) continue;
          // Discs are round: overlapping when their centres are closer than their radii.
          const d = Math.hypot((m.disc.left + m.disc.right - n.disc.left - n.disc.right) / 2, (m.disc.top + m.disc.bottom - n.disc.top - n.disc.bottom) / 2);
          if (m.name < n.name && d < (m.disc.width + n.disc.width) / 2) out.push(m.name + ' overlaps ' + n.name);
          if (m.label && overlap(m.label, n.disc)) out.push(m.name + "'s name hides " + n.name);
        }
      }
      return out;
    })()`);

  test('the selected marker hides no neighbour: picking each place in turn, nothing overlaps it or sits under its name', async () => {
    const page = await openMapAt({ width: 1280, height: 800 }, 'light');
    await settle(page);
    const names = await page.evaluate<string[]>(`[...document.querySelectorAll('#explore-map [data-keep-clear] button')].map((b) => b.textContent.trim())`);
    assert.equal(names.length, 20);
    for (const name of names) {
      await page.evaluate(`[...document.querySelectorAll('#explore-map [data-keep-clear] button')].find((b) => b.textContent.trim() === ${JSON.stringify(name)}).click(), true`);
      await settle(page);
      const clashes = (await markerClashes(page)).filter((c) => c.includes(name));
      // Picking flies in (the view is the visitor's now), so only clashes with markers count.
      assert.deepEqual(clashes.filter((c) => !c.includes(' under ') && !c.includes(' off the map')), [], name);
    }
  });

  test('the Map Guide counts exactly the published destinations: one marker each', async () => {
    const page = await openMapAt({ width: 1280, height: 800 }, 'light');
    const content = await (await fetch(`${app.baseUrl}/api/content`)).json() as { destinations: Array<{ id: string }> };
    const shown = await page.evaluate<{ count: number; markers: number }>(`({
      count: Number([...document.querySelectorAll('#explore-map [data-map-overlay] strong')][0].textContent),
      markers: document.querySelectorAll('#explore-map .leaflet-marker-icon').length
    })`);
    assert.deepEqual(shown, { count: content.destinations.length, markers: content.destinations.length });

    // Unpublishing one takes it off the map, and the count says so.
    await pool.query(`update public.destinations set published = false where id = 'galle'`);
    try {
      const fewer = await openMapAt({ width: 1280, height: 800 }, 'light');
      await waitFor(fewer, `document.querySelectorAll('#explore-map .leaflet-marker-icon').length === ${content.destinations.length - 1}`, 'one marker fewer');
      const label = await fewer.evaluate<string>(`[...document.querySelectorAll('#explore-map [data-map-overlay] strong')][0].textContent`);
      assert.equal(Number(label), content.destinations.length - 1);
    } finally {
      await pool.query(`update public.destinations set published = true where id = 'galle'`);
    }
  });

  test('dark: the zoom buttons are dark glass with light icons (AA on any backdrop) and show the focus ring', async () => {
    const page = await openMapAt({ width: 1280, height: 800 }, 'dark');
    const buttons = await page.evaluate<Array<{ label: string; ratio: number; background: number }>>(`(() => {
      const probe = document.createElement('canvas').getContext('2d');
      const rgba = (css) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = css; probe.fillRect(0, 0, 1, 1); const d = probe.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
      const lum = ([r, g, b]) => { const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3]));
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
      return [...document.querySelectorAll('#explore-map .leaflet-control-zoom a')].map((a) => {
        const s = getComputedStyle(a), fg = rgba(s.color), bg = rgba(s.backgroundColor);
        // The glass over the brightest and the darkest tile.
        const worst = Math.min(...[[255, 255, 255], [0, 0, 0]].map((tile) => ratio(over(fg, over(bg, tile)), over(bg, tile))));
        return { label: a.getAttribute('aria-label'), ratio: Math.round(worst * 100) / 100, background: Math.round(lum(over(bg, [255, 255, 255])) * 100) / 100 };
      });
    })()`);
    assert.equal(buttons.length, 2);
    for (const b of buttons) {
      assert.ok(b.ratio >= 4.5, `${b.label}: ${b.ratio}:1`);
      assert.ok(b.background < 0.1, `${b.label}: a dark background (luminance ${b.background} even over white)`);
    }

    // Tab from the last Quick Jump place reaches the zoom buttons; the focused one shows the ring.
    await page.evaluate(`document.querySelector('#explore-map .leaflet-control-zoom-in').focus(), true`);
    const ring = await page.evaluate<{ focused: boolean; style: string; width: number }>(`(() => {
      const a = document.querySelector('#explore-map .leaflet-control-zoom-in'), s = getComputedStyle(a);
      return { focused: a.matches(':focus-visible'), style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    })()`);
    assert.ok(ring.focused, 'precondition: keyboard-style focus');
    assert.ok(ring.style !== 'none' && ring.width >= 2, `the focus ring: ${ring.style} ${ring.width}px`);
  });

  test('Quick Jump: no scrollbar, still scrolls (trackpad and keyboard), and fades only at an end with more past it', async () => {
    const page = await openMapAt({ width: 1280, height: 800 }, 'dark');
    const row = `document.querySelector('#explore-map .te-quick-jump')`;
    const state = () =>
      page.evaluate<{ scrollbar: number; overflow: boolean; left: number; before: string; after: string; mask: string }>(`(() => {
        const r = ${row}, s = getComputedStyle(r);
        return {
          scrollbar: r.offsetHeight - r.clientHeight,
          overflow: r.scrollWidth > r.clientWidth,
          left: Math.round(r.scrollLeft),
          before: r.dataset.moreBefore,
          after: r.dataset.moreAfter,
          mask: s.maskImage || s.webkitMaskImage
        };
      })()`);

    let now = await state();
    assert.ok(now.overflow, 'precondition: more places than fit');
    assert.equal(now.scrollbar, 0, 'no scrollbar takes space');
    assert.equal(await page.evaluate<string>(`getComputedStyle(${row}).scrollbarWidth`), 'none', 'no scrollbar is drawn');
    assert.deepEqual([now.before, now.after], ['false', 'true'], 'at the start: more after it only');
    assert.match(now.mask, /gradient/, 'the end with more fades');

    // A trackpad's sideways swipe scrolls it.
    const r = await page.evaluate<{ x: number; y: number }>(`(() => { const b = ${row}.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: r.x, y: r.y, deltaX: 400, deltaY: 0 });
    await waitFor(page, `${row}.scrollLeft > 0`, 'a sideways scroll');
    await waitFor(page, `${row}.dataset.moreBefore === 'true'`, 'the start to fade once scrolled');

    // Tab reaches the last place, and it scrolls into view clear of the fade.
    await page.evaluate(`[...${row}.querySelectorAll('button')].at(-1).focus(), true`);
    await waitFor(page, `${row}.dataset.moreAfter === 'false'`, 'the end reached');
    now = await state();
    assert.deepEqual([now.before, now.after], ['true', 'false'], 'at the end: more before it only');
    const last = await page.evaluate<{ inside: boolean }>(`(() => {
      const r = ${row}.getBoundingClientRect(), b = [...${row}.querySelectorAll('button')].at(-1).getBoundingClientRect();
      return { inside: b.left >= r.left && b.right <= r.right };
    })()`);
    assert.ok(last.inside, 'the focused place is wholly in view');
  });

  test('2. touch: one finger is left to the page; the map takes two', async () => {
    const page = await openMap({ mobile: true });
    const classes = await page.evaluate<string>(`document.querySelector('#explore-map .leaflet-container').className`);
    assert.ok(!classes.includes('leaflet-touch-drag'), 'one-finger dragging is off');
    assert.ok(classes.includes('leaflet-touch-zoom'), 'two-finger pinch (which also pans) is on');
  });
});
