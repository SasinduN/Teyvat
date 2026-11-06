// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The admin's text size at its largest, 120%, in Chrome: on every page type,
 * at 375, 768 and 1280 px, light and dark, no page scrolls sideways and no text
 * overlaps or is clipped (the audit: text-audit.ts). Then the setting itself:
 * the live preview, saving, and the next page load, with nothing blocked.
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, SAMPLE_WISHLIST, saveTheme, saveWishlist, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, createUser, listen, migrateTestDatabase, PASSWORD, resetAuthTables, resetContent, seedStoredPhotoCredit, type RunningApp } from './helpers';
import { SCROLL_THROUGH, TEXT_AUDIT } from './text-audit';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const skip = !executable
  ? 'no Chrome found; set CHROME_PATH to run these'
  : !existsSync(join(ROOT, 'dist', 'index.html'))
    ? 'no build; run `npm run build` first'
    : false;

const PAGES = [
  '/',
  '/explore',
  '/plan',
  '/journal',
  '/journal/ultimate-ella-guide',
  '/destinations',
  '/destinations/ella',
  '/experiences',
  '/experiences/safari-yala',
  '/tours',
  '/tours/island-in-7-days',
  '/booking',
  '/about',
  '/photo-credits',
  '/wishlist',
  '/no-such-page'
];
const WIDTHS = [375, 768, 1280];
const THEMES = ['light', 'dark'] as const;

