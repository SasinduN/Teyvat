// Must be first: points the server at the test database, or refuses to run.
import './test-db';

/**
 * React taking over home's server-rendered first screen (docs/plans/server-rendered-headers.md,
 * PR 1), in Chrome:
 *
 *   - **no flash:** the app's script is held back, so the page shows only the server's markup,
 *     and a screenshot is taken; then it's let through, React's first render replaces the markup,
 *     and a second screenshot must match pixel for pixel (the floating buttons, which arrive
 *     with the app, are left out). At 1280 and 375 px, light; and dark with the Ocean theme
 *     at 120% text;
 *   - **CLS 0, and the LCP is the server's:** with the CPU 4× slower and nothing held, no layout
 *     shift at all, and every largest-contentful-paint entry comes before React's first render
 *     (an identical element drawn again is never a new, larger one);
 *   - the hero photo is fetched once, one h1 before and after, and no console error or warning.
 *
 * The photos are answered locally (an SVG), so nothing waits on the network.
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html')) && existsSync(join(REPO_ROOT, 'dist', '.ssr', 'first-screen.js'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

/** The app's entry script, as the built shell names it. */
const ENTRY = built ? /<script type="module" crossorigin src="([^"]+)"/.exec(readFileSync(join(REPO_ROOT, 'dist', 'index.html'), 'utf8'))?.[1] : undefined;

/** Every photo, answered at once with a plain picture. */
const PHOTO = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="#5d7f66"/><circle cx="1100" cy="420" r="260" fill="#d9c9a3"/></svg>'
).toString('base64');

/** Pixels differing by more than this in any channel (as browser-home-baseline). */
const TOLERANCE = 2;

/** Recorded from the first moment of each document: shifts, LCP entries, React's first commit. */
const OBSERVERS = `
  window.__ssr = { shifts: [], lcp: [], commit: null };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__ssr.shifts.push({ value: e.value, at: Math.round(e.startTime) });
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__ssr.lcp.push({ at: e.startTime, size: e.size, tag: e.element ? e.element.tagName : null });
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  // React's first commit is the moment the server's markup leaves #root.
  new MutationObserver((records) => {
    for (const r of records) {
      if (window.__ssr.commit === null && r.target.id === 'root' && r.removedNodes.length > 0) window.__ssr.commit = performance.now();
    }
  }).observe(document, { childList: true, subtree: true });
`;

