// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * /when-to-go on the real built site, with real browser input (CDP):
 *
 *   - it opens on this month in Sri Lanka; the slider works from the keyboard and reads out the month;
 *   - a new month changes the markers and the "best places" lists, and focus stays on the slider;
 *   - places with no months are "not set" on the map, and in no list;
 *   - suitability is never colour alone: each state has its own icon, and words in the legend and popup;
 *   - the popup from the keyboard, and back; AA on the legend's and the popup's text, both themes;
 *   - at 120% text, three widths, both themes: no sideways scroll, nothing clipped or overlapping;
 *   - markers clear of the map's controls and each other; the floating buttons clear of the controls;
 *   - the Discover link, the links from /plan, /explore and a destination page; one h1; nothing the CSP blocks;
 *   - the explainer comes from settings, and goes when it's empty;
 *   - the admin's month picker: loads, select all and clear, saves, and the page follows.
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { monthInColombo, MONTH_NAMES } from '../../shared/best-months';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, SAMPLE_WISHLIST, saveTheme, saveWishlist, type Chrome, type Page } from './chrome';
import { CONTRAST } from './contrast';
import { COVERED } from './floating';
import { assertConnectedToTestDatabase, createUser, listen, migrateTestDatabase, PASSWORD, resetAuthTables, resetContent, type RunningApp } from './helpers';
import { SCROLL_THROUGH, TEXT_AUDIT } from './text-audit';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

const SLIDER = `document.querySelector('[data-month-slider] input')`;
const MARKERS = `[...document.querySelectorAll('[data-season-map] .leaflet-marker-icon')]`;
const marker = (id: string) => `document.querySelector('[data-season-map] [data-destination="${id}"]')`;
const JANUARY = 1;
const JULY = 7;

const KEYS: Record<string, { code: string; vk: number; text?: string }> = {
  Enter: { code: 'Enter', vk: 13, text: '\r' },
  ' ': { code: 'Space', vk: 32, text: ' ' },
  Escape: { code: 'Escape', vk: 27 },
  Tab: { code: 'Tab', vk: 9 },
  ArrowRight: { code: 'ArrowRight', vk: 39 },
  ArrowLeft: { code: 'ArrowLeft', vk: 37 },
  ArrowUp: { code: 'ArrowUp', vk: 38 },
  ArrowDown: { code: 'ArrowDown', vk: 40 },
  Home: { code: 'Home', vk: 36 },
  End: { code: 'End', vk: 35 }
};

