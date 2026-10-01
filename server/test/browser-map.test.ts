// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The map on the real built site, in headless Chrome.
 *
 *   1. Lazy start: nothing of Leaflet or the tiles loads until the map nears
 *      the viewport; then the map comes up with all its markers.
 *   3. Changing the category filter fits the map to that category's markers.
 *   4. Each marker's colour and icon come from its destination's FIRST
 *      category; the legend shows all seven.
 * Plus quick checks for 2 (touch: one finger isn't captured) and 5 (labels,
 * keyboard).
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
    await page.send('Page.navigate', { url: `${app.baseUrl}/` });
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

  test('1. Leaflet and the tiles load only when the map nears the viewport; then all markers draw', async () => {
    const page = await chrome.newPage();
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: `${app.baseUrl}/` });
    await waitFor(page, `document.readyState === 'complete' && document.querySelector('#explore-map')`, 'the page');
    await sleep(2000);

    const atLoad = await page.evaluate<{ leaflet: boolean; tiles: number; map: boolean; preload: boolean }>(`(() => {
      const e = performance.getEntriesByType('resource').map((r) => r.name);
      return {
        leaflet: e.some((n) => n.includes('/assets/leaflet') && n.endsWith('.js')),
        tiles: e.filter((n) => n.includes('basemaps.cartocdn.com')).length,
        map: Boolean(document.querySelector('#explore-map .leaflet-container')),
        preload: Boolean(document.querySelector('link[rel=modulepreload][href*="leaflet"]'))
      };
    })()`);
    assert.deepEqual(atLoad, { leaflet: false, tiles: 0, map: false, preload: false }, 'nothing of the map at page load');

    await page.evaluate(`document.querySelector('#explore-map').scrollIntoView({ block: 'start' }), true`);
    await waitFor(page, `document.querySelector('#explore-map .leaflet-container')`, 'the map to start');
    await waitFor(page, `[...document.querySelectorAll('img.leaflet-tile')].some((t) => t.complete && t.naturalWidth > 0)`, 'tiles');

    const loaded = await page.evaluate<boolean>(
      `performance.getEntriesByType('resource').some((r) => r.name.includes('/assets/leaflet') && r.name.endsWith('.js'))`
    );
    assert.ok(loaded, 'Leaflet loaded once the map neared the viewport');

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

  test('2. touch: one finger is left to the page; the map takes two', async () => {
    const page = await openMap({ mobile: true });
    const classes = await page.evaluate<string>(`document.querySelector('#explore-map .leaflet-container').className`);
    assert.ok(!classes.includes('leaflet-touch-drag'), 'one-finger dragging is off');
    assert.ok(classes.includes('leaflet-touch-zoom'), 'two-finger pinch (which also pans) is on');
  });
});
