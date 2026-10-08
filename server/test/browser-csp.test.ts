// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The Content-Security-Policy against the real site: the built client served
 * by the real app, in headless Chrome, with every `securitypolicyviolation`
 * recorded while it walks the public page and the admin. Nothing may be
 * blocked. A control (an image from a host that isn't allowed) proves the
 * recorder works, so "no violations" means something.
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
import { memoryStore } from '../src/media/store';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import {
  assertConnectedToTestDatabase,
  createUser,
  listen,
  migrateTestDatabase,
  PASSWORD,
  resetAuthTables,
  resetContent,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'https://test-bucket.r2.dev';
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

interface Violation {
  page: string;
  directive: string;
  blocked: string;
}

/** Installed before any page script runs, on every document. */
const RECORDER = `
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__csp.push({ directive: e.violatedDirective, blocked: e.blockedURI });
  });
`;

describe('Content-Security-Policy in a real browser', { skip }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  let page: Page;
  const violations: Violation[] = [];

  async function waitFor(expression: string, what: string, ms = 15_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
      await sleep(100);
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  async function visit(path: string, ready: string): Promise<void> {
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await waitFor(`document.readyState === 'complete' && ${ready}`, `${path} to render`);
    await sleep(800); // lazy images, fonts, the admin chunk
    await collect(path);
  }

  async function collect(label: string): Promise<void> {
    const found = await page.evaluate<Array<{ directive: string; blocked: string }>>('window.__csp || []');
    for (const v of found) violations.push({ page: label, ...v });
    await page.evaluate('(window.__csp = [], true)');
  }

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    await resetAuthTables();
    await createUser();

    // A WhatsApp number, so the chat button (public) and "Test in WhatsApp"
    // (admin Settings) are on the pages walked.
    await pool.query("update public.site_settings set whatsapp_number = '94771234567' where id");

    // An uploaded image in a gallery, so the R2 origin is exercised too.
    await pool.query(
      `insert into public.media (key, url, content_type, bytes) values ('destinations/1-aa.png', '${BASE}/destinations/1-aa.png', 'image/png', 10)`
    );
    await pool.query(
      `update public.destinations set gallery = array_append(gallery, '${BASE}/destinations/1-aa.png') where id = 'ella'`
    );

    app = await listen(createApp({ media: { store: memoryStore(), publicBaseUrl: BASE } }));
    chrome = await launchChrome(executable!);
    page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('the public page: every section, and the map with keyed CARTO tiles and its credit', async () => {
    await visit('/explore', `document.querySelector('#explore-map')`);

    // Scroll the whole page so lazy images and the map's tiles load.
    const height = await page.evaluate<number>('document.body.scrollHeight');
    for (let y = 0; y <= height; y += 600) {
      await page.evaluate(`window.scrollTo(0, ${y})`);
      await sleep(150);
    }
    await waitFor(`document.querySelector('.leaflet-tile')`, 'map tiles to be requested');
    await sleep(800);
    await collect('/ (scrolled)');

    // The tiles: CARTO's exact host, keyed when the build had VITE_CARTO_KEY
    // (local builds read it from .env; CI has none and gets the keyless
    // fallback), and actually loaded. Keys are never printed.
    await waitFor(
      `[...document.querySelectorAll('img.leaflet-tile')].filter((t) => t.complete && t.naturalWidth > 0).length >= 4`,
      'map tiles to load'
    );
    const tiles = await page.evaluate<Array<{ origin: string; path: string; keyed: boolean; loaded: boolean }>>(`
      [...document.querySelectorAll('img.leaflet-tile')].map((t) => {
        const u = new URL(t.src);
        return { origin: u.origin, path: u.pathname, keyed: u.searchParams.has('key'), loaded: t.complete && t.naturalWidth > 0 };
      })`);
    const expectKey = Boolean(process.env.VITE_CARTO_KEY?.trim());
    for (const t of tiles) {
      assert.equal(t.origin, 'https://basemaps.cartocdn.com', t.path);
      assert.match(t.path, /^\/rastertiles\/voyager\/\d+\/\d+\/\d+(@2x)?\.png$/);
      assert.equal(t.keyed, expectKey, `${t.path}: key ${expectKey ? 'missing' : 'unexpected'}`);
    }
    assert.ok(tiles.filter((t) => t.loaded).length >= 4, `only ${tiles.filter((t) => t.loaded).length} tiles loaded`);

    // The credit: visible, exactly the required text, both links.
    const credit = await page.evaluate<{ text: string; links: string[]; visible: boolean }>(`(() => {
      const el = document.querySelector('#explore-map .leaflet-control-attribution');
      if (!el) return { text: '', links: [], visible: false };
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim(), links: [...el.querySelectorAll('a')].map((a) => a.href), visible: r.width > 0 && r.height > 0 };
    })()`);
    assert.equal(credit.text, '© OpenStreetMap contributors © CARTO');
    assert.deepEqual(credit.links, ['https://www.openstreetmap.org/copyright', 'https://carto.com/attributions']);
    assert.ok(credit.visible, 'the credit is visible');

    assert.ok(
      await page.evaluate<boolean>(`[...document.querySelectorAll('img')].some((i) => i.src.startsWith('https://upload.wikimedia.org'))`),
      'Credited Wikimedia images are on the page'
    );
  });

  test('every page type (phase 8): lists, details, About, the 404', async () => {
    const pages: [string, string][] = [
      ['/', `document.querySelector('main h1')`],
      ['/plan', `document.querySelector('#planner')`],
      ['/journal', `document.querySelector('#journal')`],
      ['/destinations', `document.querySelector('main a[href^="/destinations/"]')`],
      ['/destinations/ella', `document.querySelector('main [data-google-maps]')`],
      ['/experiences', `document.querySelector('main a[href^="/experiences/"]')`],
      ['/experiences/safari-yala', `document.querySelector('main h1')`],
      ['/tours', `document.querySelector('#tours h3')`],
      // The route map loads Leaflet's stylesheet from unpkg, and the tiles.
      ['/tours/island-in-7-days', `document.querySelectorAll('[data-route-map] img.leaflet-tile').length > 0`],
      ['/journal/ultimate-ella-guide', `document.querySelector('main article')`],
      ['/about', `document.querySelector('[data-inline-inquiry] form')`],
      ['/no-such-page', `document.querySelector('[data-not-found]')`]
    ];
    for (const [path, ready] of pages) {
      await visit(path, ready);
      const height = await page.evaluate<number>('document.body.scrollHeight');
      for (let y = 0; y <= height; y += 900) {
        await page.evaluate(`window.scrollTo(0, ${y})`);
        await sleep(100);
      }
      await collect(`${path} (scrolled)`);
    }
  });

  test('the admin, signed in: dashboard, editor, media library, enquiries, settings, a toast', async () => {
    await visit('/admin/login', `document.querySelector('#admin-email')`);

    const status = await page.evaluate<number>(`fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} })
    }).then((r) => r.status)`);
    assert.equal(status, 200, 'signed in');

    await visit('/admin', `document.body.innerText.includes('Traveller enquiries')`);
    await visit('/admin/destinations/ella', `document.querySelector('form input[type=url]')`);
    // The test bucket's host doesn't resolve, so the preview falls back to its
    // broken-image icon; the browser still requested it, which is what the
    // CSP judges. Check the URL is in the editor.
    assert.ok(
      await page.evaluate<boolean>(`[...document.querySelectorAll('input[type=url]')].some((i) => i.value.startsWith('${BASE}'))`),
      'the R2 image is in the editor'
    );
    // A tour's stops editor: the custom stops' small map previews load
    // Leaflet and CARTO tiles inside the admin.
    await visit(
      '/admin/tours/wild-sri-lanka',
      `[...document.querySelectorAll('[data-stop-row] img.leaflet-tile')].filter((t) => t.complete && t.naturalWidth > 0).length >= 2`
    );
    assert.equal(
      await page.evaluate<number>(
        `[...document.querySelectorAll('[data-stop-row] .leaflet-container')].filter((m) => m.getBoundingClientRect().height > 100).length`
      ),
      2,
      'a full-height preview for each custom stop (Wilpattu, Minneriya)'
    );
    await visit('/admin/media', `document.body.innerText.includes('Media library')`);
    await visit('/admin/inquiries', `document.body.innerText.includes('Traveller Enquiries')`);
    await visit('/admin/settings', `document.querySelector('form button[type=submit]')`);

    // Saving shows a Sonner toast: the <style> it injects is what needs 'unsafe-inline'.
    await page.evaluate(`document.querySelector('form button[type=submit]').click(), true`);
    await waitFor(`document.querySelector('[data-sonner-toast]')`, 'the toast');
    await sleep(300);
    await collect('/admin/settings (toast)');
  });

  test('nothing was blocked; and the recorder does catch a blocked image', async () => {
    assert.deepEqual(violations, [], JSON.stringify(violations, null, 2));

    // Control: an image from a host that isn't allowed must be reported.
    await page.evaluate(`(() => {
      const img = document.createElement('img');
      img.src = 'https://not-allowed.example/x.png';
      document.body.appendChild(img);
      return true;
    })()`);
    await waitFor(`(window.__csp || []).length > 0`, 'the control violation');
    const control = await page.evaluate<Array<{ directive: string; blocked: string }>>('window.__csp');
    assert.equal(control[0].directive, 'img-src');
    assert.match(control[0].blocked, /^https:\/\/not-allowed\.example/);
  });
});
