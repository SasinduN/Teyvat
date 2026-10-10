// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * WCAG AA contrast on every public page type, in the light and the dark
 * theme (docs/plans/redesign-redo.md, PR 5), at desktop and phone widths:
 * everything in the page and the footer, measured on the pixels Chrome
 * paints with every photo made white, the worst case (./contrast-capture.ts).
 * Text needs 4.5:1, large text and icon-only controls 3:1.
 *
 * The map's tiles and markers aren't text, and are left out.
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
import { newDecoder, shortfalls } from './contrast-capture';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

const PAGES = [
  '/', '/explore', '/plan', '/journal', '/destinations', '/destinations/ella', '/experiences',
  '/experiences/safari-yala', '/tours', '/tours/island-in-7-days', '/journal/ultimate-ella-guide',
  '/about', '/photo-credits', '/unsubscribe', '/nope'
];

/** Not text: the map's tiles and markers. */
const SKIP = '.leaflet-container';

// `--test-timeout` (60 s) applies to a suite as a whole too, and these 60
// tests take a few minutes together; each test keeps the 60 s limit.
describe('contrast on every page type, light and dark, in Chrome', { skip, timeout: 8 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  let decoder: Page;
  /** One tab for every test: a new one each time adds up to more than Chrome holds. */
  let page: Page;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
    decoder = await newDecoder(chrome);
    page = await chrome.newPage();
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

  /** The shortfalls on `path` in `theme`: "what: ratio < need". */
  async function pageShortfalls(path: string, theme: 'light' | 'dark', mobile: boolean): Promise<string[]> {
    const height = mobile ? 844 : 900;
    await page.send('Page.navigate', { url: 'about:blank' });
    await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1280, height, deviceScaleFactor: 1, mobile });
    // The system's preference picks the theme (no choice saved); no animations mid-way.
    await page.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: theme },
        { name: 'prefers-reduced-motion', value: 'reduce' }
      ]
    });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await poll(page, `document.querySelector('main h1') && document.querySelector('footer')`, `${path}`);
    assert.equal(await page.evaluate<string>('document.documentElement.dataset.theme'), theme, 'precondition: the theme');
    await page.evaluate(`document.fonts.ready.then(() => true)`);

    // Every section scrolled into view, so each one's entrance has run.
    await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto', true`);
    const total = await page.evaluate<number>('document.body.scrollHeight');
    for (let y = 0; y <= total; y += 500) {
      await page.evaluate(`window.scrollTo(0, ${y}), true`);
      await sleep(100);
    }
    await sleep(1200);
    return shortfalls(page, decoder, { roots: 'main, footer', skip: SKIP, viewportHeight: height });
  }

  for (const theme of ['light', 'dark'] as const) {
    for (const mobile of [false, true]) {
      for (const path of PAGES) {
        test(`${theme}, ${mobile ? 'phone' : 'desktop'}, ${path}: AA everywhere`, async () => {
          assert.deepEqual([...new Set(await pageShortfalls(path, theme, mobile))], [], `${theme} ${path}`);
        });
      }
    }
  }
});
