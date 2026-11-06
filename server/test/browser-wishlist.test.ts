// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The wishlist in Chrome: saving on every kind of card and page, the list surviving a
 * reload, the limit of 30, items that are gone from the server, the keyboard, the
 * pre-filled enquiry, and what happens where the browser blocks storage.
 *
 * Saved items live only in the browser, so nothing here touches the server except the
 * enquiry a visitor chooses to send.
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { SiteContentPayload } from '../../shared/api';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { newDecoder, shortfalls } from './contrast-capture';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { TEXT_AUDIT } from './text-audit';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

const KEY = 'site:wishlist';
const ELLA = { kind: 'destination', id: 'ella' };
const YALA = { kind: 'experience', id: 'safari-yala' };
const ISLAND = { kind: 'tour', id: 'island-in-7-days' };

const BLOCKED_READ = `Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });`;
const BLOCKED_WRITE = `Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };`;

describe('the wishlist, in Chrome', { skip, timeout: 8 * 60_000 }, () => {
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
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
    await pool.query('delete from public.inquiries');
  }, HOOK_TIMEOUT);

  interface Opened extends Page {
    errors: string[];
    go: (path: string) => Promise<void>;
    close: () => Promise<void>;
  }

  async function waitFor(page: Page, expression: string, what: string): Promise<void> {
    const until = Date.now() + 20_000;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(40);
    }
  }

  /**
   * A new tab on `path`. Tabs share one browser's storage, so the list is set once per
   * tab (sessionStorage is per tab) and a reload keeps what the page did to it.
   */
  async function open(path: string, options: { saved?: unknown; raw?: string; width?: number; script?: string } = {}): Promise<Opened> {
    const page = await chrome.newPage();
    const errors: string[] = [];
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    page.on('Runtime.exceptionThrown', (event) => errors.push(JSON.stringify(event)));
    page.on('Runtime.consoleAPICalled', (event) => { if (event.type === 'error') errors.push(JSON.stringify(event.args)); });
    const width = options.width ?? 1280;
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    const value = options.raw ?? (options.saved ? JSON.stringify(options.saved) : null);
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try {
        if (location.protocol === 'http:' && !sessionStorage.getItem('seeded')) {
          sessionStorage.setItem('seeded', '1');
          ${value === null ? `localStorage.removeItem('${KEY}');` : `localStorage.setItem('${KEY}', ${JSON.stringify(value)});`}
        }
      } catch {}`
    });
    if (options.script) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: options.script });

    const go = async (to: string) => {
      await page.send('Page.navigate', { url: app.baseUrl + to });
      await waitFor(page, `document.readyState === 'complete' && document.body.dataset.route === ${JSON.stringify(to)} && document.querySelector('main h1') && document.querySelector('footer')`, to);
    };
    await go(path);
    return Object.assign(page, {
      errors,
      go,
      close: async () => {
        const { targetInfo } = (await page.send('Target.getTargetInfo')) as { targetInfo: { targetId: string } };
        await page.send('Target.closeTarget', { targetId: targetInfo.targetId }).catch(() => undefined);
      }
    });
  }

  const stored = (page: Page) => page.evaluate<unknown[] | null>(`JSON.parse(localStorage.getItem('${KEY}'))`);
  const save = (item: { kind: string; id: string }) => `document.querySelector('[data-save="${item.kind}:${item.id}"]')`;
  const pressed = (page: Page, item: { kind: string; id: string }) => page.evaluate<string>(`${save(item)}.getAttribute('aria-pressed')`);
  const click = (page: Page, expression: string) => page.evaluate(`${expression}.click(), true`);
  const headerIcon = `[...document.querySelectorAll('[data-wishlist-icon]')].find((el) => el.getClientRects().length > 0)`;
  const count = (page: Page) => page.evaluate<string | null>(`${headerIcon}.querySelector('.te-wish-count')?.textContent ?? null`);

  const press = async (page: Page, key: string, code: string, keyCode: number, text?: string) => {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, ...(text ? { text } : {}) });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
    await sleep(60);
  };
  const tab = (page: Page) => press(page, 'Tab', 'Tab', 9);
  const enter = (page: Page) => press(page, 'Enter', 'Enter', 13, '\r');
  const space = (page: Page) => press(page, ' ', 'Space', 32, ' ');
  const escape = (page: Page) => press(page, 'Escape', 'Escape', 27);

  describe('saving', () => {
    test('Save and Saved: aria-pressed, the label, the header count and what is stored', async () => {
      const page = await open('/destinations/ella');
      try {
        assert.equal(await pressed(page, ELLA), 'false');
        assert.equal(await page.evaluate<string>(`${save(ELLA)}.textContent.trim()`), 'Save');
        assert.equal(await page.evaluate<string>(`${save(ELLA)}.getAttribute('aria-label')`), 'Save Ella');
        assert.equal(await count(page), null, 'no badge with nothing saved');
        assert.equal(await page.evaluate<string>(`${headerIcon}.getAttribute('aria-label')`), 'Wishlist, nothing saved');
        assert.equal(await stored(page), null);

        await click(page, save(ELLA));
        assert.equal(await pressed(page, ELLA), 'true');
        assert.equal(await page.evaluate<string>(`${save(ELLA)}.textContent.trim()`), 'Saved');
        assert.equal(await page.evaluate<string>(`${save(ELLA)}.getAttribute('aria-label')`), 'Saved Ella');
        assert.equal(await count(page), '1');
        assert.equal(await page.evaluate<string>(`${headerIcon}.getAttribute('aria-label')`), 'Wishlist, 1 saved');
        assert.deepEqual(await stored(page), [ELLA]);

        await click(page, save(ELLA));
        assert.equal(await pressed(page, ELLA), 'false');
        assert.equal(await count(page), null);
        assert.equal(await stored(page), null, 'an empty list leaves nothing behind');
      } finally {
        await page.close();
      }
    });

    for (const [path, kinds] of [
      ['/', ['destination']],
      ['/destinations', ['destination']],
      ['/destinations/ella', ['destination', 'tour']],
      ['/experiences', ['experience']],
      ['/experiences/safari-yala', ['destination', 'experience']],
      ['/tours', ['tour']],
      ['/tours/island-in-7-days', ['tour']]
    ] as const) {
      test(`${path} has Save buttons, none inside a link, each 44 px and named`, async () => {
        const page = await open(path);
        try {
          await page.evaluate(`document.querySelectorAll('[data-save]').length`);
          const found = await page.evaluate<{ kinds: string[]; nested: number; small: string[]; unnamed: number }>(`(() => {
            const all = [...document.querySelectorAll('[data-save]')];
            return {
              kinds: [...new Set(all.map((el) => el.dataset.save.split(':')[0]))].sort(),
              nested: all.filter((el) => el.closest('a')).length,
              small: all.filter((el) => { const r = el.getBoundingClientRect(); return r.height < 44; }).map((el) => el.dataset.save),
              unnamed: all.filter((el) => !/^Saved? .+/.test(el.getAttribute('aria-label') ?? '') || !el.hasAttribute('aria-pressed')).length
            };
          })()`);
          assert.deepEqual(found.kinds, [...kinds].sort());
          assert.equal(found.nested, 0, 'a link can\'t hold a button');
          assert.deepEqual(found.small, []);
          assert.equal(found.unnamed, 0);
        } finally {
          await page.close();
        }
      });
    }

    test('Save on a card stays on the page; the card itself is still a link', async () => {
      const page = await open('/experiences/safari-yala');
      try {
        const card = await page.evaluate<string>(`document.querySelector('.te-save-card [data-save^="experience:"]').dataset.save`);
        const item = { kind: 'experience', id: card.split(':')[1] };
        await click(page, `document.querySelector('.te-save-card [data-save="${card}"]')`);
        assert.equal(await page.evaluate<string>('location.pathname'), '/experiences/safari-yala');
        assert.deepEqual(await stored(page), [item]);
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('.te-save-card a[href^="/experiences/"]').length > 0 ? 1 : 0`), 1);
      } finally {
        await page.close();
      }
    });

    test('a real click on a card\'s Save hits the button, not the link under it', async () => {
      const page = await open('/tours/island-in-7-days');
      try {
        const point = await page.evaluate<{ x: number; y: number; id: string }>(`(() => {
          const button = document.querySelector('.te-save-card [data-save]');
          button.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = button.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: button.dataset.save };
        })()`);
        for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
          await page.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, ...(type === 'mouseMoved' ? {} : { button: 'left', clickCount: 1 }) });
        }
        await sleep(100);
        assert.equal(await page.evaluate<string>('location.pathname'), '/tours/island-in-7-days');
        assert.equal(await page.evaluate<string>(`document.querySelector('.te-save-card [data-save="${point.id}"]').getAttribute('aria-pressed')`), 'true');
      } finally {
        await page.close();
      }
    });
  });

  describe('keeping the list', () => {
    test('it survives a reload, and a new tab sees it', async () => {
      const page = await open('/destinations/ella');
      try {
        await click(page, save(ELLA));
        await page.go('/destinations/ella');
        assert.equal(await pressed(page, ELLA), 'true', 'after a reload');
        assert.equal(await count(page), '1');
        await page.go('/wishlist');
        assert.ok(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-wishlist-remove="destination:ella"]'))`));

        const second = await chrome.newPage();
        await second.send('Page.navigate', { url: `${app.baseUrl}/destinations/ella` });
        await waitFor(second, save(ELLA), 'the button in a new tab');
        assert.equal(await pressed(second, ELLA), 'true', 'in a new tab');
        const { targetInfo } = (await second.send('Target.getTargetInfo')) as { targetInfo: { targetId: string } };
        await second.send('Target.closeTarget', { targetId: targetInfo.targetId });
      } finally {
        await page.close();
      }
    });

    test('a save in another tab shows here without a reload', async () => {
      const page = await open('/destinations/ella');
      const other = await chrome.newPage();
      try {
        await other.send('Page.navigate', { url: `${app.baseUrl}/destinations/ella` });
        await waitFor(other, save(ELLA), 'the other tab');
        await click(other, save(ELLA));
        await waitFor(page, `${save(ELLA)}.getAttribute('aria-pressed') === 'true'`, 'the save, here');
        assert.equal(await count(page), '1');
      } finally {
        const { targetInfo } = (await other.send('Target.getTargetInfo')) as { targetInfo: { targetId: string } };
        await other.send('Target.closeTarget', { targetId: targetInfo.targetId }).catch(() => undefined);
        await page.close();
      }
    });
  });

  describe('the limit of 30', () => {
    /** Enough published destinations to go past the limit: the seed has fewer than 31 saveable rows. */
    async function addDestinations(count: number): Promise<void> {
      await pool.query(
        `insert into public.destinations
         select (jsonb_populate_record(d, jsonb_build_object('id', 'extra-' || n, 'name', 'Extra ' || n, 'sort_order', 100 + n))).*
           from public.destinations d, generate_series(1, $1) n
          where d.id = 'ella'`,
        [count]
      );
    }

    test('the 31st is refused with a note; removing one makes room', async () => {
      await addDestinations(12);
      const payload = (await (await fetch(`${app.baseUrl}/api/content`)).json()) as SiteContentPayload;
      const ids = payload.destinations.map((row) => row.id);
      assert.ok(ids.length >= 31, `${ids.length} destinations`);
      const thirty = ids.slice(0, 30).map((id) => ({ kind: 'destination', id }));
      const next = { kind: 'destination', id: ids[30] };

      const page = await open('/destinations', { saved: thirty });
      try {
        assert.equal(await page.evaluate<string>(`${headerIcon}.getAttribute('aria-label')`), 'Wishlist, 30 saved');
        assert.equal(await count(page), '9+');
        await click(page, save(next));
        assert.equal(await pressed(page, next), 'false', 'not saved');
        assert.equal((await stored(page))!.length, 30);
        const note = await page.evaluate<string>(`${save(next)}.parentElement.querySelector('[role="status"]').textContent`);
        assert.match(note, /saved 30/);

        await click(page, save(thirty[0]));
        assert.equal((await stored(page))!.length, 29);
        await click(page, save(next));
        assert.equal(await pressed(page, next), 'true');
        assert.equal((await stored(page))!.length, 30);
      } finally {
        await page.close();
      }
    });

    test('a stored list longer than the limit shows 30', async () => {
      await addDestinations(12);
      const payload = (await (await fetch(`${app.baseUrl}/api/content`)).json()) as SiteContentPayload;
      const page = await open('/wishlist', { saved: payload.destinations.map((row) => ({ kind: 'destination', id: row.id })) });
      try {
        assert.equal(await page.evaluate<string>(`${headerIcon}.getAttribute('aria-label')`), 'Wishlist, 30 saved');
        assert.equal(await count(page), '9+');
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-wishlist-remove]').length`), 30);
      } finally {
        await page.close();
      }
    });

    test('the full note fits a phone at 120%', async () => {
      await addDestinations(12);
      await pool.query('update public.site_settings set text_size = 120 where id');
      const payload = (await (await fetch(`${app.baseUrl}/api/content`)).json()) as SiteContentPayload;
      const ids = payload.destinations.map((row) => row.id);
      const page = await open('/destinations', { saved: ids.slice(0, 30).map((id) => ({ kind: 'destination', id })), width: 375 });
      try {
        await page.evaluate(`${save({ kind: 'destination', id: ids[30] })}.scrollIntoView({ block: 'center', behavior: 'instant' }), true`);
        await click(page, save({ kind: 'destination', id: ids[30] }));
        await sleep(100);
        assert.deepEqual(await page.evaluate<string[]>(TEXT_AUDIT), []);
      } finally {
        await page.close();
      }
    });
  });

  describe('items gone from the server', () => {
    test('deleted, unknown and malformed entries disappear quietly', async () => {
      const page = await open('/wishlist', {
        saved: [ELLA, { kind: 'destination', id: 'no-such-place' }, { kind: 'spaceship', id: 'ella' }, { kind: 'tour', id: 'no-such-tour' }, ISLAND]
      });
      try {
        assert.deepEqual(
          await page.evaluate<string[]>(`[...document.querySelectorAll('[data-wishlist-remove]')].map((el) => el.dataset.wishlistRemove)`),
          ['destination:ella', 'tour:island-in-7-days']
        );
        assert.equal(await count(page), '2', 'the header counts only what is shown');
        assert.deepEqual(page.errors, []);
      } finally {
        await page.close();
      }
    });

    test('an item unpublished on the server goes, and returns if it is published again', async () => {
      const page = await open('/wishlist', { saved: [ELLA, YALA] });
      try {
        assert.equal(await count(page), '2');
        await pool.query(`update public.destinations set published = false where id = 'ella'`);
        await page.go('/wishlist');
        assert.deepEqual(
          await page.evaluate<string[]>(`[...document.querySelectorAll('[data-wishlist-remove]')].map((el) => el.dataset.wishlistRemove)`),
          ['experience:safari-yala']
        );
        assert.equal(await count(page), '1');

        await pool.query(`update public.destinations set published = true where id = 'ella'`);
        await page.go('/wishlist');
        assert.equal(await count(page), '2');
        assert.deepEqual(page.errors, []);
      } finally {
        await page.close();
      }
    });

    test('a list of only gone items is the empty state, and a broken store is too', async () => {
      for (const options of [{ saved: [{ kind: 'tour', id: 'gone' }] }, { raw: '{not json' }, { raw: '"a string"' }]) {
        const page = await open('/wishlist', options);
        try {
          assert.ok(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-wishlist-empty]'))`), JSON.stringify(options));
          assert.equal(await count(page), null);
          assert.deepEqual(page.errors, []);
        } finally {
          await page.close();
        }
      }
    });
  });

  describe('/wishlist', () => {
    test('cards grouped by type, one h1, and a remove button on each', async () => {
      const page = await open('/wishlist', { saved: [ISLAND, YALA, ELLA] });
      try {
        const shown = await page.evaluate<{ h1: number; groups: string[]; headings: string[]; title: string; robots: string | null; cards: number; saves: number }>(`({
          h1: document.querySelectorAll('h1').length,
          groups: [...document.querySelectorAll('[data-wishlist-group]')].map((el) => el.dataset.wishlistGroup),
          headings: [...document.querySelectorAll('[data-wishlist-group] h2')].map((el) => el.textContent),
          title: document.title,
          robots: document.querySelector('meta[name="robots"]')?.content ?? null,
          cards: document.querySelectorAll('[data-wishlist-group] a.te-card').length,
          saves: document.querySelectorAll('main [data-save]').length
        })`);
        assert.equal(shown.h1, 1);
        assert.deepEqual(shown.groups, ['destination', 'experience', 'tour']);
        assert.deepEqual(shown.headings, ['Destinations', 'Experiences', 'Tours']);
        assert.match(shown.title, /wishlist/i);
        assert.equal(shown.robots, 'noindex');
        assert.equal(shown.cards, 3);
        assert.equal(shown.saves, 0, 'Remove here, not Save and Remove');
      } finally {
        await page.close();
      }
    });

    test('remove takes one item; clear all asks first; then the empty state links on', async () => {
      const page = await open('/wishlist', { saved: [ELLA, YALA, ISLAND] });
      try {
        await click(page, `document.querySelector('[data-wishlist-remove="experience:safari-yala"]')`);
        assert.deepEqual(await stored(page), [ELLA, ISLAND]);
        assert.equal(await count(page), '2');
        assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-wishlist-group="experience"]'))`), false, 'an empty group goes');

        await click(page, `document.querySelector('[data-wishlist-clear]')`);
        assert.deepEqual(await stored(page), [ELLA, ISLAND], 'asked, not cleared');
        await click(page, `document.querySelector('[data-wishlist-clear-no]')`);
        assert.deepEqual(await stored(page), [ELLA, ISLAND], 'kept');

        await click(page, `document.querySelector('[data-wishlist-clear]')`);
        await click(page, `document.querySelector('[data-wishlist-clear-yes]')`);
        assert.equal(await stored(page), null);
        assert.equal(await count(page), null);

        const empty = await page.evaluate<{ links: string[]; h1: number }>(`({
          links: [...document.querySelectorAll('[data-wishlist-empty] a')].map((a) => a.getAttribute('href')),
          h1: document.querySelectorAll('h1').length
        })`);
        assert.deepEqual(empty.links, ['/destinations', '/tours']);
        assert.equal(empty.h1, 1);
      } finally {
        await page.close();
      }
    });

    test('the header icon and the footer link lead here; /plan, /explore and a destination link here too', async () => {
      for (const path of ['/plan', '/explore', '/destinations/ella']) {
        const page = await open(path);
        try {
          assert.equal(await page.evaluate<string>(`document.querySelector('main [data-wishlist-link]').getAttribute('href')`), '/wishlist', path);
          assert.equal(await page.evaluate<string>(`[...document.querySelectorAll('footer a')].find((a) => a.textContent.trim() === 'Wishlist').getAttribute('href')`), '/wishlist', 'footer');
          assert.equal(await page.evaluate<string>(`${headerIcon}.getAttribute('href')`), '/wishlist', 'header');
        } finally {
          await page.close();
        }
      }
    });

    test('no new top-level link in the header', async () => {
      const page = await open('/about');
      try {
        const labels = await page.evaluate<string[]>(`[...document.querySelectorAll('.te-nav-links a')].map((a) => a.textContent.trim())`);
        assert.deepEqual(labels, ['Explore map', 'Destinations', 'Experiences', 'Tours', 'Journal', 'About', 'Contact']);
      } finally {
        await page.close();
      }
    });

    for (const [width, label] of [[1280, 'desktop'], [390, 'phone']] as const) {
      test(`the empty state holds AA in both themes, ${label}`, async () => {
        const decoder = await newDecoder(chrome);
        try {
          for (const theme of ['light', 'dark'] as const) {
            const tabPage = await chrome.newPage();
            await tabPage.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
            await saveTheme(tabPage, theme);
            await tabPage.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.removeItem('${KEY}'); } catch {}` });
            await tabPage.send('Page.navigate', { url: `${app.baseUrl}/wishlist` });
            await waitFor(tabPage, `document.querySelector('[data-wishlist-empty]') && document.querySelector('footer')`, 'the empty state');
            await tabPage.evaluate('document.fonts.ready.then(() => true)');
            await sleep(400);
            assert.deepEqual([...new Set(await shortfalls(tabPage, decoder, { roots: 'main', skip: '.leaflet-container', viewportHeight: 900 }))], [], theme);
            const { targetInfo } = (await tabPage.send('Target.getTargetInfo')) as { targetInfo: { targetId: string } };
            await tabPage.send('Target.closeTarget', { targetId: targetInfo.targetId });
          }
        } finally {
          const { targetInfo } = (await decoder.send('Target.getTargetInfo')) as { targetInfo: { targetId: string } };
          await decoder.send('Target.closeTarget', { targetId: targetInfo.targetId }).catch(() => undefined);
        }
      });
    }

    test('the empty state fits at 120%', async () => {
      await pool.query('update public.site_settings set text_size = 120 where id');
      for (const width of [320, 375, 1280]) {
        const page = await open('/wishlist', { width });
        try {
          await page.evaluate('document.fonts.ready.then(() => true)');
          assert.deepEqual(await page.evaluate<string[]>(TEXT_AUDIT), [], `${width} px`);
        } finally {
          await page.close();
        }
      }
    });

    test('the badge: a circle outside the heart, unclipped, bold, in both themes and at 120%', async () => {
      try {
        for (const textSize of [120, 100]) {
          await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
          for (const width of [1440, 480]) {
            for (const theme of ['light', 'dark'] as const) {
              const page = await open('/about', { saved: [ELLA], width, script: `try { localStorage.setItem('site:theme', '${theme}'); } catch {}` });
              try {
                const where = `${textSize}% ${width} px ${theme}`;
                const badge = await page.evaluate<{ width: number; height: number; size: number; weight: number; overflow: string; heart: { left: number; right: number; top: number; bottom: number }; box: { left: number; right: number; top: number; bottom: number }; fill: string; ring: string; inside: boolean; label: string }>(`(() => {
                  const icon = ${headerIcon};
                  const el = icon.querySelector('.te-wish-count');
                  const s = getComputedStyle(el);
                  const r = el.getBoundingClientRect();
                  return {
                    width: r.width, height: r.height, size: parseFloat(s.fontSize), weight: Number(s.fontWeight),
                    overflow: getComputedStyle(icon).overflow, heart: icon.querySelector('svg').getBoundingClientRect().toJSON(), box: r.toJSON(),
                    fill: getComputedStyle(icon.querySelector('svg')).fill, ring: s.boxShadow, label: icon.getAttribute('aria-label'),
                    inside: r.top >= 0 && r.right <= innerWidth
                  };
                })()`);
                assert.ok(badge.width >= 18 && badge.height >= 18, `${where}: at least 18 px: ${badge.width}x${badge.height}`);
                assert.equal(badge.overflow, 'visible', `${where}: not clipped`);
                assert.ok(badge.inside, `${where}: inside the window`);
                // In rem, as all type is: 12 px at 100%, scaling with the admin's text size.
                assert.equal(badge.size, 12 * textSize / 100, where);
                assert.ok(badge.weight >= 700, where);
                // The heart's glyph sits about a sixth inside its box, so its corner is empty: the badge sits there.
                const inset = (badge.heart.right - badge.heart.left) / 6;
                assert.ok(badge.box.bottom <= badge.heart.top + inset * 2 && badge.box.left >= badge.heart.right - inset * 2, `${where}: in the corner, off the heart: ${JSON.stringify(badge)}`);
                assert.notEqual(badge.fill, 'none', `${where}: the heart fills`);
                assert.match(badge.ring, /2px/, `${where}: the ring`);
                assert.equal(badge.label, 'Wishlist, 1 saved', where);
              } finally {
                await page.close();
              }
            }
          }
        }
      } finally {
        await pool.query('update public.site_settings set text_size = 100 where id');
      }
    });

    test('the badge shows 9+ above 9, the real count stays in the label, and the heart empties at 0', async () => {
      const content = await (await fetch(`${app.baseUrl}/api/content`)).json() as SiteContentPayload;
      const ten = content.destinations.slice(0, 10).map((d) => ({ kind: 'destination', id: d.id }));
      assert.equal(ten.length, 10, 'precondition: ten published destinations');
      for (const [saved, shown, label] of [[ten.slice(0, 9), '9', 'Wishlist, 9 saved'], [ten, '9+', 'Wishlist, 10 saved']] as const) {
        const page = await open('/about', { saved: [...saved] });
        try {
          assert.equal(await count(page), shown);
          assert.equal(await page.evaluate<string>(`${headerIcon}.getAttribute('aria-label')`), label);
          assert.deepEqual(await page.evaluate<string[]>(TEXT_AUDIT), [], shown);
        } finally {
          await page.close();
        }
      }
      const empty = await open('/about');
      try {
        assert.equal(await empty.evaluate<string>(`getComputedStyle(${headerIcon}.querySelector('svg')).fill`), 'none', 'an outline with nothing saved');
      } finally {
        await empty.close();
      }
    });

    test('the count holds AA in both themes, and over the home page\'s photo', async () => {
      const luminance = (rgb: number[]) => {
        const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a: number[], b: number[]) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      for (const path of ['/about', '/']) {
        for (const theme of ['light', 'dark'] as const) {
          const page = await open(path, { saved: [ELLA], script: `try { localStorage.setItem('site:theme', '${theme}'); } catch {}` });
          try {
            const colours = await page.evaluate<{ fg: string; bg: string }>(`(() => {
              const style = getComputedStyle(${headerIcon}.querySelector('.te-wish-count'));
              return { fg: style.color, bg: style.backgroundColor };
            })()`);
            const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
            assert.ok(ratio(parse(colours.fg), parse(colours.bg)) >= 4.5, `${path} ${theme}: ${colours.fg} on ${colours.bg}`);
          } finally {
            await page.close();
          }
        }
      }
    });
  });

  describe('the keyboard', () => {
    test('Tab reaches Save, the ring shows, Space and Enter toggle it, and focus stays', async () => {
      const page = await open('/destinations/ella');
      try {
        await page.evaluate(`[...document.querySelectorAll('.te-page-breadcrumbs a')].at(-1).focus(), true`);
        await tab(page);
        assert.equal(await page.evaluate<string>('document.activeElement.dataset.save'), 'destination:ella');
        const ring = await page.evaluate<{ visible: boolean; style: string; width: string }>(`(() => {
          const el = document.activeElement, style = getComputedStyle(el);
          return { visible: el.matches(':focus-visible'), style: style.outlineStyle, width: style.outlineWidth };
        })()`);
        assert.deepEqual(ring, { visible: true, style: 'solid', width: '3px' });

        await space(page);
        assert.equal(await pressed(page, ELLA), 'true', 'Space');
        await enter(page);
        assert.equal(await pressed(page, ELLA), 'false', 'Enter');
        assert.equal(await page.evaluate<string>('document.activeElement.dataset.save'), 'destination:ella', 'focus stays');
      } finally {
        await page.close();
      }
    });

    test('on the photo-first card, Tab reaches Save and Escape goes to the card\'s own button', async () => {
      const page = await open('/destinations');
      try {
        await page.evaluate(`document.querySelector('.destination-card .destination-card__toggle').focus(), true`);
        await tab(page);
        assert.match(await page.evaluate<string>('document.activeElement.dataset.save ?? ""'), /^destination:/);
        await space(page);
        assert.equal(await page.evaluate<string>(`document.activeElement.getAttribute('aria-pressed')`), 'true');
        await escape(page);
        assert.ok(await page.evaluate<boolean>(`document.activeElement.classList.contains('destination-card__toggle')`));
      } finally {
        await page.close();
      }
    });

    test('removing moves focus to the next Remove, then to the heading; clear all keeps focus sensible', async () => {
      const page = await open('/wishlist', { saved: [ELLA, YALA, ISLAND] });
      try {
        await page.evaluate(`document.querySelector('[data-wishlist-remove="destination:ella"]').focus(), true`);
        await enter(page);
        await sleep(60);
        assert.equal(await page.evaluate<string>('document.activeElement.dataset.wishlistRemove'), 'experience:safari-yala');

        await page.evaluate(`document.querySelector('[data-wishlist-clear]').focus(), true`);
        await enter(page);
        await sleep(60);
        assert.ok(await page.evaluate<boolean>(`document.activeElement.matches('[data-wishlist-clear-no]')`), 'the safe choice');
        await enter(page);
        await sleep(60);
        assert.ok(await page.evaluate<boolean>(`document.activeElement.matches('[data-wishlist-clear]')`), 'back where it was');

        await page.evaluate(`document.querySelector('[data-wishlist-remove="experience:safari-yala"]').focus(), true`);
        await enter(page);
        await sleep(60);
        await enter(page);
        await sleep(100);
        assert.equal(await page.evaluate<string>('document.activeElement.tagName'), 'H1', 'nothing left: the heading');
      } finally {
        await page.close();
      }
    });
  });

  describe('sending the list', () => {
    const setValue = (selector: string, value: string) => `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`;
    const openForm = async (page: Page) => {
      await click(page, `document.querySelector('[data-wishlist-send]')`);
      await waitFor(page, `document.querySelector('[role="dialog"] textarea')`, 'the enquiry form');
    };

    test('the enquiry opens with the items listed, and goes through the same route', async () => {
      const page = await open('/wishlist', { saved: [ISLAND, ELLA, YALA] });
      try {
        assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('[role="dialog"]'))`), false, 'no form until asked');
        await openForm(page);
        const message = await page.evaluate<string>(`document.querySelector('[role="dialog"] textarea').value`);
        assert.match(message, /Destinations\n- Ella/);
        assert.match(message, /Experiences\n- .*Yala/i);
        assert.match(message, /Tours\n- Island in 7 Days/i);

        // The visitor's own edit goes too.
        await page.evaluate(setValue('[role="dialog"] textarea', `${message}\n\nTwo adults in March.`));
        await page.evaluate(setValue('[role="dialog"] input[name="name"]', 'Asha Perera'));
        await page.evaluate(setValue('[role="dialog"] input[name="email"]', 'asha@example.test'));
        await click(page, `document.querySelector('[role="dialog"] button[type="submit"]')`);
        await waitFor(page, `document.querySelector('[role="dialog"] [role="status"]')`, 'the thank-you');

        const { rows } = await pool.query<{ subject: string; message: string; spam: boolean; name: string }>('select subject, message, spam, name from public.inquiries');
        assert.equal(rows.length, 1);
        assert.equal(rows[0].subject, 'Wishlist: 3 saved items');
        assert.match(rows[0].message, /- Ella/);
        assert.match(rows[0].message, /Two adults in March\.$/);
        assert.equal(rows[0].spam, false);
        assert.equal(rows[0].name, 'Asha Perera');
        assert.equal((await stored(page))!.length, 3, 'sending keeps the list');
      } finally {
        await page.close();
      }
    });

    test('the same validation: no name, no send', async () => {
      const page = await open('/wishlist', { saved: [ELLA] });
      try {
        await openForm(page);
        await page.evaluate(setValue('[role="dialog"] input[name="email"]', 'asha@example.test'));
        await click(page, `document.querySelector('[role="dialog"] button[type="submit"]')`);
        await sleep(300);
        const { rows } = await pool.query('select id from public.inquiries');
        assert.equal(rows.length, 0);
        assert.ok(await page.evaluate<boolean>(`Boolean(document.querySelector('[role="dialog"] form'))`), 'the form is still open');
      } finally {
        await page.close();
      }
    });

    test('the same spam protection: the honeypot marks it as spam', async () => {
      const page = await open('/wishlist', { saved: [ELLA] });
      try {
        await openForm(page);
        await page.evaluate(setValue('[role="dialog"] input[name="leave_blank_hp"]', 'https://spam.example'));
        await page.evaluate(setValue('[role="dialog"] input[name="name"]', 'A Bot'));
        await page.evaluate(setValue('[role="dialog"] input[name="email"]', 'bot@example.test'));
        await click(page, `document.querySelector('[role="dialog"] button[type="submit"]')`);
        await waitFor(page, `document.querySelector('[role="dialog"] [role="status"]')`, 'the thank-you');
        const { rows } = await pool.query<{ spam: boolean }>('select spam from public.inquiries');
        assert.equal(rows[0].spam, true);
      } finally {
        await page.close();
      }
    });

    test('Enter opens it, Escape closes it, and focus comes back', async () => {
      const page = await open('/wishlist', { saved: [ELLA] });
      try {
        await page.evaluate(`document.querySelector('[data-wishlist-send]').focus(), true`);
        await enter(page);
        await waitFor(page, `document.querySelector('[role="dialog"] textarea')`, 'the form');
        await waitFor(page, `document.querySelector('[role="dialog"]').contains(document.activeElement)`, 'focus in the dialog');
        await escape(page);
        await waitFor(page, `!document.querySelector('[role="dialog"]')`, 'the dialog closed');
        await waitFor(page, `document.activeElement.matches('[data-wishlist-send]')`, 'focus back on the button');
      } finally {
        await page.close();
      }
    });

    test('the form stays out of the page\'s own chunk: it opens through the layout, still lazy', () => {
      const source = readFileSync(join(ROOT, 'src', 'pages', 'WishlistPage.tsx'), 'utf8');
      assert.doesNotMatch(source, /InquiryModal|InquiryForm/);
      assert.match(readFileSync(join(ROOT, 'src', 'pages', 'PublicLayout.tsx'), 'utf8'), /lazy\(\(\) => loadInquiryModal\(\)/);
    });
  });

  describe('where the browser blocks storage', () => {
    for (const [name, script] of [['reading it throws', BLOCKED_READ], ['writing to it throws', BLOCKED_WRITE]] as const) {
      test(`${name}: no buttons, no icon, no links, and nothing breaks`, async () => {
        for (const path of ['/', '/destinations', '/destinations/ella', '/experiences/safari-yala', '/tours', '/tours/island-in-7-days', '/plan', '/explore']) {
          const page = await open(path, { script });
          try {
            const shown = await page.evaluate<{ saves: number; icons: number; links: number; footer: number; h1: number; cards: number }>(`({
              saves: document.querySelectorAll('[data-save]').length,
              icons: document.querySelectorAll('[data-wishlist-icon]').length,
              links: document.querySelectorAll('[data-wishlist-link]').length,
              footer: [...document.querySelectorAll('footer a')].filter((a) => a.textContent.trim() === 'Wishlist').length,
              h1: document.querySelectorAll('main h1').length,
              cards: document.querySelectorAll('main a, main button').length
            })`);
            assert.deepEqual({ ...shown, cards: shown.cards > 0 }, { saves: 0, icons: 0, links: 0, footer: 0, h1: 1, cards: true }, path);
            assert.deepEqual(page.errors, [], path);
          } finally {
            await page.close();
          }
        }
      });

      test(`${name}: /wishlist explains itself, with links on`, async () => {
        const page = await open('/wishlist', { script });
        try {
          const shown = await page.evaluate<{ blocked: boolean; links: string[]; h1: number }>(`({
            blocked: Boolean(document.querySelector('[data-wishlist-blocked]')),
            links: [...document.querySelectorAll('[data-wishlist-blocked] a')].map((a) => a.getAttribute('href')),
            h1: document.querySelectorAll('main h1').length
          })`);
          assert.deepEqual(shown, { blocked: true, links: ['/destinations', '/tours'], h1: 1 });
          assert.deepEqual(page.errors, []);
        } finally {
          await page.close();
        }
      });
    }

    test('the phone menu has no wishlist link either', async () => {
      const page = await open('/about', { script: BLOCKED_READ, width: 375 });
      try {
        await click(page, `document.querySelector('[aria-controls="mobile-navigation"]')`);
        await waitFor(page, `document.querySelector('#mobile-navigation a')`, 'the menu');
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('#mobile-navigation a[href="/wishlist"]').length`), 0);
      } finally {
        await page.close();
      }
    });

    test('storage that fails later: the save is refused, the buttons go, and nothing breaks', async () => {
      const page = await open('/destinations/ella');
      try {
        await page.evaluate(`${BLOCKED_WRITE} true`);
        await click(page, save(ELLA));
        await waitFor(page, `!document.querySelector('[data-save]')`, 'the buttons to go');
        assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('main h1'))`), true);
        assert.deepEqual(page.errors, []);
      } finally {
        await page.close();
      }
    });
  });

  describe('a phone', () => {
    test('the header fits every phone width at every text size, with the icon or without it', async () => {
      try {
        for (const textSize of [100, 110, 120]) {
          await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
          for (const width of [320, 344, 360, 375, 384, 390, 393, 412, 414, 430, 480, 600]) {
            const page = await open('/about', { saved: [ELLA, YALA, ISLAND], width });
            try {
              await page.evaluate('document.fonts.ready.then(() => true)');
              const shown = await page.evaluate<{ right: number; overlap: boolean; small: string[] }>(`(() => {
                const row = document.querySelector('.te-nav .te-container > div');
                const groups = [...row.children].filter((el) => el.getClientRects().length > 0).map((el) => el.getBoundingClientRect());
                const controls = [...document.querySelectorAll('.te-nav a, .te-nav button')].filter((el) => el.getClientRects().length > 0);
                return {
                  right: Math.max(...controls.map((el) => el.getBoundingClientRect().right)),
                  overlap: groups.some((r, i) => i > 0 && r.left < groups[i - 1].right),
                  small: controls.filter((el) => el.classList.contains('te-button--icon') && el.getBoundingClientRect().height < 44).map((el) => el.getAttribute('aria-label'))
                };
              })()`);
              const where = `${width} px at ${textSize}%`;
              assert.ok(shown.right <= width, `${where}: the header ends at ${shown.right}`);
              assert.equal(shown.overlap, false, `${where}: nothing overlaps`);
              assert.deepEqual(shown.small, [], `${where}: 44 px controls`);
            } finally {
              await page.close();
            }
          }
        }
      } finally {
        await pool.query('update public.site_settings set text_size = 100 where id');
      }
    });

    test('the icon shows on common phones, and the phone menu always has the link and the count', async () => {
      for (const [width, icon] of [[320, false], [360, true], [375, true], [390, true], [430, true]] as const) {
        const page = await open('/about', { saved: [ELLA, ISLAND], width });
        try {
          const shown = await page.evaluate<{ icon: boolean; right: number; overlap: boolean }>(`(() => {
            const row = document.querySelector('.te-nav .te-container > div');
            const groups = [...row.children].filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.getBoundingClientRect());
            return {
              icon: Boolean(${headerIcon}),
              right: Math.max(...[...document.querySelectorAll('.te-nav a, .te-nav button')].filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0).map((el) => el.getBoundingClientRect().right)),
              overlap: groups.some((r, i) => i > 0 && r.left < groups[i - 1].right)
            };
          })()`);
          assert.equal(shown.icon, icon, `${width} px`);
          assert.ok(shown.right <= width, `${width} px: the header ends at ${shown.right}`);
          assert.equal(shown.overlap, false, `${width} px: nothing overlaps`);
          await click(page, `document.querySelector('[aria-controls="mobile-navigation"]')`);
          await waitFor(page, `document.querySelector('#mobile-navigation a[href="/wishlist"]')`, 'the link in the menu');
          assert.match(await page.evaluate<string>(`document.querySelector('#mobile-navigation a[href="/wishlist"]').textContent`), /Wishlist \(2\)/);
        } finally {
          await page.close();
        }
      }
    });
  });
});