// `--test-timeout` (60 s) applies to a suite as a whole too; each test keeps it.
describe('text size 120% on every page type, in Chrome', { skip, timeout: 9 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  let page: Page;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    await seedStoredPhotoCredit();
    await pool.query(`update public.site_settings set text_size = 120, whatsapp_number = '94771236478' where id`);
    app = await listen(createApp({ media: null, bookings: true }));
    chrome = await launchChrome(executable!);
    page = await chrome.newPage();
    // The most the header ever holds: the wishlist's count too.
    await saveWishlist(page, SAMPLE_WISHLIST);
  }, HOOK_TIMEOUT);

  after(async () => {
    await resetContent();
    await chrome?.close();
    await app?.close();
  }, HOOK_TIMEOUT);

  async function poll(expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  async function visit(path: string, width: number, theme: 'light' | 'dark'): Promise<void> {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    await saveTheme(page, theme);
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(`document.readyState === 'complete' && document.body.dataset.route && document.querySelector('main h1') && document.querySelector('footer')`, `${path} at ${width}`);
    await page.evaluate('document.fonts.ready.then(() => true)');
    await page.evaluate(SCROLL_THROUGH);
  }

  const audit = () => page.evaluate<string[]>(TEXT_AUDIT);

  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      for (const path of PAGES) {
        test(`${path} at ${width} px, ${theme}`, async () => {
          await visit(path, width, theme);
          assert.equal(await page.evaluate<string>(`getComputedStyle(document.documentElement).fontSize`), '19.2px');
          assert.deepEqual(await audit(), []);
          assert.equal(await page.evaluate<number>(`document.querySelectorAll('main h1').length`), 1, 'one h1');
        });
      }

      test(`the map's side panel and Quick Jump at ${width} px, ${theme}`, async () => {
        await visit('/explore', width, theme);
        await page.evaluate(`document.querySelector('[aria-label="Jump to a place on the map"]').scrollIntoView({ block: 'center', behavior: 'instant' }), true`);
        await page.evaluate(`document.querySelector('.te-quick-jump button').click(), true`);
        await poll(`document.querySelector('.te-quick-jump button[aria-pressed="true"]')`, 'a place chosen');
        await sleep(600);
        assert.deepEqual(await audit(), []);
        // The map's credit is required: nothing may sit on it.
        const covered = await page.evaluate<string[]>(`(() => {
          const credit = document.querySelector('#explore-map .leaflet-control-attribution');
          credit.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = credit.getBoundingClientRect();
          return [r.left + 3, r.left + r.width / 2, r.right - 3]
            .map((x) => document.elementFromPoint(x, r.top + r.height / 2))
            .filter((el) => !el || !credit.contains(el))
            .map((el) => el ? el.tagName + '.' + el.className : 'nothing');
        })()`);
        assert.deepEqual(covered, []);
      });
    }
  }

  for (const theme of THEMES) {
    test(`the phone menu and the map's key at 375 px, ${theme}`, async () => {
      await visit('/explore', 375, theme);
      await page.evaluate(`document.querySelector('[aria-controls="map-key-legend"]').click(), true`);
      await poll(`document.querySelector('#map-key-legend')`, 'the map key');
      assert.deepEqual(await audit(), []);
      await page.evaluate(`document.querySelector('[aria-controls="map-key-legend"]').click(), true`);

      await page.evaluate(`document.querySelector('[aria-controls="mobile-navigation"]').click(), true`);
      await poll(`document.querySelector('#mobile-navigation')`, 'the phone menu');
      await sleep(250);
      const fits = await page.evaluate<string[]>(`(() => {
        const menu = document.querySelector('#mobile-navigation');
        return [...menu.querySelectorAll('a, button, p')]
          .filter((el) => el.getBoundingClientRect().right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1)
          .map((el) => el.textContent.trim());
      })()`);
      assert.deepEqual(fits, []);
    });
  }

  test('the header fits at every width and text size: its links, or the menu button', async () => {
    try {
      for (const textSize of [100, 110, 120]) {
        await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
        for (const width of [640, 768, 1024, 1100, 1180, 1280, 1366, 1440, 1920]) {
          await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
          await page.send('Page.navigate', { url: `${app.baseUrl}/about` });
          await poll(`document.readyState === 'complete' && document.querySelector('.te-nav .te-logo') && document.querySelector('main h1')`, `/about at ${width}`);
          await page.evaluate('document.fonts.ready.then(() => true)');
          const header = await page.evaluate<{ groups: { left: number; right: number }[]; links: boolean; menu: boolean; height: number }>(`(() => {
            const shown = (el) => getComputedStyle(el).display !== 'none';
            const row = document.querySelector('.te-nav .te-container > div');
            return {
              groups: [...row.children].filter(shown).map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }),
              links: shown(document.querySelector('.te-nav-links')),
              menu: shown(document.querySelector('.te-nav-phone-actions')),
              height: document.querySelector('.te-nav').getBoundingClientRect().height
            };
          })()`);
          const where = `${width} px at ${textSize}%`;
          assert.notEqual(header.links, header.menu, `${where}: the links or the menu button, not both or neither`);
          assert.ok(header.groups.at(-1)!.right <= width, `${where}: the header ends at ${header.groups.at(-1)!.right}`);
          for (let i = 1; i < header.groups.length; i += 1) {
            assert.ok(header.groups[i].left >= header.groups[i - 1].right, `${where}: group ${i} overlaps the one before it`);
          }
          // A laptop keeps its links, at the default and at 110%.
          if ((textSize === 100 && width >= 1100) || (textSize === 110 && width >= 1280)) assert.ok(header.links, `${where}: the links show`);
        }
      }
    } finally {
      await pool.query('update public.site_settings set text_size = 120 where id');
    }
  });

  test('the full header fits from 1100 px at 100% and 1280 px at 110%; below that, the menu button', async () => {
    const CASES = [
      { width: 1100, textSize: 100, links: true },
      { width: 1280, textSize: 100, links: true },
      { width: 1280, textSize: 110, links: true },
      { width: 1024, textSize: 100, links: false },
      { width: 1180, textSize: 110, links: false }
    ];
    try {
      for (const { width, textSize, links } of CASES) {
        await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
        await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
        await page.send('Page.navigate', { url: `${app.baseUrl}/about` });
        await poll(`document.readyState === 'complete' && document.querySelector('.te-nav .te-logo') && document.querySelector('main h1')`, `/about at ${width}`);
        await page.evaluate('document.fonts.ready.then(() => true)');
        const where = `${width} px at ${textSize}%`;
        const header = await page.evaluate<{ groups: { left: number; right: number }[]; links: boolean; menu: boolean; clipped: string[]; labels: string[]; itemGaps: number[] }>(`(() => {
          const shown = (el) => getComputedStyle(el).display !== 'none';
          const row = document.querySelector('.te-nav .te-container > div');
          return {
            groups: [...row.children].filter(shown).map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }),
            links: shown(document.querySelector('.te-nav-links')),
            menu: shown(document.querySelector('.te-nav-phone-actions')),
            // The wishlist's badge sits outside its button on purpose, unclipped.
            clipped: [...row.querySelectorAll('a:not(.te-wish-icon), button')].filter((el) => shown(el) && el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent.trim()),
            labels: [...document.querySelectorAll('.te-nav-link')].map((el) => el.textContent.trim()),
            itemGaps: [...document.querySelectorAll('.te-nav-links > *')].map((el) => el.getBoundingClientRect()).map((r, i, all) => (i ? r.left - all[i - 1].right : 0)).slice(1)
          };
        })()`);
        assert.equal(header.links, links, `${where}: the links ${links ? 'show' : 'hand over'}`);
        assert.equal(header.menu, !links, `${where}: the menu button ${links ? 'goes' : 'shows'}`);
        assert.ok(header.groups.at(-1)!.right <= width, `${where}: the header ends at ${header.groups.at(-1)!.right}`);
        for (let i = 1; i < header.groups.length; i += 1) {
          assert.ok(header.groups[i].left >= header.groups[i - 1].right, `${where}: group ${i} overlaps the one before it`);
        }
        assert.deepEqual(header.clipped, [], `${where}: nothing clipped`);
        // Every link, with bookings on (this suite's app): the most the header ever holds.
        if (links) {
          assert.ok(header.labels.includes('Book Your Ride'), `${where}: all the links: ${header.labels.join(', ')}`);
          assert.ok(header.itemGaps.length <= 5, `${where}: at most six top items`);
          // About 28 to 32 px between the items, in rem like the rest of the header.
          for (const gap of header.itemGaps) assert.ok(gap >= 27.5 && gap <= 32 * textSize / 100 + 1, `${where}: a gap of ${gap}`);
          // Room to spare: the links are nowhere near the logo or the buttons.
          for (let i = 1; i < header.groups.length; i += 1) {
            assert.ok(header.groups[i].left - header.groups[i - 1].right >= 24, `${where}: only ${header.groups[i].left - header.groups[i - 1].right} px between groups ${i - 1} and ${i}`);
          }
        }
      }
    } finally {
      await pool.query('update public.site_settings set text_size = 120 where id');
    }
  });

  test('at 1280 px the header hands over to the menu button, and it opens', async () => {
    await visit('/', 1280, 'light');
    const header = await page.evaluate<{ links: string; menu: string; right: number }>(`(() => ({
      links: getComputedStyle(document.querySelector('.te-nav-links')).display,
      menu: getComputedStyle(document.querySelector('.te-nav-phone-actions')).display,
      right: Math.max(...[...document.querySelectorAll('.te-nav button, .te-nav a')].map((el) => el.getBoundingClientRect().right))
    }))()`);
    assert.equal(header.links, 'none');
    assert.equal(header.menu, 'flex');
    assert.ok(header.right <= 1280, `the header ends at ${header.right}`);
    await page.evaluate(`document.querySelector('[aria-controls="mobile-navigation"]').click(), true`);
    await poll(`document.querySelector('#mobile-navigation a')?.getBoundingClientRect().width > 0`, 'the menu, open');
  });
});

