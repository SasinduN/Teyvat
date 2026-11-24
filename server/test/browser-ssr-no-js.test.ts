// Must be first: points the server at the test database, or refuses to run.
import './test-db';

/**
 * Home with JavaScript turned off (docs/plans/server-rendered-headers.md, PR 1), in Chrome:
 * what a crawler that doesn't run scripts, or a visitor without them, gets.
 *
 *   - the first screen is there and visible: one h1 (the headline), the subtitle, both buttons,
 *     the first slide's photo loaded, the header with its links;
 *   - every link is a real `<a href>`, and the photo fills the hero;
 *   - at 375 px nothing scrolls sideways; the light theme (theme-init.js can't run);
 *   - every other page type still needs JavaScript: its `#root` is empty, as before (PR 2).
 *
 * `SSR_SHOTS=<dir>` saves a screenshot of each width. Needs `npm run build` and Chrome.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html')) && existsSync(join(REPO_ROOT, 'dist', '.ssr', 'first-screen.js'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

/** Every photo, answered at once with a plain picture (no network in tests). */
const PHOTO = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="#5d7f66"/><circle cx="1100" cy="420" r="260" fill="#d9c9a3"/></svg>'
).toString('base64');

interface Seen {
  h1s: { text: string; visible: boolean }[];
  subtitle: boolean;
  photo: { loaded: boolean; coversHero: boolean };
  buttons: { text: string; href: string | null; visible: boolean }[];
  headerLinks: { text: string; href: string | null; visible: boolean }[];
  linksWithoutHref: number;
  sideways: boolean;
  theme: string | null;
  route: string | null;
  scripts: number;
}

describe('home with JavaScript off, in Chrome', { skip, timeout: 3 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  async function open(path: string, width: number): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setScriptExecutionDisabled', { value: true });
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: width < 700 ? 812 : 800, deviceScaleFactor: 1, mobile: width < 700 });
    await page.send('Fetch.enable', { patterns: [{ urlPattern: 'https://images.unsplash.com/*' }] });
    page.on('Fetch.requestPaused', (event) => {
      const { requestId } = event as { requestId: string };
      void page
        .send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }], body: PHOTO })
        .catch(() => undefined);
    });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    const until = Date.now() + 20_000;
    while (!(await page.evaluate<boolean>(`document.readyState === 'complete'`).catch(() => false))) {
      if (Date.now() > until) throw new Error(`${path} never finished loading`);
      await sleep(50);
    }
    await page.evaluate(`document.fonts.ready.then(() => true)`);
    return page;
  }
  const close = (page: Page) => page.send('Page.close').catch(() => undefined);

  const look = (page: Page) =>
    page.evaluate<Seen>(`(() => {
      const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight; };
      const text = (el) => el.textContent.replace(/\\s+/g, ' ').trim();
      const hero = document.querySelector('#hero');
      const img = document.querySelector('#hero .te-hero-slide[data-active="true"] img');
      const h = hero && hero.getBoundingClientRect(), i = img && img.getBoundingClientRect();
      const subtitle = [...document.querySelectorAll('#hero p')].find((p) => text(p).startsWith('Tea country'));
      return {
        h1s: [...document.querySelectorAll('h1')].map((el) => ({ text: text(el), visible: visible(el) })),
        subtitle: Boolean(subtitle && visible(subtitle)),
        photo: { loaded: Boolean(img && img.complete && img.naturalWidth > 0), coversHero: Boolean(h && i && i.width >= h.width - 1 && i.height >= h.height - 1) },
        buttons: [...document.querySelectorAll('#hero .te-hero-actions a')].map((a) => ({ text: text(a), href: a.getAttribute('href'), visible: visible(a) })),
        headerLinks: [...document.querySelectorAll('header.te-nav a')].map((a) => ({ text: text(a), href: a.getAttribute('href'), visible: visible(a) })),
        linksWithoutHref: [...document.querySelectorAll('#root a')].filter((a) => !a.getAttribute('href')).length,
        sideways: document.documentElement.scrollWidth > innerWidth,
        theme: document.documentElement.getAttribute('data-theme'),
        route: document.body.dataset.route ?? null,
        scripts: document.querySelectorAll('#root script').length
      };
    })()`);

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null, bookings: false }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  for (const width of [1280, 375]) {
    test(`home at ${width} px: the first screen, readable and linked, without JavaScript`, async () => {
      const page = await open('/', width);
      try {
        const seen = await look(page);
        assert.equal(seen.route, null, 'no script ran');
        assert.equal(seen.theme, null, 'the light theme: theme-init.js cannot run');
        assert.equal(seen.h1s.length, 1, 'one h1');
        assert.ok(seen.h1s[0].visible, 'the h1 is on screen');
        assert.match(seen.h1s[0].text, /\S/, 'the headline');
        assert.ok(seen.subtitle, 'the subtitle is on screen');
        assert.ok(seen.photo.loaded, 'the first slide’s photo loaded');
        assert.ok(seen.photo.coversHero, 'the photo fills the hero');
        assert.deepEqual(
          seen.buttons.map(({ text, href, visible }) => ({ text, href, visible })),
          [
            { text: 'Explore Sri Lanka', href: '/explore', visible: true },
            { text: 'Plan Your Journey', href: '/plan', visible: true }
          ]
        );
        const shown = seen.headerLinks.filter((l) => l.visible);
        assert.ok(shown.some((l) => l.href === '/'), 'the logo, home');
        assert.ok(shown.some((l) => l.href === '/plan'), 'Plan Your Trip');
        if (width >= 1280) {
          // The desktop header's own links (the groups' links are in their menus, closed).
          for (const href of ['/journal']) assert.ok(shown.some((l) => l.href === href), `${href} in the header`);
        }
        assert.equal(seen.linksWithoutHref, 0, 'every link has an href');
        assert.equal(seen.scripts, 0, 'no script in the first screen');
        assert.equal(seen.sideways, false, 'nothing scrolls sideways');

        if (process.env.SSR_SHOTS) {
          mkdirSync(process.env.SSR_SHOTS, { recursive: true });
          const { data } = (await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })) as { data: string };
          writeFileSync(join(process.env.SSR_SHOTS, `home-no-js-${width < 700 ? 'phone' : 'desktop'}.png`), Buffer.from(data, 'base64'));
        }
      } finally {
        await close(page);
      }
    });
  }

  test('every other page still needs JavaScript (PR 2): an empty #root', async () => {
    for (const path of ['/tours', '/tours/island-in-7-days', '/destinations/galle', '/about']) {
      const page = await open(path, 1280);
      try {
        assert.equal(await page.evaluate<number>(`document.querySelector('#root').childElementCount`), 0, path);
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('h1').length`), 0, `${path}: nothing rendered`);
      } finally {
        await close(page);
      }
    }
  });
});
