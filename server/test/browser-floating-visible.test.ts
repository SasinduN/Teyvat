// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The WhatsApp and Book a ride buttons never disappear, on the real built site:
 *
 *   - scrolling each page in steps, top to bottom, at 375 and 1280 px, both buttons are
 *     visible and take a tap at every step, and they cover no control;
 *   - they hide only for a modal: the enquiry form, search, the phone menu;
 *   - the labels: always on a laptop; on a phone for a few seconds, then back when the
 *     visitor stops near the top. The icons stay 56 px;
 *   - the pulse is CSS only, a few times and then every 8 s, and stops with reduced motion;
 *   - the end of every page sits above the buttons;
 *   - the WhatsApp link is the international format, and goes with the number.
 *
 * Nothing here presses the WhatsApp button: "clickable" is a hit test, so no test opens the
 * number. Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { DEV_WHATSAPP_NUMBER } from '../../scripts/fixtures/dev-whatsapp';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { BUTTON_STATES, COVERED_CONTROLS, LIFT } from './floating';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { TEXT_AUDIT } from './text-audit';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

const STACK = '[data-floating-actions]';
const CHAT = '[data-whatsapp-button]';
const RIDE = '[data-floating-booking]';

interface ButtonState { name: string; shown: boolean; onScreen: boolean; clickable: boolean; on: string; width: number; height: number }