describe("React takes over home's server-rendered first screen, in Chrome", { skip, timeout: 5 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  async function waitFor(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await page.evaluate<boolean>(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`)) return;
      await sleep(50);
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  interface Opened {
    page: Page;
    /** Console errors and warnings, exceptions, and error log entries. */
    problems: string[];
    /** Every photo request the page made. */
    photos: string[];
    /** Lets the held app script through (a no-op when nothing is held). */
    release: () => Promise<void>;
  }

  async function open(options: { width: number; hold: boolean; cpu?: number; dark?: boolean }): Promise<Opened> {
    const page = await chrome.newPage();
    const problems: string[] = [];
    const photos: string[] = [];
    let held: string | null = null;
    let release = async () => undefined as void;

    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Network.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: options.width, height: options.width < 700 ? 812 : 800, deviceScaleFactor: 1, mobile: options.width < 700 });
    if (options.cpu) await page.send('Emulation.setCPUThrottlingRate', { rate: options.cpu });
    if (options.dark) await saveTheme(page, 'dark');
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVERS });

    page.on('Runtime.consoleAPICalled', (event) => {
      const { type, args } = event as { type: string; args: { value?: unknown; description?: string }[] };
      if (type === 'error' || type === 'warning') problems.push(`console.${type}: ${args.map((a) => a.value ?? a.description).join(' ')}`);
    });
    page.on('Runtime.exceptionThrown', (event) => problems.push(`exception: ${JSON.stringify((event as { exceptionDetails: unknown }).exceptionDetails).slice(0, 300)}`));
    page.on('Log.entryAdded', (event) => {
      const { entry } = event as { entry: { level: string; text: string; url?: string } };
      if (entry.level === 'error' || entry.level === 'warning') problems.push(`log.${entry.level}: ${entry.text} ${entry.url ?? ''}`);
    });
    page.on('Network.requestWillBeSent', (event) => {
      const { type, request } = event as { type?: string; request: { url: string } };
      if (type === 'Image' && request.url.startsWith('https://images.unsplash.com/')) photos.push(request.url);
    });

    const patterns = [{ urlPattern: 'https://images.unsplash.com/*' }, ...(options.hold ? [{ urlPattern: `*${ENTRY}` }] : [])];
    await page.send('Fetch.enable', { patterns });
    page.on('Fetch.requestPaused', (event) => {
      const { requestId, request } = event as { requestId: string; request: { url: string } };
      if (request.url.startsWith('https://images.unsplash.com/')) {
        void page
          .send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }], body: PHOTO })
          .catch(() => undefined);
      } else {
        held = requestId;
      }
    });
    if (options.hold) {
      release = async () => {
        if (held) await page.send('Fetch.continueRequest', { requestId: held });
      };
    }

    await page.send('Page.navigate', { url: `${app.baseUrl}/` });
    return { page, problems, photos, release };
  }
  const close = (page: Page) => page.send('Page.close').catch(() => undefined);

  /** The hero photo on screen has loaded, the fonts are in, and two frames have painted. */
  const settled = (page: Page) =>
    page.evaluate(`(async () => {
      await document.fonts.ready;
      const img = document.querySelector('#hero .te-hero-slide[data-active="true"] img');
      if (img && !img.complete) await new Promise((done) => { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); });
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      return true;
    })()`);

  const screenshot = async (page: Page) => ((await page.send('Page.captureScreenshot', { format: 'png' })) as { data: string }).data;

  /** Pixels that differ outside `masks` (rectangles in CSS px; the scale is 1), and where. */
  async function differingPixels(
    page: Page, a: string, b: string, masks: { x: number; y: number; width: number; height: number }[]
  ): Promise<{ count: number; box: { x0: number; y0: number; x1: number; y1: number; max: number } }> {
    return page.evaluate(`(async () => {
      const load = async (b64) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      };
      const masks = ${JSON.stringify(masks)};
      const [x, y] = await Promise.all([load(${JSON.stringify(a)}), load(${JSON.stringify(b)})]);
      const box = { x0: x.width, y0: x.height, x1: -1, y1: -1, max: 0 };
      if (x.width !== y.width || x.height !== y.height) return { count: -1, box };
      let diff = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        const px = (i / 4) % x.width, py = Math.floor(i / 4 / x.width);
        if (masks.some((m) => px >= m.x && px < m.x + m.width && py >= m.y && py < m.y + m.height)) continue;
        const d = Math.max(
          Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]),
          Math.abs(x.data[i + 2] - y.data[i + 2]), Math.abs(x.data[i + 3] - y.data[i + 3])
        );
        if (d > ${TOLERANCE}) {
          diff++;
          box.x0 = Math.min(box.x0, px); box.y0 = Math.min(box.y0, py); box.x1 = Math.max(box.x1, px); box.y1 = Math.max(box.y1, py); box.max = Math.max(box.max, d);
        }
      }
      return { count: diff, box };
    })()`);
  }

  before(async () => {
    assert.ok(ENTRY, 'the built shell names its entry script');
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    app = await listen(createApp({ media: null, bookings: false }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
    await pool.query(`update public.site_settings set palette = 'sunset', text_size = 100 where id`);
  }, HOOK_TIMEOUT);

  after(async () => {
    await pool.query(`update public.site_settings set palette = 'sunset', text_size = 100 where id`).catch(() => undefined);
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  const cases: { name: string; width: number; dark?: boolean; setup?: () => Promise<unknown> }[] = [
    { name: 'desktop, light', width: 1280 },
    { name: 'phone, light', width: 375 },
    {
      name: 'desktop, dark, Ocean, 120% text',
      width: 1280,
      dark: true,
      setup: () => pool.query(`update public.site_settings set palette = 'ocean', text_size = 120 where id`)
    }
  ];

  for (const c of cases) {
    test(`no flash: the server's first screen and React's first render are the same pixels (${c.name})`, async () => {
      await c.setup?.();
      const { page, problems, photos, release } = await open({ width: c.width, hold: true, dark: c.dark });
      try {
        // The app is held back: what's on screen is the server's markup alone.
        await waitFor(page, `document.querySelector('#root[data-ssr] #hero h1')`, 'the server-rendered hero');
        await settled(page);
        assert.equal(await page.evaluate<string | undefined>('document.body.dataset.route'), undefined, 'React has not run yet');
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('h1').length`), 1, 'one h1 before');
        if (c.dark) {
          assert.equal(await page.evaluate<string>('document.documentElement.dataset.theme'), 'dark', 'dark before the app (theme-init.js)');
          assert.equal(await page.evaluate<string>('document.documentElement.dataset.palette'), 'ocean');
          assert.equal(await page.evaluate<string>('document.documentElement.dataset.textSize'), '120');
        }
        const before = await screenshot(page);

        await release();
        await waitFor(page, `document.body.dataset.route === '/' && window.__ssr.commit !== null`, "React's first render");
        await settled(page);
        await sleep(300);
        const after = await screenshot(page);
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('h1').length`), 1, 'one h1 after');
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('#root[data-ssr] #hero').length`), 1, 'one hero, React’s');

        // Two things arrive with the app on purpose: the floating buttons (with their labels), and
        // the scrollbar, now that the page below the first screen is there. Everything else must not change.
        const masks = await page.evaluate<{ x: number; y: number; width: number; height: number }[]>(
          `[
            ...[...document.querySelectorAll('[data-floating-actions], [data-floating-actions] *, [data-scroll-top]')].map((el) => {
              const r = el.getBoundingClientRect();
              // Wide enough for their soft shadow.
              return { x: Math.floor(r.x) - 24, y: Math.floor(r.y) - 24, width: Math.ceil(r.width) + 48, height: Math.ceil(r.height) + 48 };
            }),
            { x: document.documentElement.clientWidth, y: 0, width: innerWidth - document.documentElement.clientWidth, height: innerHeight }
          ]`
        );
        const { count: differing, box } = await differingPixels(page, before, after, masks);
        if (differing !== 0 && process.env.SSR_SHOTS) {
          mkdirSync(process.env.SSR_SHOTS, { recursive: true });
          const name = c.name.replace(/[^a-z0-9]+/gi, '-');
          writeFileSync(join(process.env.SSR_SHOTS, `${name}-before.png`), Buffer.from(before, 'base64'));
          writeFileSync(join(process.env.SSR_SHOTS, `${name}-after.png`), Buffer.from(after, 'base64'));
        }
        assert.equal(differing, 0, `the same pixels before and after React took over; they differ in ${JSON.stringify(box)} (SSR_SHOTS=<dir> saves both)`);

        const hero = await page.evaluate<string>(`document.querySelector('#hero .te-hero-slide[data-active="true"] img').currentSrc`);
        assert.equal(photos.filter((url) => url === hero).length, 1, `the hero photo is fetched once (${photos.join(', ')})`);
        assert.deepEqual(problems, [], 'no console errors or warnings');
      } finally {
        await close(page);
      }
    });
  }

  test('CPU 4× slower, nothing held: CLS 0, and the LCP is painted before React takes over', async () => {
    const { page, problems } = await open({ width: 375, hold: false, cpu: 4 });
    try {
      await waitFor(page, `document.body.dataset.route === '/' && window.__ssr.commit !== null`, "React's first render", 40_000);
      await settled(page);
      await sleep(1500);
      const { shifts, lcp, commit } = await page.evaluate<{ shifts: { value: number; at: number }[]; lcp: { at: number; size: number; tag: string | null }[]; commit: number }>('window.__ssr');
      assert.deepEqual(shifts, [], 'no layout shift at all');
      assert.ok(lcp.length > 0, 'an LCP entry');
      for (const entry of lcp) assert.ok(entry.at < commit, `LCP ${entry.tag} at ${Math.round(entry.at)} ms, before React's first render at ${Math.round(commit)} ms`);
      assert.deepEqual(problems, [], 'no console errors or warnings');
    } finally {
      await close(page);
    }
  });
});
