// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * What the November 2026 audit (docs/reviews/audit-2026-11.md) changed about
 * loading, on the real built site in headless Chrome:
 *
 *   - `/api/content` is preloaded from the HTML, and the app's own fetch gets
 *     that response: one request, not two;
 *   - the header's photo is preloaded on the pages whose header shows their
 *     share image, and it is exactly the photo the page shows, fetched once;
 *   - the page doesn't move as its code arrives: a page header's top margin
 *     used to collapse into <body>, which then dropped 80 px (CLS 0.1 on phones);
 *   - `/api/content` and the page shell are compressed.
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { get } from 'node:http';
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

describe('preloads, compression and the first layout, in Chrome', { skip, timeout: 5 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  let page: Page;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
    page = await chrome.newPage();
    await page.send('Page.enable');
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function visit(path: string, width = 375): Promise<void> {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 800 : 900, deviceScaleFactor: 1, mobile: width < 768 });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    const until = Date.now() + 20_000;
    while (Date.now() < until) {
      const ready = await page
        .evaluate<boolean>(`Boolean(document.body?.dataset.route) && document.readyState === 'complete' && [...document.querySelectorAll('#hero img, .te-page-hero img')].every((i) => i.complete)`)
        .catch(() => false);
      if (ready) return;
      await sleep(100);
    }
    throw new Error(`timed out loading ${path}`);
  }

  const firstId = async (table: string): Promise<string> =>
    (await pool.query<{ id: string }>(`select id from public.${table} where published order by sort_order, id limit 1`)).rows[0].id;

  test('/api/content is preloaded, and the app uses that response', async () => {
    for (const path of ['/', '/tours', '/no-such-page']) {
      await visit(path);
      const seen = await page.evaluate<{ preload: boolean; requests: number }>(`({
        preload: Boolean(document.querySelector('link[rel=preload][as=fetch][href="/api/content"][crossorigin]')),
        requests: performance.getEntriesByType('resource').filter((e) => new URL(e.name).pathname === '/api/content').length
      })`);
      assert.deepEqual(seen, { preload: true, requests: 1 }, path);
    }
  });

  test('the admin does not preload /api/content', async () => {
    const html = await (await fetch(`${app.baseUrl}/admin`)).text();
    assert.doesNotMatch(html, /href="\/api\/content"/);
  });

  test("each header photo that is preloaded is the photo on screen, fetched once", async () => {
    const pages = [
      '/', '/destinations', '/explore', '/when-to-go', '/tours', '/journal', '/experiences', '/plan', '/photo-credits', '/wishlist',
      `/destinations/${await firstId('destinations')}`,
      `/tours/${await firstId('tours')}`,
      `/journal/${await firstId('articles')}`,
      `/experiences/${await firstId('featured_experiences')}`
    ];
    for (const path of pages) {
      await visit(path);
      const seen = await page.evaluate<{ preload: string | null; shown: string | null; fetches: number }>(`(() => {
        const link = document.querySelector('link[rel=preload][as=image]');
        const hero = document.querySelector(${JSON.stringify(path === '/' ? '#hero img' : '.te-page-hero img')});
        return {
          preload: link ? link.href : null,
          shown: hero ? hero.currentSrc || hero.src : null,
          fetches: link ? performance.getEntriesByType('resource').filter((e) => e.name === link.href).length : 0
        };
      })()`);
      assert.ok(seen.preload, `${path}: a preload`);
      assert.equal(seen.shown, seen.preload, `${path}: the preloaded photo is the one shown`);
      assert.equal(seen.fetches, 1, `${path}: fetched once`);
    }
  });

  test('About, whose header is the second slide, preloads no photo', async () => {
    const html = await (await fetch(`${app.baseUrl}/about`)).text();
    assert.doesNotMatch(html, /rel="preload" as="image"/);
  });

  for (const width of [375, 1280]) {
    test(`at ${width} px, nothing moves as a page's code arrives`, async () => {
      for (const path of ['/tours', '/destinations', '/journal', '/explore']) {
        await visit(path, width);
        const shifts = await page.evaluate<{ value: number; sources: string[] }[]>(`new Promise((done) => {
          const all = [];
          const observer = new PerformanceObserver((list) => all.push(...list.getEntries()));
          observer.observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            done(all.map((e) => ({ value: e.value, sources: e.sources.map((s) => s.node ? s.node.nodeName : '?') })));
          }, 300);
        })`);
        const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
        assert.ok(total < 0.01, `${path}: layout shift ${total.toFixed(3)} ${JSON.stringify(shifts)}`);
      }
    });
  }

  test('/api/content and the page shell are compressed, and still revalidate', async () => {
    for (const [encoding, expected] of [['br, gzip', 'br'], ['gzip', 'gzip'], ['identity', null]] as const) {
      for (const path of ['/api/content', '/tours']) {
        const res = await fetch(`${app.baseUrl}${path}`, { headers: { 'Accept-Encoding': encoding } });
        assert.equal(res.headers.get('content-encoding'), expected, `${path} with ${encoding}`);
        assert.match(res.headers.get('vary') ?? '', /Accept-Encoding/i);
        const body = await res.text();
        if (path === '/api/content') assert.ok(Array.isArray(JSON.parse(body).tours));
        else assert.match(body, /<div id="root">/);
        if (path === '/api/content') {
          // node:http, not fetch: fetch adds "Cache-Control: no-cache" to a request with
          // If-None-Match (the Fetch standard), and Express then rightly sends the body.
          const status = await new Promise<number | undefined>((done, fail) => {
            get(`${app.baseUrl}${path}`, { headers: { 'Accept-Encoding': encoding, 'If-None-Match': res.headers.get('etag')! } }, (again) => {
              again.resume();
              done(again.statusCode);
            }).on('error', fail);
          });
          assert.equal(status, 304, `${path} with ${encoding}: unchanged is a 304`);
        }
      }
    }
  });
});
