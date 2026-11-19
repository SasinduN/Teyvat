// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * `/tours` on phones: the tours are a row to swipe (docs/plans/tours-swipe-row.md).
 *
 *   - at 375 px a sideways swipe moves the row, snapping each card to the start, and an up or
 *     down swipe over it still scrolls the page; the counter and the dots follow;
 *   - a dot tap goes to its tour (instantly with reduced motion, smoothly otherwise); the dots
 *     are out of the Tab order and hidden from screen readers;
 *   - the arrows show on keyboard focus, move one tour and say where they went (live region);
 *   - Tab into a card brings it to the start of the row;
 *   - the cards are the same height, and their buttons keep out of the floating buttons' column;
 *   - at 320, 375 and 414 px, 100% and 120%, the page doesn't overflow sideways and the text
 *     audit is clean;
 *   - at 1280 px it's the list it was: no sideways scroll, photo beside text, no controls.
 *     (The pixels at 1280 are `browser-home-baseline`'s, against d233e32.)
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, afterEach, before, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { TEXT_AUDIT } from './text-audit';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

const LIST = '#tours ul[aria-label="Tour packages"]';
const TOURS = 4;

/** Where each card sits relative to the row's start (its scroll padding), and the row's own state. */
const ROW = `(() => {
  const list = document.querySelector('${LIST}');
  const pad = parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
  const start = list.getBoundingClientRect().left + pad;
  const cards = [...list.children].map((li) => li.getBoundingClientRect());
  return {
    scrollLeft: list.scrollLeft,
    scrollable: list.scrollWidth > list.clientWidth,
    offsets: cards.map((r) => Math.round(r.left - start)),
    widths: cards.map((r) => r.width),
    heights: cards.map((r) => Math.round(r.height)),
    tops: cards.map((r) => Math.round(r.top + scrollY)),
    count: document.querySelector('.te-tour-swipe__count [aria-hidden]')?.textContent,
    active: [...document.querySelectorAll('.te-tour-swipe__dot')].findIndex((d) => d.hasAttribute('data-active')),
    live: document.querySelector('.te-tour-swipe [aria-live]')?.textContent ?? ''
  };
})()`;

interface Row {
  scrollLeft: number; scrollable: boolean; offsets: number[]; widths: number[]; heights: number[]; tops: number[];
  count: string | undefined; active: number; live: string;
}

describe('/tours: the tours as a row to swipe on phones', { skip, timeout: 8 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  const open: Page[] = [];

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null, bookings: true }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  afterEach(async () => {
    await Promise.all(open.splice(0).map((page) => page.send('Page.close').catch(() => undefined)));
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
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(40);
    }
  }

  async function openTours(width: number, options: { reducedMotion?: boolean; theme?: 'light' | 'dark' } = {}): Promise<Page> {
    const page = await chrome.newPage();
    open.push(page);
    await page.send('Page.enable');
    const mobile = width < 768;
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: mobile ? 812 : 900, deviceScaleFactor: 1, mobile });
    if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: options.reducedMotion ? 'reduce' : 'no-preference' }] });
    await saveTheme(page, options.theme ?? 'light');
    await page.send('Page.navigate', { url: app.baseUrl + '/tours' });
    await poll(page, `document.body.dataset.route && document.querySelectorAll('${LIST} > li').length === ${TOURS} && document.fonts.status === 'loaded'`, '/tours');
    return page;
  }

  const row = (page: Page) => page.evaluate<Row>(ROW);

  /** Waits for the row to stop moving (a smooth scroll or a snap), then returns it. */
  async function settled(page: Page): Promise<Row> {
    let last = await row(page);
    for (let still = 0; still < 4;) {
      await sleep(60);
      const now = await row(page);
      still = now.scrollLeft === last.scrollLeft ? still + 1 : 0;
      last = now;
    }
    return last;
  }

  /** The row's middle, on screen. */
  async function rowCentre(page: Page): Promise<{ x: number; y: number }> {
    await page.evaluate(`document.querySelector('${LIST}').scrollIntoView({ block: 'center', behavior: 'instant' }), true`);
    await sleep(100);
    return page.evaluate(`(() => { const r = document.querySelector('${LIST} .te-ed-photo').getBoundingClientRect(); return { x: Math.round(innerWidth / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  }

  /** A finger dragged from one point to another, in small steps, as on a phone. */
  async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
    const steps = 8;
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
    for (let i = 1; i <= steps; i += 1) {
      const point = { x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps };
      await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
      await sleep(16);
    }
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  async function press(page: Page, key: 'Tab' | 'Enter', shift = false): Promise<void> {
    const vk = key === 'Tab' ? 9 : 13;
    const modifiers = shift ? 8 : 0;
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: vk, modifiers });
    if (key === 'Enter') await page.send('Input.dispatchKeyEvent', { type: 'char', key, text: '\r', modifiers });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: vk, modifiers });
  }

  test('at 375 px a sideways swipe moves the row a card at a time; the counter and dots follow', async () => {
    const page = await openTours(375);
    let state = await row(page);
    assert.ok(state.scrollable, 'the row scrolls sideways');
    assert.deepEqual(state.offsets.slice(0, 1), [0], 'the first card starts the row');
    assert.equal(state.count, `1 / ${TOURS}`);
    assert.equal(state.active, 0);
    // About 85% of the screen, so the next card peeks in.
    for (const w of state.widths) assert.ok(Math.abs(w - 375 * .85) <= 1, `a card is 85% of the screen (${w})`);
    assert.ok(state.offsets[1] < 375 - 16, 'the next card shows at the right');
    assert.equal(new Set(state.heights).size, 1, `the cards are the same height (${state.heights})`);

    const { y } = await rowCentre(page);
    await swipe(page, { x: 300, y }, { x: 60, y });
    state = await settled(page);
    assert.ok(state.scrollLeft > 0, 'the swipe moved the row');
    assert.ok(state.offsets.includes(0), `the row snaps a card to its start (${state.offsets})`);
    const shown = state.offsets.indexOf(0);
    assert.ok(shown >= 1, 'a later card is at the start');
    await poll(page, `(${ROW}).active === ${shown}`, 'the dots to follow');
    assert.equal((await row(page)).count, `${shown + 1} / ${TOURS}`, 'the counter follows');

    // Up and down over the row still scrolls the page, and leaves the row where it was.
    const before = await page.evaluate<number>('scrollY');
    await swipe(page, { x: 187, y: y + 100 }, { x: 187, y: y - 150 });
    await sleep(300);
    assert.ok(await page.evaluate<number>('scrollY') > before + 100, 'the page scrolled down');
    assert.equal((await settled(page)).scrollLeft, state.scrollLeft, 'the row stayed put');
  });

  test('a dot goes to its tour: instantly with reduced motion, smoothly without; the dots are pointer-only', async () => {
    for (const reducedMotion of [true, false]) {
      const page = await openTours(375, { reducedMotion });
      const dots = await page.evaluate<{ hidden: string | null; tabbable: boolean[] }>(`(() => ({
        hidden: document.querySelector('.te-tour-swipe__dots').getAttribute('aria-hidden'),
        tabbable: [...document.querySelectorAll('.te-tour-swipe__dot')].map((d) => d.tabIndex >= 0)
      }))()`);
      assert.equal(dots.hidden, 'true', 'the dots are hidden from screen readers');
      assert.deepEqual(dots.tabbable, Array(TOURS).fill(false), 'no dot is in the Tab order');

      // The third dot, read in the same task as the click: at the target already, or on its way.
      const jump = await page.evaluate<{ at: number; target: number }>(`(() => {
        const list = document.querySelector('${LIST}');
        const target = list.children[2].offsetLeft - list.children[0].offsetLeft;
        document.querySelectorAll('.te-tour-swipe__dot')[2].click();
        return { at: list.scrollLeft, target };
      })()`);
      if (reducedMotion) assert.ok(Math.abs(jump.at - jump.target) <= 1, `reduced motion: the row jumped (${jump.at} of ${jump.target})`);
      else assert.ok(jump.at < jump.target - 1, `the row scrolls smoothly (${jump.at} of ${jump.target} at once)`);
      const state = await settled(page);
      assert.equal(state.offsets[2], 0, 'the third tour is at the start');
      assert.equal(state.active, 2);
      assert.equal(state.count, `3 / ${TOURS}`);

      // A finger on the last dot.
      const last = await page.evaluate<{ x: number; y: number }>(`(() => {
        const d = [...document.querySelectorAll('.te-tour-swipe__dot')].at(-1);
        d.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = d.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [last] });
      await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await poll(page, `(${ROW}).active === ${TOURS - 1}`, 'the tapped dot');
      assert.equal((await settled(page)).count, `${TOURS} / ${TOURS}`);
      assert.ok(!(await page.evaluate<boolean>(`Boolean(document.activeElement?.closest('.te-tour-swipe__dots'))`)), 'a tap leaves no focus in the hidden dots');
      await page.send('Page.close').catch(() => undefined);
      open.splice(open.indexOf(page), 1);
    }
  });

  test('the arrows show on keyboard focus, move one tour, and say where they went', async () => {
    const page = await openTours(375);
    const next = `document.querySelector('.te-tour-swipe [aria-label="Next tour"]')`;
    const prev = `document.querySelector('.te-tour-swipe [aria-label="Previous tour"]')`;
    const width = (el: string) => page.evaluate<number>(`${el}.getBoundingClientRect().width`);
    assert.ok(await width(next) <= 1, 'out of sight until focused');

    // Keyboard: from the last card's last control, Tab reaches Previous, then Next.
    await page.evaluate(`[...document.querySelectorAll('${LIST} > li')].at(-1).querySelector('[data-save]').focus({ preventScroll: true }), true`);
    await press(page, 'Tab');
    assert.equal(await page.evaluate<string>('document.activeElement.getAttribute("aria-label")'), 'Previous tour');
    assert.ok(await width(next) >= 44 && await width(prev) >= 44, 'both arrows show while one has focus');
    await page.evaluate(`document.querySelector('${LIST}').scrollTo({ left: 0, behavior: 'instant' }), true`);
    await settled(page);
    await press(page, 'Tab');
    assert.equal(await page.evaluate<string>('document.activeElement.getAttribute("aria-label")'), 'Next tour');

    await press(page, 'Enter');
    let state = await settled(page);
    assert.equal(state.offsets[1], 0, 'Next went to the second tour');
    assert.equal(state.count, `2 / ${TOURS}`);
    assert.equal(state.live, 'Tour 2 of 4: Cultural Sri Lanka');
    assert.equal(await page.evaluate<string>(`document.querySelector('.te-tour-swipe__count .sr-only').textContent`), `Tour 2 of ${TOURS}`);

    await press(page, 'Tab', true);
    await press(page, 'Enter');
    state = await settled(page);
    assert.equal(state.offsets[0], 0, 'Previous went back to the first');
    assert.equal(await page.evaluate<string>(`${prev}.getAttribute('aria-disabled')`), 'true', 'Previous is disabled at the start');
    await press(page, 'Enter');
    assert.equal((await settled(page)).offsets[0], 0, 'and does nothing there');
    assert.equal(await page.evaluate<string>('document.activeElement.getAttribute("aria-label")'), 'Previous tour', 'focus stays on it');
  });

  test('Tab into a card brings it to the start of the row', async () => {
    const page = await openTours(375);
    await page.evaluate(`document.querySelector('${LIST} > li [data-save]').focus({ preventScroll: true }), true`);
    for (const card of [1, 2]) {
      await press(page, 'Tab');
      const focused = await page.evaluate<number>(`[...document.querySelectorAll('${LIST} > li')].findIndex((li) => li.contains(document.activeElement))`);
      assert.equal(focused, card, 'Tab moved into the next card');
      assert.equal((await settled(page)).offsets[card], 0, `card ${card + 1} at the start`);
      for (let i = 0; i < 2; i += 1) await press(page, 'Tab'); // Inquire, Save
    }
  });

  test('the card buttons keep clear of the floating buttons, at 320, 375 and 414 px, 100% and 120%', async () => {
    for (const textSize of [100, 120]) {
      await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
      for (const width of [320, 375, 414]) {
        const page = await openTours(width);
        await poll(page, `document.querySelectorAll('[data-floating-actions] a').length === 2`, 'the floating buttons');
        for (let card = 0; card < TOURS; card += 1) {
          const hits = await page.evaluate<string[]>(`(() => {
            const list = document.querySelector('${LIST}');
            const li = list.children[${card}];
            list.scrollTo({ left: li.offsetLeft - list.children[0].offsetLeft, behavior: 'instant' });
            const stack = [...document.querySelectorAll('[data-floating-actions] a')].map((a) => a.getBoundingClientRect());
            const left = Math.min(...stack.map((r) => r.left)) - 8;
            const controls = [...li.querySelectorAll('a, button'), ...document.querySelectorAll('.te-tour-swipe button')]
              .filter((el) => el.getBoundingClientRect().width > 1);
            return controls.filter((el) => el.getBoundingClientRect().right > left)
              .map((el) => (el.getAttribute('aria-label') || el.textContent.trim()) + ' reaches ' + Math.round(el.getBoundingClientRect().right) + ' (clear to ' + Math.round(left) + ')');
          })()`);
          assert.deepEqual(hits, [], `${width} px, ${textSize}%, card ${card + 1}`);
        }
        await page.send('Page.close').catch(() => undefined);
        open.splice(open.indexOf(page), 1);
      }
    }
  });

  test('no sideways page overflow and a clean text audit, at 320, 375 and 414 px, 100% and 120%, both themes', async () => {
    for (const textSize of [100, 120]) {
      await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
      for (const theme of ['light', 'dark'] as const) {
        for (const width of [320, 375, 414]) {
          const page = await openTours(width, { theme });
          const where = `${width} px, ${textSize}%, ${theme}`;
          const state = await row(page);
          assert.equal(new Set(state.heights).size, 1, `${where}: the cards are the same height (${state.heights})`);
          const overflow = await page.evaluate<{ scroll: number; client: number }>(`(() => {
            document.body.style.overflowX = 'visible';
            const out = { scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth };
            document.body.style.overflowX = '';
            return out;
          })()`);
          assert.ok(overflow.scroll <= overflow.client, `${where}: the page is ${overflow.scroll} px wide in ${overflow.client}`);
          await page.evaluate(`document.querySelector('#tours').scrollIntoView({ behavior: 'instant' }), true`);
          await sleep(200);
          assert.deepEqual(await page.evaluate<string[]>(TEXT_AUDIT), [], where);
          await page.send('Page.close').catch(() => undefined);
          open.splice(open.indexOf(page), 1);
        }
      }
    }
  });

  test('at 1280 px the tours are the list they were', async () => {
    const page = await openTours(1280);
    const state = await row(page);
    assert.equal(state.scrollable, false, 'no sideways scrolling');
    assert.ok(state.tops.every((top, i) => i === 0 || top > state.tops[i - 1]), 'one tour under another');
    const layout = await page.evaluate<{ controls: string; sideBySide: boolean[]; shown: boolean[] }>(`(() => ({
      controls: getComputedStyle(document.querySelector('.te-tour-swipe')).display,
      sideBySide: [...document.querySelectorAll('${LIST} .te-tour-row')].map((row) => {
        const photo = row.querySelector('.te-ed-photo').getBoundingClientRect();
        const body = row.querySelector('.te-tour-row__body').getBoundingClientRect();
        return photo.right <= body.left || body.right <= photo.left;
      }),
      shown: ['.te-tour-row__label', '.te-tour-row__route', '.te-tour-row__map'].map((s) => getComputedStyle(document.querySelector('${LIST} ' + s)).display !== 'none')
    }))()`);
    assert.equal(layout.controls, 'none', 'no counter, dots or arrows');
    assert.deepEqual(layout.sideBySide, Array(TOURS).fill(true), 'photo beside text');
    assert.deepEqual(layout.shown, [true, true, true], 'the label, the route and View route on map stay');
  });
});