describe('the floating buttons stay', { skip, timeout: 8 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  const open: Page[] = [];

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    app = await listen(createApp({ media: null, bookings: true }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function poll(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(40);
    }
  }

  async function openPage(path: string, width: number, options: { reducedMotion?: boolean; theme?: 'light' | 'dark' } = {}): Promise<Page> {
    const page = await chrome.newPage();
    open.push(page);
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: width < 500 ? 812 : 900, deviceScaleFactor: 1, mobile: width < 500 });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: options.reducedMotion ? 'reduce' : 'no-preference' }] });
    await saveTheme(page, options.theme ?? 'light');
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(page, `document.readyState === 'complete' && document.body.dataset.route && document.querySelector('main h1') && document.querySelector('footer')`, path);
    await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto', true`);
    return page;
  }

  const closeAll = async () => {
    await Promise.all(open.splice(0).map((page) => page.send('Page.close').catch(() => undefined)));
  };

  /** One still moment: both buttons, seen and taking the tap, and nothing under them. Polls past the stack's 220 ms rise. */
  async function assertStays(page: Page, where: string): Promise<void> {
    const states = await page.evaluate<ButtonState[]>(BUTTON_STATES);
    assert.equal(states.length, 2, `${where}: both buttons on the page`);
    for (const state of states) {
      assert.ok(state.shown, `${where}: ${state.name} hidden`);
      assert.ok(state.onScreen, `${where}: ${state.name} off screen`);
      // A moving transform can read a hair under.
      assert.ok(state.width >= 55.9 && state.height >= 55.9, `${where}: ${state.name} is ${state.width}x${state.height}`);
    }
    const until = Date.now() + 1_000;
    for (;;) {
      const now = await page.evaluate<ButtonState[]>(BUTTON_STATES);
      const covered = await page.evaluate<string[]>(COVERED_CONTROLS);
      const blocked = now.filter((state) => !state.clickable).map((state) => `${state.name} under ${state.on}`);
      if ((covered.length === 0 && blocked.length === 0) || Date.now() > until) {
        assert.deepEqual(blocked, [], `${where}: a tap reaches each button`);
        assert.deepEqual(covered, [], `${where}: controls covered`);
        return;
      }
      await sleep(40);
    }
  }

  for (const path of ['/', '/explore', '/tours', '/destinations/ella']) {
    for (const width of [375, 1280]) {
      test(`${path} at ${width} px: visible and clickable at every step of the page`, async () => {
        try {
          const page = await openPage(path, width);
          let steps = 0;
          for (let y = 0; ; y += width < 500 ? 180 : 260) {
            await page.evaluate(`window.scrollTo(0, ${y}), true`);
            await page.evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))`);
            const at = await page.evaluate<{ y: number; bottom: boolean }>(`({ y: Math.round(scrollY), bottom: scrollY + innerHeight >= document.documentElement.scrollHeight - 1 })`);
            await assertStays(page, `${path} at ${width} px, scrolled to ${at.y}`);
            steps += 1;
            if (at.bottom) break;
          }
          assert.ok(steps >= 3, `the whole page, in ${steps} steps`);
          assert.equal(await page.evaluate<boolean>(`document.documentElement.scrollWidth > innerWidth`), false, 'no sideways scroll');
        } finally {
          await closeAll();
        }
      });
    }
  }

  test('they rise smoothly over what matters, and come back down', async () => {
    try {
      const page = await openPage('/about', 1280);
      await poll(page, `${LIFT} === 0`, 'the stack at rest');
      assert.match(await page.evaluate<string>(`getComputedStyle(document.querySelector('${STACK}')).transitionProperty`), /transform/, 'a transition, not a jump');
      await page.evaluate(`(() => {
        const box = document.createElement('div');
        box.id = 'qa-keep-clear';
        box.setAttribute('data-keep-clear', '');
        box.style.cssText = 'position:fixed;right:0;bottom:0;width:320px;height:90px';
        document.body.append(box);
        return true;
      })()`);
      await poll(page, `${LIFT} > 60`, 'the stack above the target', 2_000);
      await assertStays(page, 'over a keep-clear target');
      await page.evaluate(`document.querySelector('#qa-keep-clear').remove(), true`);
      await poll(page, `${LIFT} === 0`, 'the stack back down', 2_000);
    } finally {
      await closeAll();
    }
  });

  test('hidden only for a modal: search, the enquiry form and the phone menu; back after each', async () => {
    try {
      const shownCount = `document.querySelectorAll('${STACK} a[data-state="shown"]').length`;
      const hiddenFully = `[...document.querySelectorAll('${STACK} a')].every((a) => getComputedStyle(a).visibility === 'hidden' && a.inert)`;

      let page = await openPage('/tours', 1280);
      await poll(page, `${shownCount} === 2`, 'both shown');
      await page.evaluate(`document.querySelector('header button[aria-label="Search Destinations"]').click(), true`);
      await poll(page, hiddenFully, 'hidden with search open', 3_000);
      await poll(page, `document.querySelector('[role=dialog]')`, 'search itself, whose chunk loads on first use', 5_000);
      await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await poll(page, `${shownCount} === 2`, 'back when search closes', 3_000);

      await page.evaluate(`[...document.querySelectorAll('#tours button')].find((b) => b.textContent.trim() === 'Inquire').click(), true`);
      await poll(page, `document.querySelector('.fixed.inset-0 form button[type=submit]')`, 'the enquiry form');
      await poll(page, hiddenFully, 'hidden with the enquiry form open', 3_000);

      page = await openPage('/tours', 375);
      await page.evaluate(`document.querySelector('[aria-controls="mobile-navigation"]').click(), true`);
      await poll(page, hiddenFully, 'hidden with the phone menu open', 3_000);
      await page.evaluate(`document.querySelector('#mobile-navigation [aria-label="Close menu"]').click(), true`);
      await poll(page, `${shownCount} === 2`, 'back when the menu closes', 3_000);
    } finally {
      await closeAll();
    }
  });

  test('the labels: always on a laptop; on a phone for a few seconds, and again on stopping near the top', async () => {
    try {
      const labelSeen = (selector: string) => `getComputedStyle(document.querySelector('${selector} .te-floating-label')).visibility === 'visible'`;
      const both = `${labelSeen(CHAT)} && ${labelSeen(RIDE)}`;
      const neither = `!(${labelSeen(CHAT)}) && !(${labelSeen(RIDE)})`;
      const texts = (page: Page) => page.evaluate<string[]>(`[...document.querySelectorAll('${STACK} .te-floating-label')].map((l) => l.textContent)`);

      const laptop = await openPage('/about', 1280);
      assert.deepEqual(await texts(laptop), ['Book a ride', 'Chat on WhatsApp']);
      await poll(laptop, both, 'labels on a laptop', 2_000);
      await sleep(5_600);
      assert.ok(await laptop.evaluate<boolean>(both), 'still showing after the phone timer');
      await laptop.evaluate(`window.scrollTo(0, 500), true`);
      await sleep(300);
      assert.ok(await laptop.evaluate<boolean>(both), 'still showing while scrolled');

      const phone = await openPage('/about', 375);
      assert.ok(await phone.evaluate<boolean>(both), 'on a phone, after load');
      const inside = await phone.evaluate<boolean>(`[...document.querySelectorAll('${STACK} .te-floating-label')].every((l) => l.getBoundingClientRect().left >= 0)`);
      assert.ok(inside, 'inside the screen');
      await poll(phone, neither, 'collapsed after a few seconds', 8_000);
      const sizes = await phone.evaluate<number[]>(`[...document.querySelectorAll('${STACK} a')].flatMap((a) => [a.getBoundingClientRect().width, a.getBoundingClientRect().height])`);
      assert.ok(sizes.every((size) => size >= 55.9), `the icons stay 56 px: ${sizes}`);

      await phone.evaluate(`window.scrollTo(0, 900), true`);
      await sleep(400);
      assert.ok(await phone.evaluate<boolean>(neither), 'not while down the page');
      await phone.evaluate(`window.scrollTo(0, 0), true`);
      await poll(phone, both, 'back on stopping near the top', 2_000);
      await phone.evaluate(`window.scrollTo(0, 900), true`);
      await poll(phone, neither, 'gone on scrolling away', 2_000);
    } finally {
      await closeAll();
    }
  });

  test('the labels hold AA in both themes, and fit at 120%', async () => {
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    try {
      for (const theme of ['light', 'dark'] as const) {
        const page = await openPage('/about', 1280, { theme });
        const colours = await page.evaluate<{ fg: string; bg: string; shadow: string }[]>(`[...document.querySelectorAll('${STACK} .te-floating-label')].map((l) => { const s = getComputedStyle(l); return { fg: s.color, bg: s.backgroundColor, shadow: s.boxShadow }; })`);
        for (const { fg, bg, shadow } of colours) {
          const [hi, lo] = [luminance(parse(fg)), luminance(parse(bg))].sort((a, b) => b - a);
          assert.ok((hi + 0.05) / (lo + 0.05) >= 4.5, `${theme}: ${fg} on ${bg}`);
          assert.notEqual(shadow, 'none', `${theme}: a soft shadow`);
        }
      }
      await pool.query('update public.site_settings set text_size = 120 where id');
      for (const width of [320, 375, 1280]) {
        const page = await openPage('/wishlist', width);
        assert.deepEqual(await page.evaluate<string[]>(TEXT_AUDIT), [], `${width} px at 120%`);
        assert.ok(await page.evaluate<boolean>(`[...document.querySelectorAll('${STACK} .te-floating-label')].every((l) => { const r = l.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })`), `${width} px: the labels fit`);
      }
    } finally {
      await closeAll();
    }
  });

  test('the pulse: CSS only, a few times then every 8 s, none with reduced motion; a clear lucide icon', async () => {
    try {
      const page = await openPage('/about', 1280);
      const pseudo = (part: string, prop: string) => `getComputedStyle(document.querySelector('${CHAT}'), '${part}').${prop}`;
      assert.equal(await page.evaluate<string>(pseudo('::before', 'animationName')), 'te-chat-pulse');
      assert.equal(await page.evaluate<string>(pseudo('::before', 'animationIterationCount')), '3');
      assert.equal(await page.evaluate<string>(pseudo('::after', 'animationName')), 'te-chat-pulse-idle');
      assert.equal(await page.evaluate<string>(pseudo('::after', 'animationDuration')), '8s');
      assert.equal(await page.evaluate<string>(pseudo('::after', 'animationIterationCount')), 'infinite');
      assert.equal(await page.evaluate<string | null>(`document.querySelector('${CHAT}').getAttribute('style')`), null, 'no inline style');

      const icon = await page.evaluate<{ width: number; stroke: string; glyph: number }>(`(() => {
        const svg = document.querySelector('${RIDE} svg');
        return { width: svg.getBoundingClientRect().width, stroke: getComputedStyle(svg).strokeWidth, glyph: document.querySelector('${CHAT} svg').getBoundingClientRect().width };
      })()`);
      assert.ok(await page.evaluate<boolean>(`document.querySelector('${RIDE} svg').classList.contains('lucide-car-taxi-front')`), 'the taxi icon');
      assert.equal(icon.width, icon.glyph, 'the same size as the WhatsApp glyph');
      assert.equal(icon.stroke, '2px');

      const still = await openPage('/about', 1280, { reducedMotion: true });
      for (const part of ['::before', '::after']) {
        assert.equal(await still.evaluate<string>(pseudo(part, 'content')), 'none', part);
        assert.equal(await still.evaluate<string>(pseudo(part, 'animationName')), 'none', part);
      }
    } finally {
      await closeAll();
    }
  });

  test('the end of every page sits above the buttons, at both sizes', async () => {
    try {
      for (const path of ['/', '/about', '/tours', '/destinations/ella', '/wishlist', '/no-such-page']) {
        for (const width of [375, 1280]) {
          const page = await openPage(path, width);
          // Again each time: photos and fonts arriving can push the end further down.
          await poll(page, `(window.scrollTo(0, document.documentElement.scrollHeight), scrollY + innerHeight >= document.documentElement.scrollHeight - 1 && ${LIFT} === 0)`, `${path} at ${width} px: no need to rise at the end`, 8_000);
          const clear = await page.evaluate<boolean>(`(() => {
            const row = document.querySelector('[data-footer-last-row]').getBoundingClientRect();
            return [...document.querySelectorAll('${STACK} a')].every((a) => a.getBoundingClientRect().top >= row.bottom);
          })()`);
          assert.ok(clear, `${path} at ${width} px: the footer's last row is above the buttons`);
          await page.send('Page.close').catch(() => undefined);
        }
      }
    } finally {
      await closeAll();
    }
  });

  test('the WhatsApp link: international format from Settings; no number, no button, no link', async () => {
    try {
      const page = await openPage('/about', 1280);
      const href = await page.evaluate<string>(`document.querySelector('${CHAT}').getAttribute('href')`);
      assert.ok(href.startsWith(`https://wa.me/${DEV_WHATSAPP_NUMBER}?`), href);
      assert.match(href, /^https:\/\/wa\.me\/94\d+\?text=/, 'no leading 0, spaces or plus');

      await pool.query('update public.site_settings set whatsapp_number = null where id');
      const none = await openPage('/about', 1280);
      await sleep(300);
      assert.equal(await none.evaluate<number>(`document.querySelectorAll('${CHAT}, a[href*="wa.me"]').length`), 0);
      assert.equal(await none.evaluate<number>(`document.querySelectorAll('${RIDE}').length`), 1, 'Book a ride stays');
    } finally {
      await closeAll();
    }
  });
});
