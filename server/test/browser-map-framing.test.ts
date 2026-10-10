// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The /explore map's framing, in headless Chrome (split from browser-map,
 * which runs close to the per-file time limit):
 *
 *   - the first view shows the whole island, Point Pedro to Dondra Head;
 *   - at first and after each category filter, no marker sits under the Map
 *     Guide (the Key on phones), Quick Jump, the credit or the zoom buttons,
 *     or off the map, nor overlaps another marker, at 1920×870, 1280×800
 *     and 390×844, in both themes.
 *
 * (The selected marker and the Map Guide's count are in browser-map.)
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

describe('the map\'s framing, in Chrome', { skip }, () => {
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

  const clickFilter = (page: Page, label: string) =>
    page.evaluate(`[...document.querySelectorAll('#explore-map button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(label)})).click(), true`);

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

  const CATEGORIES = ['All', 'Beaches', 'Mountains', 'Culture', 'Wildlife', 'Adventure', 'Food', 'Hidden Gems'];
  const SIZES = [{ width: 1920, height: 870 }, { width: 1280, height: 800 }, { width: 390, height: 844 }];

  for (const size of SIZES) {
    for (const theme of ['light', 'dark'] as const) {
      test(`framing, ${size.width}×${size.height}, ${theme}: the whole island at first, and no marker under an overlay or another marker, at first and after each filter`, async () => {
        const page = await openMapAt(size, theme);
        await settle(page);

        // The first view: the whole island, the Jaffna peninsula (Point Pedro) to Dondra Head, west and east coasts.
        const view = (await page.evaluate<string>(`document.querySelector('#explore-map .leaflet-container').dataset.view`)).split(',').map(Number);
        const [west, south, east, north] = view;
        const places: Array<[string, number, number]> = [['Point Pedro', 9.835, 80.213], ['Dondra Head', 5.921, 80.59], ['Kalpitiya', 8.23, 79.76], ['Sangamankanda Point', 7.02, 81.88]];
        for (const [name, lat, lng] of places) {
          assert.ok(lat > south && lat < north && lng > west && lng < east, `${name} in the first view (${view.join(', ')})`);
        }

        assert.deepEqual(await markerClashes(page), [], 'the first view');
        for (const category of CATEGORIES) {
          await clickFilter(page, category);
          await settle(page);
          assert.deepEqual(await markerClashes(page), [], category);
        }
      });
    }
  }
});
