// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Tour routes on the map, and the destination panel additions, on the real
 * built site in headless Chrome:
 *
 *   - "View route on map" scrolls to the map and draws the numbered stops in
 *     order with a dashed line, all in view and clear of the overlays, even
 *     when it was picked before the map had loaded;
 *   - the chip names the tour; ✕ and Escape restore the previous view and
 *     filter; choosing a filter leaves the route and applies the filter;
 *   - the Google Maps link carries the destination's coordinates (side
 *     panel, mobile card, modal); the airport time shows only when set.
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

/** Ella, the destination the map panel opens on. */
const ELLA = { lat: 6.8667, lng: 81.0466 };
const ELLA_MAPS = `https://www.google.com/maps/search/?api=1&query=${ELLA.lat},${ELLA.lng}`;

describe('tour routes and the destination panel, in Chrome', { skip }, () => {
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

  async function openPage(options: { mobile?: boolean } = {}): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: options.mobile ? 390 : 1280,
      height: options.mobile ? 844 : 900,
      deviceScaleFactor: 1,
      mobile: Boolean(options.mobile)
    });
    await page.send('Page.navigate', { url: `${app.baseUrl}/` });
    await waitFor(page, `document.querySelectorAll('#tours h3').length === 4`, 'the tour cards');
    return page;
  }

  async function openMap(page: Page): Promise<void> {
    await page.evaluate(`document.querySelector('#explore-map').scrollIntoView({ block: 'start' }), true`);
    await waitFor(page, `document.querySelectorAll('#explore-map .custom-leaflet-marker').length > 0`, 'the markers');
    await settle(page);
  }

  /** Waits until the map holds still: its zoom and marker positions stop changing. */
  async function settle(page: Page): Promise<void> {
    let last = '';
    for (let i = 0; i < 80; i += 1) {
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

  /** Clicks "View route on map" on the card titled `title`. */
  const viewRoute = (page: Page, title: string) =>
    page.evaluate(`(() => {
      const card = [...document.querySelectorAll('#tours h3')].find((h) => h.textContent.trim() === ${JSON.stringify(title)}).closest('.group');
      [...card.querySelectorAll('button')].find((b) => b.textContent.trim() === 'View route on map').click();
      return true;
    })()`);

  const clickFilter = (page: Page, label: string) =>
    page.evaluate(`[...document.querySelectorAll('#explore-map button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(label)})).click(), true`);

  const pressEscape = (page: Page) =>
    page.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })), true`);

  /** The category markers' screen positions, and the zoom: "the view". */
  const view = (page: Page) =>
    page.evaluate<{ zoom: string; markers: [number, number][] }>(`({
      zoom: document.querySelector('#explore-map .leaflet-container').dataset.zoom,
      markers: [...document.querySelectorAll('#explore-map .custom-leaflet-marker')].map((m) => { const r = m.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; })
    })`);

  function assertSameView(a: { zoom: string; markers: [number, number][] }, b: typeof a, what: string) {
    assert.equal(b.zoom, a.zoom, `${what}: zoom`);
    assert.equal(b.markers.length, a.markers.length, `${what}: marker count`);
    a.markers.forEach(([x, y], i) => {
      const [x2, y2] = b.markers[i];
      assert.ok(Math.abs(x - x2) <= 2 && Math.abs(y - y2) <= 2, `${what}: marker ${i} moved from ${x},${y} to ${x2},${y2}`);
    });
  }

  const routeState = (page: Page) =>
    page.evaluate<{ stops: string[]; chip: string | null; on: boolean; dash: string | null }>(`({
      stops: [...document.querySelectorAll('#explore-map .route-stop-marker')].map((m) => m.getAttribute('aria-label')),
      chip: document.querySelector('[data-route-chip]')?.textContent.trim() ?? null,
      on: document.querySelector('#explore-map .leaflet-container').classList.contains('map-route-on'),
      dash: document.querySelector('#explore-map path.route-line')?.getAttribute('stroke-dasharray') ?? null
    })`);

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('picked before the map loads: scrolls there and draws the numbered stops, in order, dashed, all in view', async () => {
    const page = await openPage();
    await page.evaluate(`document.querySelector('#tours').scrollIntoView(), true`);
    await sleep(500);
    assert.equal(
      await page.evaluate<boolean>(`Boolean(document.querySelector('#explore-map .leaflet-container'))`),
      false,
      'precondition: the map has not started'
    );

    await viewRoute(page, 'Wild Sri Lanka Expedition');
    await waitFor(page, `document.querySelectorAll('#explore-map .route-stop-marker').length === 4`, 'the route');
    await settle(page);

    const state = await routeState(page);
    assert.deepEqual(state.stops, ['Stop 1: Wilpattu', 'Stop 2: Sigiriya', 'Stop 3: Minneriya', 'Stop 4: Yala']);
    assert.equal(state.dash, '8 8', 'a dashed line');
    assert.equal(state.on, true);
    assert.match(state.chip ?? '', /Showing: Wild Sri Lanka Expedition/);

    // Every stop on the map, and none under the Map Guide or the chip.
    const placement = await page.evaluate<{ inMap: number; covered: string[] }>(`(() => {
      const box = document.querySelector('#explore-map .leaflet-container').getBoundingClientRect();
      const overlays = [...document.querySelectorAll('#explore-map [data-map-overlay]')].map((o) => o.getBoundingClientRect()).filter((r) => r.height > 0);
      const stops = [...document.querySelectorAll('#explore-map .route-stop-disc')];
      const centre = (s) => { const r = s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
      return {
        inMap: stops.filter((s) => { const [x, y] = centre(s); return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom; }).length,
        covered: stops.filter((s) => { const [x, y] = centre(s); return overlays.some((o) => x >= o.left && x <= o.right && y >= o.top && y <= o.bottom); }).map((s) => s.textContent)
      };
    })()`);
    assert.equal(placement.inMap, 4, 'all four stops in the map');
    assert.deepEqual(placement.covered, [], 'no stop under an overlay');

    // The category markers fade and leave the tab order.
    const faded = await page.evaluate<{ opacity: string; tabbable: number }>(`({
      opacity: getComputedStyle(document.querySelector('#explore-map .custom-leaflet-marker')).opacity,
      tabbable: [...document.querySelectorAll('#explore-map .custom-leaflet-marker')].filter((m) => m.getAttribute('tabindex') !== '-1').length
    })`);
    assert.equal(faded.opacity, '0.35');
    assert.equal(faded.tabbable, 0);
  });

  test('✕ and Escape go back to the view and filter from before the route', async () => {
    const page = await openPage();
    await openMap(page);
    await clickFilter(page, 'Beaches');
    await settle(page);
    const before = await view(page);
    assert.equal(before.markers.length, 6, 'precondition: the Beaches filter');

    for (const leave of ['Escape', '✕'] as const) {
      await page.evaluate(`document.querySelector('#tours').scrollIntoView(), true`);
      await viewRoute(page, 'Cultural Sri Lanka');
      await waitFor(page, `document.querySelectorAll('#explore-map .route-stop-marker').length === 4`, 'the route');
      await settle(page);

      if (leave === 'Escape') await pressEscape(page);
      else await page.evaluate(`document.querySelector('[aria-label="Clear route"]').click(), true`);
      await waitFor(page, `!document.querySelector('[data-route-chip]')`, 'the chip to go');
      await settle(page);

      const state = await routeState(page);
      assert.deepEqual([state.stops.length, state.on, state.dash], [0, false, null], `${leave}: route gone`);
      assertSameView(before, await view(page), leave);
    }
  });

  test('choosing a filter leaves the route and applies the filter, framed', async () => {
    const page = await openPage();
    await page.evaluate(`document.querySelector('#tours').scrollIntoView(), true`);
    await viewRoute(page, 'Island in 7 Days');
    await waitFor(page, `document.querySelectorAll('#explore-map .route-stop-marker').length === 6`, 'the route');
    await settle(page);

    await clickFilter(page, 'Culture');
    await waitFor(page, `!document.querySelector('[data-route-chip]')`, 'the chip to go');
    await settle(page);

    const state = await routeState(page);
    assert.deepEqual([state.stops.length, state.on], [0, false]);
    const inView = await page.evaluate<{ inside: number; total: number }>(`(() => {
      const box = document.querySelector('#explore-map .leaflet-container').getBoundingClientRect();
      const markers = [...document.querySelectorAll('#explore-map .custom-leaflet-marker')];
      return { total: markers.length, inside: markers.filter((m) => { const r = m.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom; }).length };
    })()`);
    const culture = await pool.query(`select count(*)::int as n from public.destinations where published and 'Culture' = any(category)`);
    assert.equal(inView.total, culture.rows[0].n, 'the Culture markers');
    assert.equal(inView.inside, inView.total, 'all of them in view');
  });

  test('the Google Maps link carries the coordinates: side panel and modal', async () => {
    const page = await openPage();
    await openMap(page);
    const panel = await page.evaluate<{ href: string; target: string; rel: string }>(`(() => {
      const a = document.querySelector('#explore-map .lg\\\\:flex [data-google-maps]');
      return { href: a.href, target: a.target, rel: a.rel };
    })()`);
    assert.deepEqual(panel, { href: ELLA_MAPS, target: '_blank', rel: 'noopener noreferrer' });

    await page.evaluate(`[...document.querySelectorAll('#explore-map button')].find((b) => b.textContent.trim() === 'Explore Ella').click(), true`);
    await waitFor(page, `document.querySelector('.fixed [data-google-maps]')`, 'the modal');
    assert.equal(await page.evaluate<string>(`document.querySelector('.fixed [data-google-maps]').href`), ELLA_MAPS);
  });

  test('the mobile card has the link too', async () => {
    const page = await openPage({ mobile: true });
    await openMap(page);
    const link = await page.evaluate<{ href: string; visible: boolean }>(`(() => {
      const a = document.querySelector('#explore-map .lg\\\\:hidden [data-google-maps]');
      return { href: a.href, visible: a.getBoundingClientRect().width > 0 };
    })()`);
    assert.deepEqual(link, { href: ELLA_MAPS, visible: true });
  });

  test('the airport travel time shows only when set', async () => {
    let page = await openPage();
    await openMap(page);
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-travel-time]').length`), 0, 'not set: no line');

    await pool.query(`update public.destinations set travel_time_from_airport = '~4 h' where id = 'ella'`);
    page = await openPage();
    await openMap(page);
    const lines = await page.evaluate<string[]>(
      `[...document.querySelectorAll('#explore-map [data-travel-time]')].map((e) => e.textContent.trim())`
    );
    assert.deepEqual(lines, ['~4 h from Colombo airport (CMB)', '~4 h from Colombo airport (CMB)'], 'side panel and mobile card');
  });
});
