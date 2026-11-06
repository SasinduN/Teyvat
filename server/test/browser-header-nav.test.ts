// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The header's groups (NavDropdown) on the real built site: at most six top items, each
 * group a button that opens on click, Enter and Space; the arrow keys inside; closed by
 * Escape, a click outside, and tabbing out; the current page marked, inside a group too;
 * and it holds AA and fits in both themes and at every text size. Keys and clicks are real
 * browser input (CDP), not synthetic events.
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
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { CONTRAST } from './contrast';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

const trigger = (label: string) => `[...document.querySelectorAll('.te-nav-trigger')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`;
const menuOf = (label: string) => `${trigger(label)}.parentElement.querySelector('.te-nav-menu')`;
const isOpen = (label: string) => `${trigger(label)}.getAttribute('aria-expanded') === 'true' && !${menuOf(label)}.hidden && getComputedStyle(${menuOf(label)}).display !== 'none'`;
const isClosed = (label: string) => `${trigger(label)}.getAttribute('aria-expanded') === 'false' && ${menuOf(label)}.hidden && getComputedStyle(${menuOf(label)}).display === 'none'`;
const focused = `document.activeElement.textContent.trim()`;

describe('the header groups', { skip, timeout: 4 * 60_000 }, () => {
  let app: RunningApp;
  let off: RunningApp;
  let chrome: Chrome;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null, bookings: true }));
    off = await listen(createApp({ media: null, bookings: false }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  after(async () => {
    await resetContent();
    await chrome?.close();
    await Promise.all([app?.close(), off?.close()]);
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

  async function openPage(path: string, options: { width?: number; theme?: 'light' | 'dark'; site?: RunningApp } = {}): Promise<Page> {
    const page = await chrome.newPage();
    const width = options.width ?? 1280;
    await page.send('Page.enable');
    await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    await saveTheme(page, options.theme ?? 'light');
    await page.send('Page.navigate', { url: (options.site ?? app).baseUrl + path });
    await poll(page, `document.readyState === 'complete' && document.body.dataset.route && document.querySelector('main h1')`, path);
    await page.evaluate('document.fonts.ready.then(() => true)');
    return page;
  }

  const close = (page: Page) => page.send('Page.close').catch(() => undefined);

  const KEYS: Record<string, { code: string; vk: number; text?: string }> = {
    Enter: { code: 'Enter', vk: 13, text: '\r' },
    ' ': { code: 'Space', vk: 32, text: ' ' },
    Escape: { code: 'Escape', vk: 27 },
    Tab: { code: 'Tab', vk: 9 },
    ArrowDown: { code: 'ArrowDown', vk: 40 },
    ArrowUp: { code: 'ArrowUp', vk: 38 },
    Home: { code: 'Home', vk: 36 },
    End: { code: 'End', vk: 35 }
  };

  async function press(page: Page, key: string): Promise<void> {
    const { code, vk, text } = KEYS[key];
    await page.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
  }

  async function clickAt(page: Page, expression: string): Promise<void> {
    const point = await page.evaluate<{ x: number; y: number }>(`(() => { const r = (${expression}).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  }

  test('at most six top items, the logo is the way home, and Book Your Ride goes with the flag', async () => {
    const top = (page: Page) => page.evaluate<string[]>(`[...document.querySelectorAll('.te-nav-links > *')].map((el) => (el.querySelector('button') ?? el).childNodes[0].textContent.trim())`);
    let page = await openPage('/about');
    assert.deepEqual(await top(page), ['Discover', 'Tours', 'Book Your Ride', 'Journal', 'About']);
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('.te-nav-links a[href="/"]').length`), 0, 'no separate Home');
    assert.equal(await page.evaluate<string>(`document.querySelector('.te-home-link').getAttribute('href')`), '/');
    await close(page);
    page = await openPage('/about', { site: off });
    assert.deepEqual(await top(page), ['Discover', 'Tours', 'Journal', 'About']);
    await close(page);
  });

  test('a click opens and closes it; opening another closes the first; a click outside closes it', async () => {
    const page = await openPage('/about');
    try {
      assert.ok(await page.evaluate<boolean>(`${isClosed('Discover')} && ${isClosed('About')}`), 'closed at first');
      await clickAt(page, trigger('Discover'));
      await poll(page, isOpen('Discover'), 'open on click', 2_000);
      assert.deepEqual(await page.evaluate<string[]>(`[...${menuOf('Discover')}.querySelectorAll('a')].map((a) => a.textContent.trim())`), ['Explore map', 'Destinations', 'Experiences']);
      await clickAt(page, trigger('Discover'));
      await poll(page, isClosed('Discover'), 'closed on a second click', 2_000);

      await clickAt(page, trigger('Discover'));
      await poll(page, isOpen('Discover'), 'open again', 2_000);
      await clickAt(page, trigger('About'));
      await poll(page, `${isOpen('About')} && ${isClosed('Discover')}`, 'only one open', 2_000);

      await clickAt(page, `document.querySelector('main h1')`);
      await poll(page, isClosed('About'), 'closed on a click outside', 2_000);

      await clickAt(page, trigger('Discover'));
      await poll(page, isOpen('Discover'), 'open once more', 2_000);
      await clickAt(page, `${menuOf('Discover')}.querySelector('a[href="/tours"], a[href="/destinations"]')`);
      await poll(page, `document.body.dataset.route === '/destinations'`, 'the link goes there');
      await poll(page, isClosed('Discover'), 'closed after the link', 2_000);
    } finally {
      await close(page);
    }
  });

  test('the keyboard: Enter and Space, the arrow keys, Home and End, Escape, Tab', async () => {
    const page = await openPage('/about');
    try {
      await page.evaluate(`${trigger('Discover')}.focus(), true`);
      await press(page, 'Enter');
      await poll(page, isOpen('Discover'), 'Enter opens', 2_000);
      await press(page, 'Enter');
      await poll(page, isClosed('Discover'), 'Enter closes', 2_000);
      await press(page, ' ');
      await poll(page, isOpen('Discover'), 'Space opens', 2_000);
      await press(page, 'Escape');
      await poll(page, isClosed('Discover'), 'Escape closes', 2_000);
      assert.equal(await page.evaluate<string>(focused), 'Discover', 'back on the button');

      await press(page, 'ArrowDown');
      await poll(page, `${isOpen('Discover')} && ${focused} === 'Explore map'`, 'ArrowDown opens, on the first link', 2_000);
      await press(page, 'ArrowDown');
      assert.equal(await page.evaluate<string>(focused), 'Destinations');
      await press(page, 'End');
      assert.equal(await page.evaluate<string>(focused), 'Experiences');
      await press(page, 'ArrowDown');
      assert.equal(await page.evaluate<string>(focused), 'Explore map', 'it wraps');
      await press(page, 'ArrowUp');
      assert.equal(await page.evaluate<string>(focused), 'Experiences', 'and back');
      await press(page, 'Home');
      assert.equal(await page.evaluate<string>(focused), 'Explore map');
      await press(page, 'Escape');
      await poll(page, `${isClosed('Discover')} && ${focused} === 'Discover'`, 'Escape from a link: back on the button', 2_000);

      await press(page, 'ArrowUp');
      await poll(page, `${isOpen('Discover')} && ${focused} === 'Experiences'`, 'ArrowUp opens, on the last link', 2_000);
      await press(page, 'Tab');
      await poll(page, isClosed('Discover'), 'tabbing out closes it', 2_000);
      assert.equal(await page.evaluate<string>(focused), 'Tours', 'and goes on to the next item');

      // Enter on a link follows it.
      await page.evaluate(`${trigger('Discover')}.focus(), true`);
      await press(page, 'ArrowDown');
      await poll(page, `${focused} === 'Explore map' && document.activeElement.tagName === 'A'`, 'on the first link', 2_000);
      await press(page, 'ArrowDown');
      assert.equal(await page.evaluate<string>(focused), 'Destinations');
      await press(page, 'Enter');
      await poll(page, `document.body.dataset.route === '/destinations'`, 'Enter follows the link');
      await poll(page, isClosed('Discover'), 'closed after following it', 2_000);
    } finally {
      await close(page);
    }
  });

  test('the current page is marked, inside a group too', async () => {
    const marks = (page: Page) => page.evaluate<{ buttons: string[]; links: [string, string][] }>(`({
      buttons: [...document.querySelectorAll('.te-nav-links button[data-active="true"]')].map((b) => b.textContent.trim()),
      links: [...document.querySelectorAll('.te-nav-links a[aria-current]')].map((a) => [a.textContent.trim(), a.getAttribute('aria-current')])
    })`);
    const CASES: [string, string[], [string, string][]][] = [
      ['/explore', ['Discover'], [['Explore map', 'page']]],
      ['/destinations', ['Discover'], [['Destinations', 'page']]],
      ['/destinations/ella', ['Discover'], [['Destinations', 'page']]],
      ['/experiences/safari-yala', ['Discover'], [['Experiences', 'page']]],
      ['/tours', [], [['Tours', 'page']]],
      ['/journal', [], [['Journal', 'page']]],
      ['/booking', [], [['Book Your Ride', 'page']]],
      ['/about', ['About'], [['About', 'page']]],
      ['/about#contact', ['About'], [['Contact', 'location']]],
      ['/', [], []],
      ['/plan', [], []]
    ];
    for (const [path, buttons, links] of CASES) {
      const page = await openPage(path);
      try {
        const got = await marks(page);
        assert.deepEqual(got.buttons, buttons, `${path}: the group`);
        assert.deepEqual(got.links.filter(([label]) => label !== ''), links, `${path}: the link`);
      } finally {
        await close(page);
      }
    }
    // It reads as marked: a different colour from the group's other links, and the underline on the button.
    const page = await openPage('/destinations');
    try {
      await clickAt(page, trigger('Discover'));
      await poll(page, isOpen('Discover'), 'open', 2_000);
      const look = await page.evaluate<{ current: string; other: string; underline: string }>(`({
        current: getComputedStyle(document.querySelector('.te-nav-menu a[aria-current]')).color,
        other: getComputedStyle(document.querySelector('.te-nav-menu a:not([aria-current])')).color,
        underline: getComputedStyle(${trigger('Discover')}.querySelector('.te-nav-indicator')).transform
      })`);
      assert.notEqual(look.current, look.other);
      assert.notEqual(look.underline, 'matrix(0, 0, 0, 1, 0, 0)');
    } finally {
      await close(page);
    }
  });

  test('open, it holds AA and fits: both themes, the clear header over the home photo, every text size', async () => {
    try {
      for (const textSize of [100, 110, 120]) {
        await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
        // Wide enough for the links at each size (browser-text-size).
        const width = textSize === 120 ? 1440 : 1280;
        for (const theme of ['light', 'dark'] as const) {
          for (const path of ['/destinations', '/']) {
            const page = await openPage(path, { theme, width });
            try {
              for (const label of ['Discover', 'About']) {
                await clickAt(page, trigger(label));
                await poll(page, isOpen(label), `${label} open`, 2_000);
                await sleep(250);
                const where = `${path} ${theme} ${textSize}% ${label}`;
                const box = await page.evaluate<{ blur: string; right: number; bottom: number; clipped: string[]; onTop: boolean }>(`(() => {
                  const menu = ${menuOf(label)};
                  const r = menu.getBoundingClientRect();
                  const first = menu.querySelector('a').getBoundingClientRect();
                  const hit = document.elementFromPoint(first.left + first.width / 2, first.top + first.height / 2);
                  return {
                    blur: getComputedStyle(menu).backdropFilter, right: r.right, bottom: r.bottom,
                    clipped: [...menu.querySelectorAll('a')].filter((a) => a.scrollWidth > a.clientWidth + 1 || a.getBoundingClientRect().right > r.right).map((a) => a.textContent),
                    onTop: Boolean(hit?.closest('.te-nav-menu'))
                  };
                })()`);
                assert.match(box.blur, /blur\(24px\)/, `${where}: the header's glass`);
                assert.ok(box.right <= width && box.bottom <= 900, `${where}: inside the window`);
                assert.deepEqual(box.clipped, [], `${where}: nothing clipped`);
                assert.ok(box.onTop, `${where}: above the page`);
                // Composited over white and over black, the extremes behind the 96% glass.
                await page.evaluate(CONTRAST);
                assert.deepEqual(await page.evaluate<string[]>(`__contrast(${menuOf(label)}, 4.5)`), [], where);
              }
            } finally {
              await close(page);
            }
          }
        }
      }
    } finally {
      await pool.query('update public.site_settings set text_size = 100 where id');
    }
  });

  test('the phone menu shows the groups as sections, and marks the current page', async () => {
    const page = await openPage('/about#contact', { width: 375 });
    try {
      await page.evaluate(`document.querySelector('[aria-controls="mobile-navigation"]').click(), true`);
      await poll(page, `document.querySelector('#mobile-navigation a')`, 'the menu', 3_000);
      const sections = await page.evaluate<{ heading: string; links: string[] }[]>(`[...document.querySelectorAll('[data-menu-section]')].map((s) => ({
        heading: s.querySelector('p')?.textContent ?? '',
        links: [...s.querySelectorAll('a')].map((a) => a.textContent.trim())
      }))`);
      assert.deepEqual(sections, [
        { heading: 'Discover', links: ['Explore map', 'Destinations', 'Experiences'] },
        { heading: '', links: ['Tours', 'Book Your Ride', 'Journal'] },
        { heading: 'About', links: ['About', 'Contact'] }
      ]);
      assert.equal(await page.evaluate<string>(`document.querySelector('#mobile-navigation a[aria-current]').textContent.trim()`), 'Contact');
      assert.equal(await page.evaluate<string>(`document.querySelector('#mobile-navigation .te-home-link').getAttribute('href')`), '/', 'the logo goes home');
      assert.equal(await page.evaluate<boolean>(`document.documentElement.scrollWidth > innerWidth`), false, 'no sideways scroll');
    } finally {
      await close(page);
    }
  });
});
