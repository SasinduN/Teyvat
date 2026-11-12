// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The wordmark on the real built site: "SERENDIB LUXE" over a small "TOURS",
 * named "Serendib Luxe Tours" for screen readers; AA in the header and footer,
 * in both themes and in the phone menu; the full header beside it at 1100 px
 * (100%) and 1280 px (110%); one h1 per page; the hero's headline is the
 * tagline, or the admin's; and a name saved in Admin → Settings reaches the
 * logo, the title and the admin's sign-in page.
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { BRAND } from '../../shared/brand';
import { homeTitle } from '../../shared/page-meta';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { CONTRAST } from './contrast';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

describe('the brand in the browser', { skip, timeout: 4 * 60_000 }, () => {
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
    await resetContent();
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function poll(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(30);
    }
  }

  async function openPage(path: string, options: { width?: number; theme?: 'light' | 'dark'; ready?: string } = {}): Promise<Page> {
    const page = await chrome.newPage();
    const width = options.width ?? 1280;
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await saveTheme(page, options.theme ?? 'light');
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(page, `document.readyState === 'complete' && ${options.ready ?? `document.body.dataset.route && document.querySelector('main h1')`}`, path);
    await page.evaluate('document.fonts.ready.then(() => true)');
    await page.evaluate(CONTRAST);
    return page;
  }
  const close = (page: Page) => page.send('Page.close').catch(() => undefined);

  test('the wordmark: two lines in capitals, one accessible name, DM Sans', async () => {
    const page = await openPage('/about');
    try {
      const logo = await page.evaluate<{ main: string; sub: string; mainCase: string; subCase: string; font: string; name: string; subBelow: boolean }>(`(() => {
        const main = document.querySelector('.te-nav .te-logo-main');
        const sub = document.querySelector('.te-nav .te-logo-sub');
        const a = main.getBoundingClientRect(), b = sub.getBoundingClientRect();
        return {
          main: main.textContent, sub: sub.textContent,
          mainCase: getComputedStyle(main).textTransform, subCase: getComputedStyle(sub).textTransform,
          font: getComputedStyle(main).fontFamily,
          name: document.querySelector('.te-nav .te-home-link').textContent.replace(/\\s+/g, ' ').trim(),
          subBelow: b.top >= a.bottom - 1 && Math.abs(a.left - b.left) < 2
        };
      })()`);
      assert.equal(logo.main, 'Serendib Luxe');
      assert.equal(logo.sub, 'Tours');
      assert.equal(logo.mainCase, 'uppercase');
      assert.equal(logo.subCase, 'uppercase');
      assert.match(logo.font, /DM Sans/);
      assert.equal(logo.name, 'Serendib Luxe Tours homepage', 'the link reads as words, with a space between the lines');
      assert.ok(logo.subBelow, '"TOURS" sits under "SERENDIB LUXE", left-aligned');
      assert.equal(await page.evaluate<string>('document.title'), `About Us | ${BRAND.name}`);
    } finally {
      await close(page);
    }
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`the logo holds AA in the header, the footer and the phone menu (${theme})`, async () => {
      let page = await openPage('/about', { theme });
      try {
        assert.deepEqual(await page.evaluate<string[]>(`window.__contrast(document.querySelector('.te-nav .te-logo'), 4.5)`), [], 'header');
        await page.evaluate(`document.querySelector('footer').scrollIntoView()`);
        await sleep(100);
        assert.deepEqual(await page.evaluate<string[]>(`window.__contrast(document.querySelector('footer .te-logo'), 4.5)`), [], 'footer');
        // The small line is a label: at least 13 px, at every size.
        const sizes = await page.evaluate<number[]>(`[...document.querySelectorAll('.te-logo-sub')].map((el) => parseFloat(getComputedStyle(el).fontSize))`);
        assert.ok(sizes.length >= 2 && sizes.every((px) => px >= 13), String(sizes));
      } finally {
        await close(page);
      }

      page = await openPage('/about', { width: 375, theme });
      try {
        await page.evaluate(`document.querySelector('.te-nav-phone-actions button[aria-controls], .te-nav-phone-actions button[aria-label*="menu" i]').click()`);
        await poll(page, `document.querySelector('.te-mobile-navigation .te-logo')`, 'the phone menu');
        await sleep(300);
        assert.deepEqual(await page.evaluate<string[]>(`window.__contrast(document.querySelector('.te-mobile-navigation'), 4.5)`), [], 'phone menu');
        const line = await page.evaluate<string>(`document.querySelector('.te-mobile-navigation').textContent`);
        assert.ok(line.includes(BRAND.tagline), 'the tagline');
        assert.ok(line.includes(`© ${new Date().getFullYear()} ${BRAND.legalName}`), 'the copyright line');
      } finally {
        await close(page);
      }
    });
  }

  test('the full header fits beside the wordmark at 1100 px (100%) and 1280 px (110%)', async () => {
    try {
      for (const [width, textSize] of [[1100, 100], [1280, 110]] as const) {
        await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
        const page = await openPage('/about', { width });
        try {
          const header = await page.evaluate<{ links: boolean; logoRight: number; linksLeft: number; end: number; oneLine: boolean }>(`(() => {
            const links = document.querySelector('.te-nav-links');
            const logo = document.querySelector('.te-nav .te-logo').getBoundingClientRect();
            const row = document.querySelector('.te-nav .te-container > div');
            const shown = [...row.children].filter((el) => getComputedStyle(el).display !== 'none');
            const main = document.querySelector('.te-nav .te-logo-main');
            return {
              links: getComputedStyle(links).display !== 'none',
              logoRight: logo.right,
              linksLeft: links.getBoundingClientRect().left,
              end: shown.at(-1).getBoundingClientRect().right,
              oneLine: main.getClientRects().length === 1 && main.getBoundingClientRect().height < parseFloat(getComputedStyle(main).fontSize) * 1.6
            };
          })()`);
          const where = `${width} px at ${textSize}%`;
          assert.ok(header.links, `${where}: the links show`);
          assert.ok(header.logoRight <= header.linksLeft, `${where}: the wordmark (to ${header.logoRight}) runs into the links (from ${header.linksLeft})`);
          assert.ok(header.end <= width, `${where}: the header ends at ${header.end}`);
          assert.ok(header.oneLine, `${where}: "SERENDIB LUXE" stays on one line`);
        } finally {
          await close(page);
        }
      }
    } finally {
      await pool.query('update public.site_settings set text_size = 100 where id');
    }
  });

  test('one h1 on every page type; the hero headline is the tagline, then the admin’s', async () => {
    for (const path of ['/', '/about', '/destinations', '/destinations/ella', '/tours/island-in-7-days', '/journal/ultimate-ella-guide', '/when-to-go', '/no-such-page']) {
      const page = await openPage(path);
      try {
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('h1').length`), 1, path);
        if (path === '/') {
          assert.equal(await page.evaluate<string>(`document.querySelector('h1').textContent.replace(/\\s+/g, ' ').trim()`), BRAND.tagline);
          assert.equal(await page.evaluate<string>(`document.querySelector('h1 .te-hero-emphasis').textContent.trim()`), 'planned around you.');
          assert.equal(await page.evaluate<string>('document.title'), homeTitle(BRAND));
        }
      } finally {
        await close(page);
      }
    }
    await pool.query(`update public.site_settings set hero_headline = 'Tea country, then the coast' where id`);
    const page = await openPage('/');
    try {
      assert.equal(await page.evaluate<string>(`document.querySelector('h1').textContent.replace(/\\s+/g, ' ').trim()`), 'Tea country, then the coast');
    } finally {
      await close(page);
      await pool.query('update public.site_settings set hero_headline = null where id');
    }
  });

  test('a name saved in Admin → Settings: the logo, the footer, the title and the admin sign-in', async () => {
    await pool.query(
      `update public.site_settings set brand_name = 'Lagoon Hills Journeys', brand_short_name = 'Lagoon Hills', brand_legal_name = 'Lagoon Hills (Pvt) Ltd' where id`
    );
    try {
      let page = await openPage('/about');
      try {
        assert.equal(await page.evaluate<string>(`document.querySelector('.te-nav .te-logo-main').textContent`), 'Lagoon Hills');
        assert.equal(await page.evaluate<string>(`document.querySelector('.te-nav .te-logo-sub').textContent`), 'Journeys');
        assert.equal(await page.evaluate<string>('document.title'), 'About Us | Lagoon Hills Journeys');
        assert.ok((await page.evaluate<string>(`document.querySelector('[data-footer-last-row]').textContent`)).includes('Lagoon Hills (Pvt) Ltd'));
      } finally {
        await close(page);
      }
      page = await openPage('/admin', { ready: `document.querySelector('#admin-email')` });
      try {
        const text = await page.evaluate<string>('document.body.textContent');
        assert.ok(text.includes('Lagoon Hills Journeys admin account'), 'the sign-in page names the brand');
        assert.equal(await page.evaluate<string>(`document.querySelector('#admin-email').placeholder`), 'you@serendibluxetours.com');
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('h1').length`), 1, 'one h1 on the sign-in page');
      } finally {
        await close(page);
      }
    } finally {
      await pool.query('update public.site_settings set brand_name = null, brand_short_name = null, brand_legal_name = null where id');
    }
  });
});
