// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Photos in R2, in Chrome: `srcset` and `sizes` are rendered, a phone loads the
 * small file, 1920 px is only for full-width heroes (and never Jaffna's or
 * Udawalawe's), the page works before the move as well as after it, and nothing
 * shifts as photos arrive.
 *
 * `media.url` only takes https, so the bucket is `https://r2.test`, answered
 * from `memoryStore()` by intercepting the requests, a little late as a real
 * network would be. The files are the real ones.
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import type { PoolClient } from 'pg';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { migrateAssets } from '../src/media/migrate-assets';
import { memoryStore } from '../src/media/store';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetAuthTables, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable
  ? 'no Chrome found; set CHROME_PATH to run these'
  : !existsSync(join(ROOT, 'dist', 'index.html'))
    ? 'no build; run `npm run build` first'
    : false;

const BASE = 'https://r2.test';
const LATE_MS = 120;

describe('photos at the right width, in Chrome', { skip, timeout: 8 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  let page: Page;
  let client: PoolClient;
  const store = memoryStore();
  const media = { store, publicBaseUrl: BASE };
  /** What the page asked the bucket for. */
  let requested: string[] = [];

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    await resetAuthTables();
    client = await pool.connect();
    app = await listen(createApp({ media, bookings: false }));
    chrome = await launchChrome(executable!);
    page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Network.enable');
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Fetch.enable', { patterns: [{ urlPattern: `${BASE}/*` }] });
    page.on('Fetch.requestPaused', (event) => {
      const { requestId, request } = event as { requestId: string; request: { url: string } };
      const key = new URL(request.url).pathname.slice(1);
      requested.push(key);
      const object = store.objects.get(key);
      void sleep(LATE_MS).then(() => page.send('Fetch.fulfillRequest', object
        ? { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: object.contentType }], body: Buffer.from(object.bytes).toString('base64') }
        : { requestId, responseCode: 404 })).catch(() => undefined);
    });
    // Every layout shift and blocked resource, from the first moment of each page.
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__shifts = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) window.__shifts.push({ value: e.value, at: Math.round(e.startTime), scrollY: Math.round(scrollY), nodes: (e.sources || []).map((s) => s.node && (s.node.nodeName + (s.node.className && s.node.className.slice ? '.' + s.node.className.slice(0, 40) : '') + ' ' + Math.round(s.previousRect.y) + '->' + Math.round(s.currentRect.y) + ' h' + Math.round(s.previousRect.height) + '->' + Math.round(s.currentRect.height))) });
        }).observe({ type: 'layout-shift', buffered: true });
        window.__blocked = [];
        addEventListener('securitypolicyviolation', (e) => window.__blocked.push(e.blockedURI));`
    });
  }, HOOK_TIMEOUT);

  after(async () => {
    client?.release();
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function visit(path: string, width: number, dpr = 1): Promise<void> {
    requested = [];
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: width < 500 ? 812 : 900, deviceScaleFactor: dpr, mobile: width < 500 });
    await page.send('Page.navigate', { url: app.baseUrl + path });
    const until = Date.now() + 20_000;
    for (;;) {
      const ready = await page
        .evaluate<boolean>(`Boolean(document.readyState === 'complete' && document.body.dataset.route && document.querySelector('main h1') && document.querySelector('footer'))`)
        .catch(() => false);
      if (ready) break;
      if (Date.now() > until) throw new Error(`timed out waiting for ${path} at ${width}`);
      await sleep(50);
    }
    await page.evaluate('document.fonts.ready.then(() => true)');
  }

  /** Down the page and back, so every lazy image loads; then until each has. */
  const scrollThrough = () => page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await wait(60); }
    await wait(${LATE_MS * 3});
    scrollTo(0, 0);
    await Promise.race([wait(5000), Promise.all([...document.images].filter((i) => !i.complete && i.loading !== 'lazy').map((i) => new Promise((r) => { i.onload = i.onerror = r; })))]);
    return true;
  })()`);

  interface Shown { src: string; srcset: string; sizes: string; current: string; loaded: boolean }
  const images = (selector = 'main img') => page.evaluate<Shown[]>(`[...document.querySelectorAll(${JSON.stringify(selector)})].map((i) => ({
    src: i.getAttribute('src'), srcset: i.getAttribute('srcset') || '', sizes: i.getAttribute('sizes') || '', current: i.currentSrc, loaded: i.complete && i.naturalWidth > 0
  }))`);
  const heroImage = async (selector: string) => {
    await page.evaluate(`new Promise((resolve) => {
      const until = Date.now() + 8000;
      (function check() { const i = document.querySelector(${JSON.stringify(selector)}); if ((i && i.complete && i.naturalWidth > 0) || Date.now() > until) resolve(true); else setTimeout(check, 50); })();
    })`);
    return (await images(selector))[0];
  };
  const widthOf = (url: string) => Number(/-?(480|768|1280|1920)-[0-9a-f]{16}\.webp/.exec(url)?.[1] ?? 0);

  const SHIFT_PAGES = ['/', '/destinations', '/destinations/ella', '/tours', '/journal'];

  describe('before the move: the committed files', () => {
    test('a card and a hero render their srcset from public/assets/, and load', async () => {
      await visit('/destinations/ella', 1280);
      const hero = await heroImage('main img');
      assert.match(hero.src, /^\/assets\/ella-1280-/);
      assert.match(hero.srcset, /^\/assets\/ella-480-.* 480w, .*1920w$/);
      assert.equal(hero.sizes, '100vw');
      assert.ok(hero.loaded);

      await visit('/destinations', 1280);
      await scrollThrough();
      const cards = (await images()).filter((i) => i.srcset && i.sizes !== '100vw');
      assert.ok(cards.length > 5, `${cards.length} cards`);
      for (const card of cards) {
        assert.match(card.srcset, /^\/assets\//);
        assert.doesNotMatch(card.srcset, /1920w/, 'a card never offers 1920 px');
      }
      assert.deepEqual(requested, [], 'nothing asked of R2 yet');
    });

    test('the home page preloads what the hero will use, on a phone too', async () => {
      await visit('/', 375);
      const preload = await page.evaluate<{ href: string; srcset: string; sizes: string } | null>(`(() => {
        const l = document.querySelector('link[rel=preload][as=image]');
        return l && { href: l.getAttribute('href'), srcset: l.getAttribute('imagesrcset') || '', sizes: l.getAttribute('imagesizes') || '' };
      })()`);
      assert.ok(preload);
      assert.match(preload.href, /^\/assets\/ella-1280-/);
      assert.match(preload.srcset, /^\/assets\/ella-480-/);
      assert.equal(preload.sizes, '100vw');
      const loaded = await page.evaluate<string[]>(`performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.includes('/assets/ella-'))`);
      assert.ok(loaded.length > 0 && loaded.every((n) => /ella-(480|768)-/.test(n)), `a phone loads the small file only: ${loaded.join(', ')}`);
    });
  });

  describe('after the move: the files in R2', () => {
    before(async () => {
      const result = await migrateAssets(client, media);
      assert.equal(result.photos.filter((p) => p.status === 'failed').length, 0);
    }, HOOK_TIMEOUT);

    test('a phone loads the small files, from R2, with nothing blocked', async () => {
      await visit('/', 375);
      await scrollThrough();
      const hero = await heroImage('#hero img');
      assert.equal(new URL(hero.current).origin, BASE);
      assert.equal(widthOf(hero.current), 480, hero.current);
      assert.ok(requested.length > 3, requested.join(', '));
      assert.deepEqual(requested.filter((key) => /^assets\/(1280|1920)-/.test(key)), [], 'nothing large on a phone');
      assert.deepEqual(await page.evaluate<string[]>('window.__blocked'), []);
    });

    test('a retina phone goes one size up, still not to the 1920 px file', async () => {
      await visit('/destinations', 375, 2);
      await scrollThrough();
      const cards = (await images()).filter((i) => i.loaded && i.srcset && i.sizes !== '100vw');
      assert.ok(cards.length > 3);
      for (const card of cards) assert.ok(widthOf(card.current) <= 768, card.current);
      assert.deepEqual(requested.filter((key) => key.startsWith('assets/1920-')), []);
    });

    test('1920 px only for a full-width hero', async () => {
      await visit('/destinations/ella', 1600);
      const hero = await heroImage('main img');
      assert.equal(hero.sizes, '100vw');
      assert.match(hero.srcset, /1920w/);
      assert.equal(widthOf(hero.current), 1920, hero.current);
      assert.equal(new URL(hero.current).origin, BASE);

      // Even on a large retina screen, where 33vw would otherwise reach for it.
      await visit('/destinations', 1600, 2);
      await scrollThrough();
      const all = await images();
      const cards = all.filter((i) => i.srcset && i.sizes !== '100vw');
      assert.ok(cards.length > 5);
      for (const card of cards) {
        assert.equal(new URL(card.src).origin, BASE);
        assert.doesNotMatch(card.srcset, /1920w/);
        assert.ok(card.sizes.length > 0);
      }
      const heroes = all.filter((i) => i.sizes === '100vw').map((i) => new URL(i.current).pathname.slice(1));
      assert.deepEqual(requested.filter((key) => key.startsWith('assets/1920-') && !heroes.includes(key)), [], 'only a hero');
    });

    for (const id of ['jaffna', 'udawalawe']) {
      test(`${id}: its upscaled 1920 px file is never offered, hero included`, async () => {
        await visit(`/destinations/${id}`, 1600, 2);
        const hero = await heroImage('main img');
        assert.equal(new URL(hero.current).origin, BASE);
        assert.equal(hero.sizes, '100vw');
        assert.ok(hero.srcset.length > 0);
        assert.doesNotMatch(hero.srcset, /1920w/);
        assert.equal(widthOf(hero.current), 1280, hero.current);
      });
    }

    test('the home preload names R2, and the hero is fetched once', async () => {
      await visit('/', 375);
      const hero = await heroImage('#hero img');
      assert.equal(widthOf(hero.current), 480, hero.current);
      const preload = await page.evaluate<string>(`document.querySelector('link[rel=preload][as=image]').getAttribute('imagesrcset')`);
      assert.match(preload, new RegExp(`^${BASE}/assets/480-`));
      const key = new URL(hero.current).pathname.slice(1);
      assert.equal(requested.filter((k) => k === key).length, 1, requested.join(', '));
      assert.deepEqual(requested.filter((k) => k.startsWith('assets/1280-')), [], 'not the 1280 px as well');
    });

    test('an image R2 can\'t serve falls back as before', async () => {
      const key = 'assets/480-d8f17e14559c5e03.webp';
      const object = store.objects.get(key)!;
      store.objects.delete(key);
      try {
        await visit('/destinations/ella', 375);
        await sleep(LATE_MS * 4);
        const hero = (await images('main img'))[0];
        assert.ok(hero.loaded, `still a photo: ${hero.current}`);
        assert.notEqual(new URL(hero.current).pathname.slice(1), key);
      } finally {
        store.objects.set(key, object);
      }
    });

    for (const width of [375, 1280]) {
      for (const path of SHIFT_PAGES) {
        test(`${path} at ${width} px: nothing shifts as photos arrive late`, async () => {
          await visit(path, width);
          await scrollThrough();
          await sleep(LATE_MS * 2);
          // Not `hadRecentInput`: Chrome sets it unpredictably under emulation. Not <body> either:
          // it moves once as the page's chunk mounts, about 0.06 to 0.1, before any photo and on the
          // committed files too. Everything else on the page is what a late photo could move.
          const shifts = await page.evaluate<{ value: number; nodes: string[] }[]>(`window.__shifts
            .map((s) => ({ value: s.value, nodes: s.nodes.filter((n) => n && !n.startsWith('BODY')) }))
            .filter((s) => s.nodes.length > 0)`);
          const total = shifts.reduce((sum, s) => sum + s.value, 0);
          assert.ok(total < 0.01, `layout shift ${total.toFixed(4)}: ${JSON.stringify(shifts)}`);
          assert.ok(!shifts.some((s) => s.nodes.some((n) => n.startsWith('IMG'))), JSON.stringify(shifts));
          const late = (await images()).filter((i) => i.srcset && !i.current);
          assert.deepEqual(late, [], 'every photo got a source');
        });
      }
    }
  });
});
