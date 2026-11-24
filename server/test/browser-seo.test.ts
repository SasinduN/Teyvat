// Must be first: points the server at the test database, or refuses to run.
import './test-db';

/**
 * The SEO quick wins in Chrome (docs/reviews/seo-audit-2026-11.md, section 9):
 *
 *   - every page type keeps one h1, its visible breadcrumbs say what its BreadcrumbList says,
 *     and `document.title` after the app has run is the server's `<title>`;
 *   - the footer (Q6): with the links in Admin → Settings empty or placeholders (a bare
 *     https://www.instagram.com/), no `<a>` without an `href` anywhere in it, and no link to a
 *     placeholder; set, each link is there.
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

/** Every indexed page type, and what says it's ready. */
const PAGES: [string, string][] = [
  ['/', `document.querySelector('main h1')`],
  ['/destinations', `document.querySelector('main a[href^="/destinations/"]')`],
  ['/destinations/ella', `document.querySelector('main h1')`],
  ['/experiences', `document.querySelector('main a[href^="/experiences/"]')`],
  ['/experiences/safari-yala', `document.querySelector('main h1')`],
  ['/tours', `document.querySelector('#tours h3')`],
  ['/tours/category/cultural', `document.querySelector('#tours h3')`],
  ['/tours/island-in-7-days', `document.querySelector('main h1')`],
  ['/journal', `document.querySelector('main a[href^="/journal/"]')`],
  ['/journal/ultimate-ella-guide', `document.querySelector('main article')`],
  ['/when-to-go', `document.querySelector('main h1')`],
  ['/explore', `document.querySelector('main h1')`],
  ['/about', `document.querySelector('main h1')`],
  ['/plan', `document.querySelector('main h1')`],
  ['/photo-credits', `document.querySelector('main h1')`]
];

describe('the SEO quick wins, in Chrome', { skip, timeout: 5 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  async function waitFor(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await page.evaluate<boolean>(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`)) return;
      await sleep(100);
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  async function open(path: string, ready: string): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await waitFor(page, `document.body.dataset.route && ${ready} && document.querySelector('footer [data-footer-last-row]')`, path);
    return page;
  }
  const close = (page: Page) => page.send('Page.close').catch(() => undefined);

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    app = await listen(createApp({ media: null, site: { url: null, indexable: true } }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await resetContent();
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('every page type: one h1, the visible breadcrumbs as its BreadcrumbList, and the server’s title once the app runs', async () => {
    for (const [path, ready] of PAGES) {
      const serverTitle = (await (await fetch(`${app.baseUrl}${path}`)).text()).match(/<title>([^<]*)<\/title>/)![1]
        .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      const page = await open(path, ready);
      try {
        const found = await page.evaluate<{ h1: number; title: string; visible: string[]; ld: string[] | null }>(`(() => {
          const trail = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((b) => b['@type'] === 'BreadcrumbList');
          return {
            h1: document.querySelectorAll('h1').length,
            title: document.title,
            visible: [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map((li) => li.textContent.trim()).filter(Boolean),
            ld: trail ? trail.itemListElement.map((c) => c.name) : null
          };
        })()`);
        assert.equal(found.h1, 1, `${path}: one h1`);
        assert.equal(found.title, serverTitle, `${path}: document.title`);
        if (path === '/') {
          assert.equal(found.ld, null, 'home: no breadcrumbs');
        } else {
          assert.deepEqual(found.visible, found.ld, `${path}: the visible breadcrumbs`);
        }
      } finally {
        await close(page);
      }
    }
  });

  const footerLinks = (page: Page) =>
    page.evaluate<{ bare: string[]; hrefs: string[]; consent: string }>(`(() => {
      const footer = document.querySelector('footer');
      return {
        bare: [...footer.querySelectorAll('a')].filter((a) => !a.getAttribute('href')).map((a) => a.textContent.trim() || a.getAttribute('aria-label')),
        hrefs: [...footer.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
        consent: document.querySelector('[data-newsletter-consent]')?.textContent.replace(/\\s+/g, ' ').trim() ?? ''
      };
    })()`);

  test('the footer: empty or placeholder links are left out (never an <a> without an href); set ones are there', async () => {
    // The live site's state: everything empty but a bare instagram.com.
    await pool.query(
      `update public.site_settings set instagram_url = 'https://www.instagram.com/', facebook_url = null, tiktok_url = null, youtube_url = null,
              privacy_url = null, terms_url = null, sustainability_url = null where id`
    );
    let page = await open('/', `document.querySelector('main h1')`);
    try {
      const links = await footerLinks(page);
      assert.deepEqual(links.bare, [], 'no <a> without an href');
      assert.ok(!links.hrefs.some((h) => /instagram\.com\/?$/.test(h)), 'no link to the bare instagram.com');
      for (const text of ['Privacy Policy', 'Terms of Service', 'Sustainability Pledge']) {
        assert.equal(await page.evaluate<boolean>(`[...document.querySelectorAll('footer a, footer span')].some((el) => el.textContent.trim() === ${JSON.stringify(text)})`), false, `no ${text}`);
      }
      assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('footer [data-footer-social]'))`), false, 'no social row');
      assert.doesNotMatch(links.consent, /Privacy Policy/, 'the consent line without the missing policy');
      assert.match(links.consent, /unsubscribe at any time from the link in every email\.$/);
    } finally {
      await close(page);
    }

    await pool.query(
      `update public.site_settings set instagram_url = 'https://www.instagram.com/serendib', privacy_url = 'https://serendib.travel/privacy',
              terms_url = 'https://serendib.travel/terms', sustainability_url = 'https://serendib.travel/sustainability' where id`
    );
    page = await open('/', `document.querySelector('main h1')`);
    try {
      const links = await footerLinks(page);
      assert.deepEqual(links.bare, []);
      for (const href of ['https://www.instagram.com/serendib', 'https://serendib.travel/privacy', 'https://serendib.travel/terms', 'https://serendib.travel/sustainability']) {
        assert.ok(links.hrefs.includes(href), href);
      }
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('footer [data-footer-social] a').length`), 1, 'only Instagram');
      assert.match(links.consent, /See our Privacy Policy\.$/);
    } finally {
      await close(page);
    }
  });
});
