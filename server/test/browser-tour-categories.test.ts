// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Tour categories in Chrome (0030, docs/plans/tour-categories.md):
 *
 *   - /tours: the row of categories (links to their pages: a grid at 1280 px, a sideways row
 *     at 375 px), all the tours, then the tailor-made card; one h1;
 *   - a category's page: its h1, intro, best-time note linking to /when-to-go, only its own
 *     tours, the tailor-made card; one h1; a category without tours shows the empty state;
 *     an unknown one is the 404 page;
 *   - a tour with no price reads "Price on request", never "$0" or a blank;
 *   - the tailor-made button opens the enquiry form pre-filled with "Tailor-made trip", and
 *     the WhatsApp link says the same;
 *   - on phones (320, 375, 414 px, 100% and 120%) the floating buttons cover no category tile
 *     and no tailor-made button;
 *   - the admin: Tour Categories edits a category, and the tour form's categories save.
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, afterEach, before, describe, test } from 'node:test';

import { whatsappMessage, whatsappUrl } from '../../shared/whatsapp';
import { TOUR_CATEGORIES } from '../../scripts/fixtures/tourCategories';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, createUser, listen, migrateTestDatabase, PASSWORD, resetAuthTables, resetContent, type RunningApp } from './helpers';
import { DEV_WHATSAPP_NUMBER } from '../../scripts/fixtures/dev-whatsapp';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

