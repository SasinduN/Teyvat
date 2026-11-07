// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The light and dark themes (docs/plans/redesign-redo.md, PR 5), in Chrome:
 *
 *   - before the first paint, with no inline script: on every page type,
 *     `<html data-theme>` is already right when the document is parsed
 *     (readyState "interactive", before any deferred script or React), for
 *     each saved choice and each system setting: the saved choice, else
 *     light (the friend import's default);
 *   - the toggle: labelled "Switch to dark/light theme", saves the choice
 *     (`site:theme`), which a reload keeps;
 *   - with nothing saved the theme stays light as the system changes, and
 *     neither follows it;
 *   - with storage blocked, light, and no errors;
 *   - the map: light tiles and the same tile tint in both themes, without
 *     replacing the map or reloading its tiles when the theme changes.
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

const PAGES = [
  '/', '/explore', '/plan', '/when-to-go', '/journal', '/destinations', '/destinations/ella', '/experiences',
  '/experiences/safari-yala', '/tours', '/tours/island-in-7-days', '/journal/ultimate-ella-guide',
  '/about', '/photo-credits', '/wishlist', '/unsubscribe', '/nope', '/admin'
];

/** Runs before anything on each new document: records the theme once parsing ends, and any error. */
const RECORDER = `
  window.__errors = [];
  addEventListener('error', (e) => window.__errors.push(String(e.message)));
  addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive' && !('__parsedTheme' in window)) {
      window.__parsedTheme = document.documentElement.dataset.theme || 'unset';
      window.__parsedScheme = document.documentElement.style.colorScheme || 'unset';
    }
  });
`;

/** Makes localStorage throw, as a browser that blocks storage does. */
const BLOCK_STORAGE = `Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });`;

// `--test-timeout` (60 s) applies to a suite as a whole too; each test keeps the 60 s limit.
describe('the light and dark themes, in Chrome', { skip, timeout: 8 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;

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

  async function poll(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  /** A tab with the system theme `system`, the recorder, and optionally blocked storage. */
  async function newTab(system: 'light' | 'dark', options: { blockStorage?: boolean } = {}): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await setSystem(page, system);
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: (options.blockStorage ? BLOCK_STORAGE : '') + RECORDER });
    return page;
  }

  const setSystem = (page: Page, system: 'light' | 'dark') =>
    page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: system }] });

  async function open(page: Page, path: string): Promise<void> {
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await poll(page, `'__parsedTheme' in window && document.readyState === 'complete'`, `${path} parsed`);
  }

  /** Saves (or clears) the visitor's choice for the site's origin. */
  async function save(page: Page, choice: 'light' | 'dark' | null): Promise<void> {
    await page.send('Page.navigate', { url: `${app.baseUrl}/robots.txt` });
    await poll(page, `document.readyState === 'complete'`, 'the origin');
    await page.evaluate(choice ? `localStorage.setItem('site:theme', '${choice}'), true` : `localStorage.removeItem('site:theme'), true`);
  }

  for (const choice of [null, 'light', 'dark'] as const) {
    for (const system of ['light', 'dark'] as const) {
      const want = choice ?? 'light';
      test(`saved ${choice ?? 'nothing'}, system ${system}: every page parses already ${want}`, async () => {
        const page = await newTab(system);
        await save(page, choice);
        const wrong: string[] = [];
        for (const path of PAGES) {
          await open(page, path);
          const at = await page.evaluate<{ theme: string; scheme: string }>(`({ theme: window.__parsedTheme, scheme: window.__parsedScheme })`);
          if (at.theme !== want || at.scheme !== want) wrong.push(`${path}: ${at.theme} / color-scheme ${at.scheme}`);
        }
        assert.deepEqual(wrong, [], `expected ${want} at parse time`);
        assert.deepEqual(await page.evaluate<string[]>('window.__errors'), [], 'no errors');
      });
    }
  }

  test('the toggle switches, says what it will do, and its choice outlasts a reload', async () => {
    const page = await newTab('light');
    await save(page, null);
    await open(page, '/tours');
    const toggle = `document.querySelector('header .sm\\\\:flex [data-theme-toggle]')`;
    await poll(page, toggle, 'the toggle');
    assert.equal(await page.evaluate<string>(`${toggle}.getAttribute('aria-label')`), 'Switch to dark theme');

    await page.evaluate(`${toggle}.click(), true`);
    await poll(page, `document.documentElement.dataset.theme === 'dark'`, 'the dark theme');
    assert.equal(await page.evaluate<string>(`localStorage.getItem('site:theme')`), 'dark', 'the choice is saved');
    assert.equal(await page.evaluate<string>(`${toggle}.getAttribute('aria-label')`), 'Switch to light theme');
    assert.equal(await page.evaluate<string>(`getComputedStyle(document.body).colorScheme || getComputedStyle(document.documentElement).colorScheme`), 'dark');

    await open(page, '/tours');
    assert.equal(await page.evaluate<string>('window.__parsedTheme'), 'dark', 'dark from the first paint after a reload');
    // The system turning light doesn't override a saved choice.
    await setSystem(page, 'light');
    await sleep(300);
    assert.equal(await page.evaluate<string>('document.documentElement.dataset.theme'), 'dark');
  });

  test('with nothing saved, the theme stays light while the system changes', async () => {
    const page = await newTab('dark');
    await save(page, null);
    await open(page, '/about');
    assert.equal(await page.evaluate<string>('document.documentElement.dataset.theme'), 'light', 'light, though the system is dark');
    await setSystem(page, 'light');
    await setSystem(page, 'dark');
    await sleep(300);
    assert.equal(await page.evaluate<string>('document.documentElement.dataset.theme'), 'light', 'still light');
  });

  test('with storage blocked: light, a working toggle, and no errors', async () => {
    const page = await newTab('dark', { blockStorage: true });
    await open(page, '/');
    assert.equal(await page.evaluate<string>('window.__parsedTheme'), 'light', 'light, as with nothing saved');
    const toggle = `document.querySelector('header .sm\\\\:flex [data-theme-toggle]')`;
    await poll(page, toggle, 'the toggle');
    await page.evaluate(`${toggle}.click(), true`);
    await poll(page, `document.documentElement.dataset.theme === 'dark'`, 'dark for this page');
    assert.deepEqual(await page.evaluate<string[]>('window.__errors'), [], 'no errors');
  });

  test('the map stays light and retains its tiles when the site theme changes', async () => {
    const page = await newTab('dark');
    await save(page, 'dark');
    await open(page, '/explore');
    await poll(page, `document.querySelector('#explore-map')`, 'the map section');
    await page.evaluate(`document.querySelector('#explore-map').scrollIntoView(), true`);
    await poll(page, `document.querySelectorAll('#explore-map img.leaflet-tile').length > 0`, 'tiles');
    const keyed = Boolean(process.env.VITE_CARTO_KEY?.trim());
    const tilesMatch = () => `[...document.querySelectorAll('#explore-map img.leaflet-tile')].every((t) => {
      const url = new URL(t.src);
      return ${keyed} ? url.origin === 'https://basemaps.cartocdn.com' && url.pathname.includes('/voyager/')
        : url.origin === 'https://tile.openstreetmap.org' && /^\\/\\d+\\/\\d+\\/\\d+\\.png$/.test(url.pathname);
    })`;
    assert.equal(await page.evaluate<boolean>(tilesMatch()), true, 'dark site theme still uses the light basemap');
    const tileState = () => page.evaluate<{ sources: string[]; filter: string }>(`({sources: [...document.querySelectorAll('#explore-map img.leaflet-tile')].map(t => t.src).sort(), filter: getComputedStyle(document.querySelector('#explore-map .leaflet-tile-pane')).filter})`);
    const initialTiles = await tileState();

    await page.evaluate(`document.querySelector('#explore-map .leaflet-container').__sameMap = true, true`);
    await page.evaluate(`document.querySelector('header .sm\\\\:flex [data-theme-toggle]').click(), true`);
    await poll(page, `document.documentElement.dataset.theme === 'light' && (${tilesMatch()})`, 'light theme tiles');
    assert.equal(await page.evaluate<boolean>(`document.querySelector('#explore-map .leaflet-container').__sameMap === true`), true, 'the same map, not a new one');
    assert.deepEqual(await tileState(), initialTiles, 'light site theme preserves tile sources and tint');
    await page.evaluate(`document.querySelector('header .sm\\\\:flex [data-theme-toggle]').click(), true`);
    await poll(page, `document.documentElement.dataset.theme === 'dark' && (${tilesMatch()})`, 'dark site theme with light tiles');
    assert.deepEqual(await tileState(), initialTiles, 'switching back to dark preserves the light map');
  });
});
