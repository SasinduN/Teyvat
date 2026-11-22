// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The heading serif and the accent script arriving late move nothing (CLS 0;
 * docs/plans/brand-themes.md). Both are `font-display: swap`, so a page first shows its
 * headings in a local serif; the fallback faces in fonts.css carry the web fonts'
 * measurements, so the swap changes letter shapes, not line breaks or heights.
 *
 * Chrome holds every Playfair Display and Allura file back for a second, then lets it
 * through, on the pages whose headings are on screen at once and use both: the home page
 * (the hero's accent), /explore (the title's accent) and a tour page, at 375 and 1280 px.
 * Every layout shift from the first moment is recorded and must add up to 0. The test
 * also proves the swap happened: the serif must still be loading when the page first shows.
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable
  ? 'no Chrome found; set CHROME_PATH to run these'
  : !existsSync(join(ROOT, 'dist', 'index.html'))
    ? 'no build; run `npm run build` first'
    : false;

const LATE_MS = 1000;
const LATE_FONT = /\/assets\/(playfair-display|allura)-latin-/;

interface Shift {
  value: number;
  at: number;
  nodes: string[];
}

describe('late heading and accent fonts move nothing, in Chrome', { skip, timeout: 4 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  let page: Page;
  const held: string[] = [];

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null, bookings: false }));
    chrome = await launchChrome(executable!);
    page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Network.enable');
    // Nothing from a cache: each visit fetches the fonts, and waits for them.
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*.woff2' }] });
    page.on('Fetch.requestPaused', (event) => {
      const { requestId, request } = event as { requestId: string; request: { url: string } };
      const late = LATE_FONT.test(request.url);
      if (late) held.push(request.url);
      void sleep(late ? LATE_MS : 0).then(() => page.send('Fetch.continueRequest', { requestId })).catch(() => undefined);
    });
    // Every layout shift from the first moment of each page (not those after input; there is none).
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__shifts = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.hadRecentInput) continue;
            window.__shifts.push({ value: e.value, at: Math.round(e.startTime), nodes: (e.sources || []).map((s) => s.node
              ? s.node.nodeName + (typeof s.node.className === 'string' ? '.' + s.node.className.slice(0, 50) : '') + ' ' + Math.round(s.previousRect.y) + '->' + Math.round(s.currentRect.y) + ' h' + Math.round(s.previousRect.height) + '->' + Math.round(s.currentRect.height)
              : '?') });
          }
        }).observe({ type: 'layout-shift', buffered: true });`
    });
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  for (const width of [375, 1280]) {
    for (const path of ['/', '/explore', '/tours/island-in-7-days']) {
      test(`${path} at ${width} px: the serif and script swap in without a shift`, async () => {
        held.length = 0;
        await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
        await page.send('Page.navigate', { url: app.baseUrl + path });

        // The page shows (its h1 and footer are there) while the serif is still on its way.
        const until = Date.now() + 20_000;
        let stillLoading: boolean | null = null;
        for (;;) {
          const state = await page
            .evaluate<{ ready: boolean; serif: boolean }>(`({
              ready: document.readyState !== 'loading' && Boolean(document.body.dataset.route && document.querySelector('main h1') && document.querySelector('footer')),
              serif: document.fonts.check('600 16px "Playfair Display"')
            })`)
            .catch(() => ({ ready: false, serif: false }));
          if (state.ready) {
            stillLoading = !state.serif;
            break;
          }
          if (Date.now() > until) throw new Error(`timed out waiting for ${path} at ${width}`);
          await sleep(25);
        }
        assert.equal(stillLoading, true, 'the page showed before the heading font arrived (the swap is what this tests)');

        // Then the fonts arrive, and the page settles.
        await page.evaluate(`document.fonts.ready.then(() => true)`);
        const loaded = await page.evaluate<boolean>(`document.fonts.check('600 16px "Playfair Display"')`);
        assert.ok(loaded, 'the heading font arrived');
        await sleep(400);
        assert.ok(held.some((url) => url.includes('playfair-display')), 'the serif was held back');
        if (path !== '/tours/island-in-7-days') assert.ok(held.some((url) => url.includes('allura')), 'and the script');

        const shifts = await page.evaluate<Shift[]>('window.__shifts');
        const total = shifts.reduce((sum, s) => sum + s.value, 0);
        assert.equal(Number(total.toFixed(4)), 0, `layout shifts as the fonts swapped in:\n${JSON.stringify(shifts, null, 1)}`);
      });
    }
  }
});