describe('tour categories, in Chrome', { skip, timeout: 8 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  const open: Page[] = [];

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    await resetAuthTables();
    await createUser();
    app = await listen(createApp({ media: null, bookings: true }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  afterEach(async () => {
    await Promise.all(open.splice(0).map((page) => page.send('Page.close').catch(() => undefined)));
    await resetContent();
    await pool.query('update public.site_settings set text_size = 100 where id');
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function poll(page: Page, expression: string, what: string, ms = 15_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`).catch(() => false)) return;
      if (Date.now() > until) {
        const shown = await page.evaluate<string>(`(document.querySelector('main') ?? document.body).innerText.slice(0, 300)`).catch(() => '');
        throw new Error(`timed out waiting for ${what}; the page shows: ${shown}`);
      }
      await sleep(40);
    }
  }

  async function openPage(path: string, width = 1280, theme: 'light' | 'dark' = 'light'): Promise<Page> {
    const page = await chrome.newPage();
    open.push(page);
    await page.send('Page.enable');
    const mobile = width < 768;
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: mobile ? 812 : 900, deviceScaleFactor: 1, mobile });
    if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await saveTheme(page, theme);
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(page, `document.body.dataset.route === ${JSON.stringify(path)} && document.querySelector('main h1') && document.fonts.status === 'loaded'`, path);
    return page;
  }

  const h1s = (page: Page) => page.evaluate<string[]>(`[...document.querySelectorAll('h1')].map((h) => h.textContent.trim())`);

  test('/tours: the categories, every tour, then the tailor-made card; one h1', async () => {
    const page = await openPage('/tours');
    assert.deepEqual(await h1s(page), ['Tours']);
    const tiles = await page.evaluate<{ href: string; name: string }[]>(`[...document.querySelectorAll('[data-tour-categories] a')].map((a) => ({ href: a.getAttribute('href'), name: a.querySelector('.te-cat-tile__name').textContent }))`);
    assert.deepEqual(tiles, TOUR_CATEGORIES.map((c) => ({ href: `/tours/category/${c.id}`, name: c.name })));
    // Four a row at 1280 px; the row comes before the tours, the tailor-made card after them.
    const layout = await page.evaluate<{ tops: number[]; order: boolean }>(`(() => {
      const tops = [...document.querySelectorAll('[data-tour-categories] > li')].map((li) => Math.round(li.getBoundingClientRect().top));
      const row = document.querySelector('[data-tour-categories]');
      const tours = document.querySelector('#tours');
      const tailor = document.querySelector('[data-tailor-made]');
      const before = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { tops, order: before(row, tours) && before(tours, tailor) };
    })()`);
    assert.equal(new Set(layout.tops.slice(0, 4)).size, 1, 'the first four on one line');
    assert.ok(layout.tops[4] > layout.tops[0], 'the next four below');
    assert.ok(layout.order, 'categories, then tours, then the tailor-made card');
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('#tours ul[aria-label="Tour packages"] > li').length`), 4, 'every tour');
    // The labels: a tour's first category.
    assert.deepEqual(
      await page.evaluate<string[]>(`[...document.querySelectorAll('#tours .te-tour-row__label')].map((p) => p.textContent)`),
      ['Hill Country Tours', 'Cultural Tours', 'Wildlife Tours', 'Beach Tours']
    );

    // A tile goes to its page.
    await page.evaluate(`document.querySelector('[data-tour-categories] a[href="/tours/category/beach"]').click(), true`);
    await poll(page, `document.body.dataset.route === '/tours/category/beach' && document.querySelector('main h1')`, 'the Beach page');
    assert.deepEqual(await h1s(page), ['Beach tours in Sri Lanka']);
  });

  test('/tours on a phone: the categories are a sideways row; the page itself never scrolls sideways', async () => {
    const page = await openPage('/tours', 375);
    const state = await page.evaluate<{ scrollable: boolean; tops: number; overflow: boolean; intro: string }>(`(() => {
      const list = document.querySelector('[data-tour-categories]');
      document.body.style.overflowX = 'visible';
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      document.body.style.overflowX = '';
      return {
        scrollable: list.scrollWidth > list.clientWidth,
        tops: new Set([...list.children].map((li) => Math.round(li.getBoundingClientRect().top))).size,
        overflow,
        intro: getComputedStyle(list.querySelector('.te-cat-tile__intro')).display
      };
    })()`);
    assert.ok(state.scrollable, 'it scrolls sideways');
    assert.equal(state.tops, 1, 'one row');
    assert.equal(state.overflow, false, 'the page does not');
    assert.equal(state.intro, 'none', 'photo and name only');
  });

  test("a category's page: its heading, intro, best time, its own tours and the tailor-made card", async () => {
    const page = await openPage('/tours/category/cultural');
    assert.deepEqual(await h1s(page), ['Cultural tours in Sri Lanka']);
    assert.equal(await page.evaluate<string>('document.title'), `Cultural tours in Sri Lanka | ${await page.evaluate<string>(`document.title.split(' | ')[1]`)}`);
    const crumbs = await page.evaluate<string[]>(`[...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map((li) => li.textContent.trim())`);
    assert.deepEqual(crumbs, ['Home', 'Tours', 'Cultural Tours']);
    const text = await page.evaluate<string>(`document.querySelector('main').innerText`);
    for (const paragraph of TOUR_CATEGORIES.find((c) => c.id === 'cultural')!.intro) assert.ok(text.includes(paragraph), paragraph);
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-best-time]').length`), 0, 'no note: none shown');
    const titles = await page.evaluate<string[]>(`[...document.querySelectorAll('#tours h3')].map((h) => h.textContent.trim())`);
    assert.deepEqual(titles, ['Island in 7 Days', 'Cultural Sri Lanka'], 'only its own tours, in the site order');
    assert.ok(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-tailor-made]'))`));
    // The header marks the category, inside Tours.
    assert.equal(await page.evaluate<string>(`document.querySelector('.te-nav-links a[aria-current="page"]').textContent.trim()`), 'Cultural Tours');

    // Beach has a sourced best-time note, linking to When to go.
    const beach = await openPage('/tours/category/beach');
    const note = await beach.evaluate<{ text: string; href: string }>(`({ text: document.querySelector('[data-best-time]').textContent, href: document.querySelector('[data-best-time] a').getAttribute('href') })`);
    assert.ok(note.text.includes(TOUR_CATEGORIES[0].bestTimeNote!));
    assert.equal(note.href, '/when-to-go');
  });

  test('a category with no published tours: the empty state and the tailor-made card; an unknown one is the 404 page', async () => {
    const page = await openPage('/tours/category/family');
    assert.deepEqual(await h1s(page), ['Family tours in Sri Lanka']);
    const empty = await page.evaluate<string>(`document.querySelector('[data-category-empty]').textContent`);
    assert.ok(empty.includes('We’re putting these together. Ask us for a tailor-made trip.'), empty);
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('#tours').length`), 0, 'no empty list');
    assert.ok(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-tailor-made]'))`));

    const missing = await chrome.newPage();
    open.push(missing);
    await missing.send('Page.enable');
    await missing.send('Page.navigate', { url: app.baseUrl + '/tours/category/nowhere' });
    await poll(missing, `document.body.dataset.route === '/tours/category/nowhere' && document.querySelector('main h1')`, 'the 404 page');
    assert.match(await missing.evaluate<string>(`document.querySelector('main h1').textContent`), /on the map/, 'the 404 page');
  });

  test('a tour with no price reads "Price on request" on its card, its page and the home page', async () => {
    await pool.query(`update public.tours set price_from = null where id = 'southern-escape'`);
    const page = await openPage('/tours/category/beach');
    const meta = await page.evaluate<string>(`document.querySelector('#tours .te-ed-meta').textContent`);
    assert.match(meta, /5 days, 4 nights\. Price on request\./);
    assert.doesNotMatch(await page.evaluate<string>(`document.querySelector('main').innerText`), /\$0|\$null|From \$ /);

    const tour = await openPage('/tours/southern-escape');
    const main = await tour.evaluate<string>(`document.querySelector('main').innerText`);
    assert.match(main, /Price on request/);
    assert.doesNotMatch(main, /\$0|\$null/);

    const home = await openPage('/');
    assert.match(await home.evaluate<string>(`document.querySelector('#home-routes').innerText`), /5 days, price on request/);
  });

  test('the tailor-made card: the enquiry form pre-filled with "Tailor-made trip", and the WhatsApp link', async () => {
    for (const path of ['/tours', '/tours/category/wellness']) {
      const page = await openPage(path);
      const href = await page.evaluate<string>(`document.querySelector('[data-tailor-made-whatsapp]').getAttribute('href')`);
      assert.equal(href, whatsappUrl(DEV_WHATSAPP_NUMBER, whatsappMessage({ kind: 'tailorMade' }, app.baseUrl)), path);
      await page.evaluate(`document.querySelector('[data-tailor-made-enquiry]').click(), true`);
      await poll(page, `document.querySelector('[role="dialog"] textarea[name="message"]')`, 'the enquiry form');
      const message = await page.evaluate<string>(`document.querySelector('[role="dialog"] textarea[name="message"]').value`);
      assert.equal(message, 'I would like to inquire about: Tailor-made trip', path);
    }
    // No number: no WhatsApp link, the button stays.
    await pool.query('update public.site_settings set whatsapp_number = null where id');
    const page = await openPage('/tours');
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-tailor-made-whatsapp]').length`), 0);
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-tailor-made-enquiry]').length`), 1);
  });

  test('on phones the floating buttons cover no category tile and no tailor-made button, at 100% and 120%', async () => {
    for (const textSize of [100, 120]) {
      await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
      for (const width of [320, 375, 414]) {
        const page = await openPage('/tours', width);
        await poll(page, `document.querySelectorAll('[data-floating-actions] a').length === 2`, 'the floating buttons');
        for (const target of ['[data-tour-categories]', '[data-tailor-made]']) {
          await page.evaluate(`document.querySelector('${target}').scrollIntoView({ block: 'center', behavior: 'instant' }), true`);
          // The stack looks once the scroll has stopped (150 ms), then moves for 280 ms.
          await sleep(700);
          const hits = await page.evaluate<string[]>(`(() => {
            const stack = [...document.querySelectorAll('[data-floating-actions] a')].map((a) => a.getBoundingClientRect());
            const left = Math.min(...stack.map((r) => r.left)) - 8;
            const host = document.querySelector('${target}');
            // A tile clipped by its row counts only for the part the row shows.
            const clip = host.matches('[data-tour-categories]') ? host.getBoundingClientRect().right : Infinity;
            return [...host.querySelectorAll('a, button')]
              .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 1 && Math.min(r.right, clip) > left; })
              .map((el) => el.textContent.trim() + ' reaches ' + Math.round(Math.min(el.getBoundingClientRect().right, clip)) + ' (clear to ' + Math.round(left) + ')');
          })()`);
          assert.deepEqual(hits, [], `${width} px, ${textSize}%, ${target}`);
        }
        await page.send('Page.close').catch(() => undefined);
        open.splice(open.indexOf(page), 1);
      }
    }
  });

  test('the admin: Tour Categories edits a category, and a tour saves its categories', async () => {
    const page = await chrome.newPage();
    open.push(page);
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/login` });
    await poll(page, `document.querySelector('#admin-email') || document.querySelector('a[href="/admin/tour-categories"]')`, 'the login page');
    const status = await page.evaluate<number>(`fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} })
    }).then((r) => r.status)`);
    assert.equal(status, 200, 'signed in');

    // The list: every category, with how many tours each holds.
    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/tour-categories` });
    await poll(page, `document.body.innerText.includes('Wildlife Tours') && document.body.innerText.includes('2 tours')`, 'the categories list');

    // Edit one through the form.
    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/tour-categories/family` });
    await poll(page, `document.querySelector('#field-heading')?.value === 'Family tours in Sri Lanka'`, 'the editor');
    await page.evaluate(`(() => {
      const input = document.querySelector('#field-heading');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Family trips in Sri Lanka');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    await page.evaluate(`[...document.querySelectorAll('button[type="submit"]')].at(-1).click(), true`);
    for (let i = 0; i < 100; i += 1) {
      if ((await pool.query(`select heading from public.tour_categories where id = 'family'`)).rows[0].heading === 'Family trips in Sri Lanka') break;
      await sleep(100);
    }
    assert.equal((await pool.query(`select heading from public.tour_categories where id = 'family'`)).rows[0].heading, 'Family trips in Sri Lanka');

    // The tour form: tick Family on Island in 7 Days, after its two; the order line follows.
    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/tours/island-in-7-days` });
    await poll(page, `document.querySelector('[data-tour-categories-field] button[data-category="family"]')`, 'the categories field');
    assert.equal(
      await page.evaluate<string>(`document.querySelector('[data-category-order]').textContent`),
      'In order: Hill Country Tours, Cultural Tours.'
    );
    await page.evaluate(`document.querySelector('[data-tour-categories-field] button[data-category="family"]').click(), true`);
    await poll(page, `document.querySelector('[data-category-order]').textContent === 'In order: Hill Country Tours, Cultural Tours, Family Tours.'`, 'the order line');
    await page.evaluate(`[...document.querySelectorAll('button[type="submit"]')].at(-1).click(), true`);
    let saved: string[] = [];
    for (let i = 0; i < 100; i += 1) {
      saved = (await pool.query(`select category_id from public.tour_category_links where tour_id = 'island-in-7-days' order by position`)).rows.map((r) => r.category_id);
      if (saved.length === 3) break;
      await sleep(100);
    }
    assert.deepEqual(saved, ['hill-country', 'cultural', 'family']);
  });
});