describe('/when-to-go, in Chrome', { skip, timeout: 8 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetAuthTables();
    await createUser();
    app = await listen(createApp({ media: null, bookings: true }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  async function poll(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(40);
    }
  }

  const closePage = (page: Page) => page.send('Page.close').catch(() => undefined);

  async function openPage(path: string, options: { width?: number; height?: number; theme?: 'light' | 'dark'; mapReady?: boolean } = {}): Promise<Page> {
    const page = await chrome.newPage();
    const width = options.width ?? 1280;
    await page.send('Page.enable');
    await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: options.height ?? 900, deviceScaleFactor: 1, mobile: width < 500 });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await saveTheme(page, options.theme ?? 'light');
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(page, `document.readyState === 'complete' && document.body.dataset.route && document.querySelector('main h1') && document.querySelector('footer')`, path);
    await page.evaluate('document.fonts.ready.then(() => true)');
    if (options.mapReady !== false && path === '/when-to-go') await mapReady(page);
    return page;
  }

  /** The map is lazy: scrolled to, with every marker drawn and labelled for the month. */
  async function mapReady(page: Page): Promise<void> {
    await page.evaluate(`document.querySelector('[data-season-map]').scrollIntoView({ block: 'center', behavior: 'instant' }), true`);
    await poll(page, `${MARKERS}.length === 20 && ${MARKERS}.every((m) => m.dataset.suitability)`, 'the markers');
  }

  async function press(page: Page, key: string): Promise<void> {
    const { code, vk, text } = KEYS[key];
    await page.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
  }

  /** The slider moved as a person moves it: from the keyboard, or as React hears an input. */
  async function setMonth(page: Page, month: number): Promise<void> {
    await page.evaluate(`(() => {
      const input = ${SLIDER};
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${month}');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    await poll(page, `document.querySelector('[data-month-name]').textContent === ${JSON.stringify(MONTH_NAMES[month - 1])} && document.querySelector('[data-season-map] .leaflet-container')?.dataset.month === '${month}'`, `month ${month}`);
  }

  const monthShown = (page: Page) => page.evaluate<{ name: string; value: string; text: string | null; heading: string }>(`({
    name: document.querySelector('[data-month-name]').textContent,
    value: ${SLIDER}.value,
    text: ${SLIDER}.getAttribute('aria-valuetext'),
    heading: document.querySelector('[data-best-places="great"] h2').textContent
  })`);
  const suitabilities = (page: Page) => page.evaluate<Record<string, string>>(`Object.fromEntries(${MARKERS}.map((m) => [m.dataset.destination, m.dataset.suitability]))`);
  const listed = (page: Page, group: 'great' | 'ok') => page.evaluate<string[]>(`[...document.querySelectorAll('[data-best-places="${group}"] a[href^="/destinations/"]')].map((a) => a.getAttribute('href').slice('/destinations/'.length))`);

  test("it opens on this month in Sri Lanka, with one h1 and the page's title", async () => {
    const page = await openPage('/when-to-go');
    try {
      const expected = MONTH_NAMES[monthInColombo() - 1];
      assert.deepEqual(await monthShown(page), { name: expected, value: String(monthInColombo()), text: expected, heading: `Best places in ${expected}` });
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('h1').length`), 1);
      assert.equal(await page.evaluate<string>(`document.querySelector('h1').textContent`), 'When to go');
      assert.equal(await page.evaluate<string>('document.title'), 'When to go | Travel Eye');
      assert.equal(await page.evaluate<string>(`document.querySelector('label[for="' + ${SLIDER}.id + '"]').textContent`), 'Month', 'the slider has a label');
    } finally {
      await closePage(page);
    }
  });

  test("a clock in another time zone doesn't change the month: Sri Lanka's date decides", async () => {
    const page = await chrome.newPage();
    try {
      await page.send('Page.enable');
      await page.send('Emulation.setTimezoneOverride', { timezoneId: 'America/Los_Angeles' });
      // 19:00 UTC on 31 October: still October in Los Angeles, already November in Colombo.
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `{
        const Real = Date; const fixed = Real.UTC(2026, 9, 31, 19);
        window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
      }` });
      await page.send('Page.navigate', { url: `${app.baseUrl}/when-to-go` });
      await poll(page, `document.querySelector('[data-month-name]')`, 'the slider');
      assert.equal(await page.evaluate<string>(`new Date().getMonth() + ' ' + document.querySelector('[data-month-name]').textContent`), '9 November');
    } finally {
      await closePage(page);
    }
  });

  test('the keyboard: arrows both ways, Home and End; the month is named each time, and focus stays', async () => {
    const page = await openPage('/when-to-go');
    try {
      await setMonth(page, JANUARY);
      await page.evaluate(`${SLIDER}.focus(), true`);
      const expectMonth = async (month: number) => {
        const name = MONTH_NAMES[month - 1];
        await poll(page, `document.querySelector('[data-month-name]').textContent === ${JSON.stringify(name)}`, name, 3_000);
        assert.deepEqual(await monthShown(page), { name, value: String(month), text: name, heading: `Best places in ${name}` });
        assert.equal(await page.evaluate<boolean>(`document.activeElement === ${SLIDER}`), true, 'focus stays on the slider');
      };
      await press(page, 'ArrowRight');
      await expectMonth(2);
      await press(page, 'ArrowUp');
      await expectMonth(3);
      await press(page, 'ArrowLeft');
      await expectMonth(2);
      await press(page, 'ArrowDown');
      await expectMonth(1);
      await press(page, 'End');
      await expectMonth(12);
      await press(page, 'Home');
      await expectMonth(1);
      // What a screen reader gets besides the month: what changed.
      assert.match(await page.evaluate<string>(`document.querySelector('[data-season-status]').textContent`), /^January: \d+ great, \d+ OK\.$/);
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-season-status]').getAttribute('role')`), 'status');
    } finally {
      await closePage(page);
    }
  });

  test('changing the month changes the markers and the lists, exactly as the months say', async () => {
    const page = await openPage('/when-to-go');
    try {
      await setMonth(page, JULY);
      let on = await suitabilities(page);
      // Ella: December – April. Arugam Bay: May – September. Bentota: November – April. Dambulla: year-round.
      assert.equal(on.ella, 'not-ideal');
      assert.equal(on['arugam-bay'], 'great');
      assert.equal(on.bentota, 'not-ideal');
      assert.equal(on.dambulla, 'great');
      assert.equal(on.haputale, 'great', 'April – August');
      let great = await listed(page, 'great');
      assert.ok(great.includes('arugam-bay') && great.includes('dambulla'));
      assert.ok(!great.includes('ella') && !great.includes('bentota'));

      await setMonth(page, JANUARY);
      on = await suitabilities(page);
      assert.equal(on.ella, 'great');
      assert.equal(on['arugam-bay'], 'not-ideal');
      assert.equal(on.bentota, 'great');
      assert.equal(on.haputale, 'not-ideal');
      great = await listed(page, 'great');
      assert.ok(great.includes('ella') && great.includes('bentota'));
      assert.ok(!great.includes('arugam-bay'));

      // October is next to Trincomalee's own October? No: it's in it. November is next to it.
      await setMonth(page, 11);
      on = await suitabilities(page);
      assert.equal(on.trincomalee, 'ok', 'April – October');
      assert.ok((await listed(page, 'ok')).includes('trincomalee'), 'in the OK list');
      assert.ok(!(await listed(page, 'great')).includes('trincomalee'));
      // Every place is in exactly one group.
      const ok = await listed(page, 'ok');
      assert.deepEqual(Object.entries(on).filter(([, v]) => v === 'ok').map(([id]) => id).sort(), [...ok].sort());
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-best-places="ok"] h2').textContent`), 'Also OK in November');
    } finally {
      await closePage(page);
    }
  });

  test('great places come first, then OK ones, each with a Save button that saves', async () => {
    const page = await openPage('/when-to-go');
    try {
      await setMonth(page, 11);
      const order = await page.evaluate<string[]>(`[...document.querySelectorAll('[data-best-places]')].map((s) => s.dataset.bestPlaces)`);
      assert.deepEqual(order, ['great', 'ok']);
      const lists = await page.evaluate<{ cards: number; saves: number }[]>(`[...document.querySelectorAll('[data-best-places]')].map((s) => ({
        cards: s.querySelectorAll('a[href^="/destinations/"]').length,
        saves: s.querySelectorAll('[data-save^="destination:"]').length
      }))`);
      for (const { cards, saves } of lists) {
        assert.ok(cards > 0);
        assert.equal(saves, cards, 'a Save button on every card');
      }
      const first = `document.querySelector('[data-best-places="great"] [data-save^="destination:"]')`;
      const id = await page.evaluate<string>(`${first}.dataset.save`);
      await page.evaluate(`${first}.click(), true`);
      await poll(page, `${first}.getAttribute('aria-pressed') === 'true'`, 'saved', 3_000);
      assert.ok((await page.evaluate<string>(`localStorage.getItem('site:wishlist')`)).includes(id.split(':')[1]));
      await page.evaluate(`localStorage.removeItem('site:wishlist'), true`);
    } finally {
      await closePage(page);
    }
  });

  test('a place with no months is "not set" on the map, and in no list, in any month', async () => {
    await pool.query(`update public.destinations set best_months = '{}' where id = 'ella'`);
    const page = await openPage('/when-to-go');
    try {
      for (const month of [JANUARY, JULY, 12]) {
        await setMonth(page, month);
        assert.equal((await suitabilities(page)).ella, 'not-set', `month ${month}`);
        assert.ok(!(await listed(page, 'great')).includes('ella'));
        assert.ok(!(await listed(page, 'ok')).includes('ella'));
      }
      assert.equal(await page.evaluate<string>(`${marker('ella')}.getAttribute('aria-label')`), 'Ella: Not set');
      await page.evaluate(`${marker('ella')}.click(), true`);
      await poll(page, `document.querySelector('.te-season-popup')`, 'the popup', 5_000);
      const popup = await page.evaluate<string>(`document.querySelector('.te-season-popup').textContent`);
      assert.match(popup, /Not set/);
      assert.match(popup, /not set yet/);
    } finally {
      await closePage(page);
    }
  });

  test('when nothing fits a month, the list says so', async () => {
    await pool.query(`update public.destinations set best_months = '{3}'`);
    const page = await openPage('/when-to-go');
    try {
      await setMonth(page, JULY);
      assert.deepEqual(await listed(page, 'great'), []);
      assert.match(await page.evaluate<string>(`document.querySelector('[data-best-places="great"]').textContent`), /No place has July/);
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-best-places="ok"]').length`), 0);
    } finally {
      await closePage(page);
    }
  });

  test('never colour alone: each state has its own icon and fill, words in the legend, and words in the popup', async () => {
    await pool.query(`update public.destinations set best_months = '{}' where id = 'kandy'`);
    const page = await openPage('/when-to-go');
    try {
      await setMonth(page, JANUARY);
      const legend = await page.evaluate<Record<string, { text: string; icon: string; fill: string; ring: string }>>(`Object.fromEntries([...document.querySelectorAll('[data-season-legend] li')].map((li) => {
        const disc = li.querySelector('.te-season-disc');
        const s = getComputedStyle(disc);
        return [li.dataset.legend, { text: li.textContent, icon: disc.querySelector('svg').innerHTML, fill: s.backgroundColor, ring: s.borderStyle + ' ' + s.borderColor }];
      }))`);
      assert.deepEqual(Object.keys(legend), ['great', 'ok', 'not-ideal', 'not-set']);
      assert.match(legend.great.text, /^Great/);
      assert.match(legend.ok.text, /^OK/);
      assert.match(legend['not-ideal'].text, /^Not ideal/);
      assert.match(legend['not-set'].text, /^Not set/);
      assert.equal(new Set(Object.values(legend).map((l) => l.icon)).size, 4, 'four different icons');
      assert.equal(new Set(Object.values(legend).map((l) => `${l.fill} ${l.ring}`)).size, 4, 'four different looks');

      // The map draws the legend's icon, and says the same in words, for a screen reader and in the popup.
      const onMap = await page.evaluate<Record<string, { icon: string; label: string }>>(`Object.fromEntries(['ella', 'arugam-bay', 'kandy'].map((id) => {
        const m = document.querySelector('[data-season-map] [data-destination="' + id + '"]');
        return [m.dataset.suitability, { icon: m.querySelector('svg').innerHTML, label: m.getAttribute('aria-label') }];
      }))`);
      assert.equal(onMap.great.icon, legend.great.icon);
      assert.equal(onMap.great.label, 'Ella: Great in January');
      assert.equal(onMap['not-ideal'].icon, legend['not-ideal'].icon);
      assert.equal(onMap['not-ideal'].label, 'Arugam Bay: Not ideal in January');
      assert.equal(onMap['not-set'].icon, legend['not-set'].icon);

      await page.evaluate(`${marker('ella')}.click(), true`);
      await poll(page, `document.querySelector('.te-season-popup')`, 'the popup', 5_000);
      const popup = await page.evaluate<{ status: string; icon: string; when: string; link: string }>(`(() => {
        const p = document.querySelector('.te-season-popup');
        return { status: p.querySelector('[data-popup-status]').textContent, icon: p.querySelector('svg').innerHTML, when: p.querySelector('.te-season-popup__when').textContent, link: p.querySelector('a').getAttribute('href') };
      })()`);
      assert.deepEqual(popup, { status: 'Great in January', icon: legend.great.icon, when: 'Best time: December – April', link: '/destinations/ella' });

      // An open popup follows the month.
      await setMonth(page, JULY);
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-popup-status]').textContent`), 'Not ideal in July');
    } finally {
      await closePage(page);
    }
  });

  test('from the keyboard: Tab reaches a marker, Enter opens its popup with focus inside, Escape comes back', async () => {
    const page = await openPage('/when-to-go');
    try {
      await page.evaluate(`${marker('ella')}.focus(), true`);
      assert.equal(await page.evaluate<string>(`document.activeElement.getAttribute('role')`), 'button');
      await press(page, 'Enter');
      await poll(page, `document.activeElement.closest('.te-season-popup')`, 'focus in the popup', 5_000);
      assert.match(await page.evaluate<string>(`document.activeElement.textContent`), /Explore Ella/);
      await press(page, 'Escape');
      await poll(page, `!document.querySelector('.te-season-popup') && document.activeElement === ${marker('ella')}`, 'back on the marker', 3_000);
      await press(page, ' ');
      await poll(page, `document.querySelector('.te-season-popup')`, 'Space opens it too', 5_000);
      // The popup's link stays in the app.
      await page.evaluate(`window.__sameDocument = true; document.querySelector('.te-season-popup a').click(), true`);
      await poll(page, `document.body.dataset.route === '/destinations/ella'`, 'the destination page');
      assert.equal(await page.evaluate<boolean>('window.__sameDocument'), true, 'no full page load');
    } finally {
      await closePage(page);
    }
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`contrast, ${theme}: the slider's text, the legend and the popup hold AA; the disc's icons 3:1`, async () => {
      const page = await openPage('/when-to-go', { theme });
      try {
        await setMonth(page, JANUARY);
        await page.evaluate(`${marker('ella')}.click(), true`);
        // Leaflet fades a popup in, whatever the motion setting: measured once it has finished.
        await poll(page, `document.querySelector('.te-season-popup') && getComputedStyle(document.querySelector('.leaflet-popup')).opacity === '1'`, 'the popup', 5_000);
        await page.evaluate(CONTRAST);
        assert.deepEqual(await page.evaluate<string[]>(`__contrast(document.querySelector('[data-month-slider]'), 4.5)`), []);
        assert.deepEqual(await page.evaluate<string[]>(`__contrast(document.querySelector('[data-season-legend]'), 4.5)`), []);
        assert.deepEqual(await page.evaluate<string[]>(`__contrast(document.querySelector('.leaflet-popup-content'), 4.5)`), []);
        const icons = await page.evaluate<string[]>(`[...document.querySelectorAll('[data-season-legend] .te-season-disc')].flatMap((disc) => __contrast(disc, 3))`);
        assert.deepEqual(icons, []);
        // The slider's track and thumb, against the section behind them.
        const parts = await page.evaluate<{ track: number; thumb: number }>(`(() => {
          const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
          const lum = (css) => {
            probe.fillStyle = css;
            probe.fillRect(0, 0, 1, 1);
            const c = [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
            return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
          };
          const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
          const section = ${SLIDER}.closest('section');
          // Chrome gives no computed style for a range's parts, so: the tokens when-to-go.css paints them with.
          const token = (name) => {
            const probe = document.createElement('span');
            probe.style.color = 'var(' + name + ')';
            section.append(probe);
            const colour = getComputedStyle(probe).color;
            probe.remove();
            return colour;
          };
          const behind = getComputedStyle(section).backgroundColor;
          return { track: ratio(token('--text-secondary'), behind), thumb: ratio(token('--button-primary-bg'), behind) };
        })()`);
        assert.ok(parts.track >= 3, `the track: ${parts.track.toFixed(2)}`);
        assert.ok(parts.thumb >= 3, `the thumb: ${parts.thumb.toFixed(2)}`);
      } finally {
        await closePage(page);
      }
    });
  }

  for (const width of [375, 768, 1280]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`120% text at ${width} px, ${theme}: no sideways scroll, nothing clipped or overlapping, in two months, popup open`, async () => {
        await pool.query('update public.site_settings set text_size = 120 where id');
        const page = await openPage('/when-to-go', { width, theme });
        try {
          for (const month of [JANUARY, JULY]) {
            await setMonth(page, month);
            await page.evaluate(SCROLL_THROUGH);
            assert.deepEqual(await page.evaluate<string[]>(TEXT_AUDIT), [], `month ${month}`);
            assert.ok(await page.evaluate<boolean>(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), 'no sideways scroll');
          }
          await mapReady(page);
          await page.evaluate(`${marker('dambulla')}.click(), true`);
          await poll(page, `document.querySelector('.te-season-popup')`, 'the popup', 5_000);
          await sleep(350);
          const popup = await page.evaluate<{ left: number; right: number; clipped: string[] }>(`(() => {
            const p = document.querySelector('.leaflet-popup-content-wrapper');
            const map = document.querySelector('[data-season-map]').getBoundingClientRect();
            const r = p.getBoundingClientRect();
            return { left: r.left - map.left, right: map.right - r.right, clipped: [...p.querySelectorAll('p, a')].filter((e) => e.getBoundingClientRect().right > r.right + 1).map((e) => e.textContent) };
          })()`);
          assert.ok(popup.left >= 0 && popup.right >= 0, `the popup stays in the map: ${JSON.stringify(popup)}`);
          assert.deepEqual(popup.clipped, []);
          assert.equal(await page.evaluate<boolean>(`document.documentElement.scrollWidth > document.documentElement.clientWidth`), false);
        } finally {
          await closePage(page);
          await pool.query('update public.site_settings set text_size = 100 where id');
        }
      });
    }
  }

  for (const [width, height] of [[1920, 870], [1280, 800], [390, 844]]) {
    test(`at ${width}x${height}: the whole island is framed, no marker on a control or on another marker, and the floating buttons clear of the map's controls`, async () => {
      const page = await openPage('/when-to-go', { width, height });
      try {
        await sleep(300);
        const placed = await page.evaluate<{ markers: { id: string; left: number; top: number; right: number; bottom: number }[]; controls: { left: number; top: number; right: number; bottom: number }[]; map: { left: number; top: number; right: number; bottom: number } }>(`(() => {
          const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
          return {
            markers: ${MARKERS}.map((m) => ({ id: m.dataset.destination, ...box(m.querySelector('.map-marker-disc')) })),
            controls: [...document.querySelectorAll('[data-season-map] .leaflet-control')].map(box),
            map: box(document.querySelector('[data-season-map] .leaflet-container'))
          };
        })()`);
        assert.equal(placed.markers.length, 20);
        const hit = (a: typeof placed.controls[number], b: typeof placed.controls[number]) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        for (const m of placed.markers) {
          assert.ok(m.left >= placed.map.left && m.right <= placed.map.right && m.top >= placed.map.top && m.bottom <= placed.map.bottom, `${m.id} is on the map`);
          for (const control of placed.controls) assert.ok(!hit(m, control), `${m.id} is on a control`);
          // Round, so by their centres: a 32 px disc needs 32 px.
          for (const other of placed.markers) {
            if (other === m) continue;
            const apart = Math.hypot(m.left - other.left, m.top - other.top);
            assert.ok(apart >= 32, `${m.id} overlaps ${other.id}: ${apart.toFixed(1)} px apart`);
          }
        }

        // The floating stack moves clear once the page has stopped, wherever the map's controls come to rest.
        for (const block of ['start', 'center', 'end']) {
          await page.evaluate(`document.querySelector('[data-season-map]').scrollIntoView({ block: '${block}', behavior: 'instant' }), true`);
          await sleep(700);
          assert.deepEqual(await page.evaluate<string[]>(COVERED), [], `map at the ${block}`);
        }
        // In steps down the whole page, too.
        const total = await page.evaluate<number>('document.documentElement.scrollHeight');
        for (let y = 0; y < total; y += Math.round(height * 0.6)) {
          await page.evaluate(`window.scrollTo({ top: ${y}, behavior: 'instant' }), true`);
          await sleep(450);
          assert.deepEqual(await page.evaluate<string[]>(COVERED), [], `at ${y}`);
        }
      } finally {
        await closePage(page);
      }
    });
  }

  test('the links: Discover, the phone menu, the Footer, /plan, /explore and a destination page', async () => {
    let page = await openPage('/about', { mapReady: false });
    try {
      assert.ok(await page.evaluate<boolean>(`[...document.querySelectorAll('.te-nav-menu a')].some((a) => a.textContent.trim() === 'When to go' && a.getAttribute('href') === '/when-to-go')`), 'Discover');
      assert.ok(await page.evaluate<boolean>(`[...document.querySelectorAll('footer a')].some((a) => a.textContent.trim() === 'When to go' && a.getAttribute('href') === '/when-to-go')`), 'the Footer');
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('.te-nav-links > *').length`), 5, 'no new top-level item');
    } finally {
      await closePage(page);
    }
    page = await openPage('/about', { width: 375, mapReady: false });
    try {
      await page.evaluate(`document.querySelector('[aria-controls="mobile-navigation"]').click(), true`);
      await poll(page, `document.querySelector('#mobile-navigation a[href="/when-to-go"]')`, 'the phone menu');
    } finally {
      await closePage(page);
    }
    for (const path of ['/plan', '/explore', '/destinations/ella']) {
      page = await openPage(path, { mapReady: false });
      try {
        const link = `document.querySelector('main [data-when-to-go-link]')`;
        await poll(page, link, `${path}'s link`);
        assert.match(await page.evaluate<string>(`${link}.textContent`), /^See when to go/, path);
        assert.equal(await page.evaluate<number>(`${link}.querySelectorAll('svg').length`), 1, 'the arrow');
        await page.evaluate(`${link}.click(), true`);
        await poll(page, `document.body.dataset.route === '/when-to-go'`, `${path} to the page`);
      } finally {
        await closePage(page);
      }
    }
    // The best time line, on the destination page: right beside it.
    page = await openPage('/destinations/ella', { mapReady: false });
    try {
      assert.match(await page.evaluate<string>(`document.querySelector('main [data-when-to-go-link]').closest('.te-facts div').textContent`), /^Best seasonDecember – AprilSee when to go/);
    } finally {
      await closePage(page);
    }
  });

  test('Leaflet waits for the map; nothing the CSP blocks; no errors', async () => {
    const page = await chrome.newPage();
    const errors: string[] = [];
    try {
      await page.send('Page.enable');
      await page.send('Runtime.enable');
      page.on('Runtime.exceptionThrown', (event) => errors.push(JSON.stringify(event)));
      await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 500, deviceScaleFactor: 1, mobile: true });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__violations = []; document.addEventListener('securitypolicyviolation', (e) => window.__violations.push(e.violatedDirective + ' ' + e.blockedURI));` });
      await page.send('Page.navigate', { url: `${app.baseUrl}/when-to-go` });
      await poll(page, `document.querySelector('[data-season-map]')`, 'the page');
      await mapReady(page);
      await poll(page, `document.querySelector('[data-season-map] img.leaflet-tile')`, 'tiles requested');
      await setMonth(page, JULY);
      await page.evaluate(`${marker('ella')}.click(), true`);
      await poll(page, `document.querySelector('.te-season-popup')`, 'the popup', 5_000);
      assert.deepEqual(await page.evaluate<string[]>('window.__violations'), []);
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('link[data-leaflet]'))`), true);
    } finally {
      await closePage(page);
    }
  });

  test('the explainer comes from settings, a paragraph per blank line, and goes when it is empty', async () => {
    const original = (await pool.query<{ t: string }>('select when_to_go_explainer as t from public.site_settings where id')).rows[0].t;
    const paragraphs = (page: Page) => page.evaluate<string[]>(`[...document.querySelectorAll('[data-monsoon-explainer] p')].map((p) => p.textContent)`);
    let page = await openPage('/when-to-go', { mapReady: false });
    try {
      const shown = await paragraphs(page);
      assert.equal(shown.length, 5);
      assert.match(shown[1], /^Southwest monsoon, May to September/);
    } finally {
      await closePage(page);
    }
    try {
      await pool.query(`update public.site_settings set when_to_go_explainer = E'One.\\n\\nTwo.' where id`);
      page = await openPage('/when-to-go', { mapReady: false });
      assert.deepEqual(await paragraphs(page), ['One.', 'Two.']);
      await closePage(page);

      await pool.query('update public.site_settings set when_to_go_explainer = null where id');
      page = await openPage('/when-to-go', { mapReady: false });
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-monsoon-explainer]').length`), 0);
      await closePage(page);
    } finally {
      await pool.query('update public.site_settings set when_to_go_explainer = $1 where id', [original]);
    }
  });

  describe('the admin month picker', () => {
    async function adminPage(path: string, ready: string, width = 1280): Promise<Page> {
      const page = await chrome.newPage();
      await page.send('Page.enable');
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      await page.send('Page.navigate', { url: `${app.baseUrl}/admin/login` });
      // Every tab shares cookies, so after the first sign-in this page finds a session and
      // moves on to /admin: the form is there only for a moment, and a slow poll can miss it.
      await poll(page, `document.querySelector('#admin-email') || location.pathname === '/admin'`, 'the login page or the admin');
      assert.equal(await page.evaluate<number>(`fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} }) }).then((r) => r.status)`), 200);
      await page.send('Page.navigate', { url: app.baseUrl + path });
      await poll(page, ready, path);
      return page;
    }

    const PICKER = `document.querySelector('[data-month-picker]')`;
    const ticked = (page: Page) => page.evaluate<number[]>(`[...${PICKER}.querySelectorAll('input:checked')].map((i) => Number(i.value))`);
    const savedMonths = async () => (await pool.query<{ best_months: number[] }>(`select best_months from public.destinations where id = 'ella'`)).rows[0].best_months;

    test('it loads what is saved; select all, clear and single ticks work; a save stores them and the page follows', async () => {
      const page = await adminPage('/admin/destinations/ella', `${PICKER} && ${PICKER}.querySelectorAll('input:checked').length > 0`);
      try {
        assert.equal(await page.evaluate<number>(`${PICKER}.querySelectorAll('input[type=checkbox]').length`), 12);
        assert.equal(await page.evaluate<string>(`${PICKER}.querySelector('legend').textContent`), 'Best months');
        assert.deepEqual(await page.evaluate<string[]>(`[...${PICKER}.querySelectorAll('label')].map((l) => l.textContent.trim())`), [...MONTH_NAMES]);
        assert.deepEqual(await ticked(page), [1, 2, 3, 4, 12], 'loaded from the row');

        await page.evaluate(`${PICKER}.querySelector('[data-months-all]').click(), true`);
        await poll(page, `${PICKER}.querySelectorAll('input:checked').length === 12`, 'select all', 3_000);
        await page.evaluate(`${PICKER}.querySelector('[data-months-clear]').click(), true`);
        await poll(page, `${PICKER}.querySelectorAll('input:checked').length === 0`, 'clear', 3_000);

        // Ticked out of order, from the keyboard too: they save in month order.
        await page.evaluate(`${PICKER}.querySelector('input[value="8"]').click(), true`);
        await poll(page, `${PICKER}.querySelectorAll('input:checked').length === 1`, 'one tick', 3_000);
        await page.evaluate(`${PICKER}.querySelector('input[value="2"]').focus(), true`);
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        await poll(page, `${PICKER}.querySelectorAll('input:checked').length === 2`, 'a tick by keyboard', 3_000);
        assert.deepEqual(await ticked(page), [2, 8]);

        await page.evaluate(`[...document.querySelectorAll('button[type=submit]')].find((b) => /Save changes/.test(b.textContent)).click(), true`);
        await poll(page, `location.pathname === '/admin/destinations'`, 'saved, back on the list');
        assert.deepEqual(await savedMonths(), [2, 8]);

        await page.send('Page.navigate', { url: `${app.baseUrl}/admin/destinations/ella` });
        await poll(page, `${PICKER} && ${PICKER}.querySelectorAll('input:checked').length > 0`, 'the form again');
        assert.deepEqual(await ticked(page), [2, 8], 'and it loads again');
      } finally {
        await closePage(page);
      }
      const site = await openPage('/when-to-go');
      try {
        await setMonth(site, 2);
        assert.equal((await suitabilities(site)).ella, 'great');
        await setMonth(site, 3);
        assert.equal((await suitabilities(site)).ella, 'ok');
        await setMonth(site, 5);
        assert.equal((await suitabilities(site)).ella, 'not-ideal');
      } finally {
        await closePage(site);
      }
    });

    test('a new destination starts with none; clearing saves "not set"', async () => {
      const fresh = await adminPage('/admin/destinations/new', PICKER);
      try {
        assert.deepEqual(await ticked(fresh), []);
      } finally {
        await closePage(fresh);
      }
      const page = await adminPage('/admin/destinations/ella', `${PICKER} && ${PICKER}.querySelectorAll('input:checked').length > 0`);
      try {
        await page.evaluate(`${PICKER}.querySelector('[data-months-clear]').click(), true`);
        await poll(page, `${PICKER}.querySelectorAll('input:checked').length === 0`, 'clear', 3_000);
        await page.evaluate(`[...document.querySelectorAll('button[type=submit]')].find((b) => /Save changes/.test(b.textContent)).click(), true`);
        await poll(page, `location.pathname === '/admin/destinations'`, 'saved');
        assert.deepEqual(await savedMonths(), []);
      } finally {
        await closePage(page);
      }
    });

    test('it fits at 120% on a phone and a desktop; the explainer is a field in Settings', async () => {
      await pool.query('update public.site_settings set text_size = 120 where id');
      try {
        for (const width of [375, 1280]) {
          const page = await adminPage('/admin/destinations/ella', PICKER, width);
          try {
            await sleep(300);
            assert.deepEqual(await page.evaluate<string[]>(TEXT_AUDIT), [], `${width} px`);
          } finally {
            await closePage(page);
          }
        }
        const page = await adminPage('/admin/settings', `document.querySelector('#field-when_to_go_explainer')?.value`);
        try {
          assert.match(await page.evaluate<string>(`document.querySelector('#field-when_to_go_explainer').value`), /Southwest monsoon/);
        } finally {
          await closePage(page);
        }
      } finally {
        await pool.query('update public.site_settings set text_size = 100 where id');
      }
    });
  });

  test('saved items show in the header here as anywhere', async () => {
    const page = await chrome.newPage();
    try {
      await page.send('Page.enable');
      await saveWishlist(page, SAMPLE_WISHLIST);
      await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      await page.send('Page.navigate', { url: `${app.baseUrl}/when-to-go` });
      await poll(page, `document.querySelector('main [data-wishlist-link]')`, 'the wishlist link');
      assert.equal(await page.evaluate<string>(`document.querySelector('main [data-wishlist-link]').getAttribute('href')`), '/wishlist');
    } finally {
      await closePage(page);
    }
  });
});