describe('the text size setting, in Chrome', { skip, timeout: 3 * 60_000 }, () => {
  const VIOLATIONS = `window.__violations = []; document.addEventListener('securitypolicyviolation', (e) => window.__violations.push(e.violatedDirective + ' ' + e.blockedURI));`;
  let app: RunningApp;
  let chrome: Chrome;
  let page: Page;

  before(async () => {
    await resetContent();
    await resetAuthTables();
    await createUser();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
    page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: VIOLATIONS });
  }, HOOK_TIMEOUT);

  after(async () => {
    await resetContent();
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function poll(expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  const go = async (path: string, ready: string) => {
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(`document.readyState === 'complete' && ${ready}`, path);
  };
  const rootSize = () => page.evaluate<string>(`getComputedStyle(document.documentElement).fontSize`);
  const choose = (size: number) => page.evaluate(`document.querySelector('[data-text-size-field] input[value="${size}"]').click(), true`);
  const previewSize = () => page.evaluate<string>(`getComputedStyle(document.querySelector('[data-text-size-preview]')).fontSize`);

  test('the preview follows the choice, a save applies it, and the next page load has it', async () => {
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await go('/', `document.querySelector('main h1')`);
    assert.equal(await rootSize(), '16px', 'the default');

    await go('/admin/login', `document.querySelector('#admin-email')`);
    const status = await page.evaluate<number>(`fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} })
    }).then((r) => r.status)`);
    assert.equal(status, 200);

    await go('/admin/settings', `document.querySelector('[data-text-size-field]')`);
    assert.equal(await page.evaluate<boolean>(`document.querySelector('[data-text-size-field] input[value="100"]').checked`), true, '100% is chosen');
    assert.equal(await previewSize(), '16px');

    await choose(110);
    await poll(`document.querySelector('[data-text-size-preview="110"]')`, 'the preview at 110%');
    assert.equal(await previewSize(), '17.6px');
    await choose(120);
    await poll(`document.querySelector('[data-text-size-preview="120"]')`, 'the preview at 120%');
    assert.equal(await previewSize(), '19.2px');
    assert.equal(await rootSize(), '16px', 'a preview changes nothing until it is saved');

    await page.evaluate(`[...document.querySelectorAll('button[type="submit"]')].find((b) => /Save settings/.test(b.textContent)).click(), true`);
    await poll(`document.documentElement.dataset.textSize === '120'`, 'the saved size, applied here');
    assert.equal(await rootSize(), '19.2px');
    assert.equal(await previewSize(), '19.2px', 'the preview is the same size as the page');

    for (const path of ['/', '/destinations/ella', '/admin/settings']) {
      await go(path, `document.body.dataset.route || document.querySelector('[data-text-size-field]')`);
      assert.equal(await rootSize(), '19.2px', path);
    }
    assert.equal(await page.evaluate<boolean>(`document.querySelector('[data-text-size-field] input[value="120"]').checked`), true, 'the form shows what is saved');
    assert.equal(await page.evaluate<boolean>(`document.documentElement.hasAttribute('style') && /font-size/.test(document.documentElement.getAttribute('style'))`), false, 'no inline style');
    assert.deepEqual(await page.evaluate<string[]>('window.__violations'), [], 'nothing blocked');
  });

  test('the size is there before any script runs (no flash)', async () => {
    await pool.query('update public.site_settings set text_size = 110 where id');
    const html = await (await fetch(`${app.baseUrl}/tours`)).text();
    assert.match(html, /<html[^>]* data-text-size="110"/);
    await pool.query('update public.site_settings set text_size = 120 where id');
  });

  test('admin Settings at 120% fits, on a phone and on a desktop', async () => {
    for (const width of [375, 1280]) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      await go('/admin/settings', `document.querySelector('[data-text-size-field]')`);
      await sleep(300);
      assert.deepEqual(await page.evaluate<string[]>(TEXT_AUDIT), [], `${width} px`);
    }
  });
});
