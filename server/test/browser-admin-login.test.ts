// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The admin login page, in Chrome:
 *
 *   - the password is hidden to begin with; its eye button shows and hides
 *     it (`type`, `aria-pressed`, its label and icon), keeps focus and the
 *     caret in the field when clicked, is the next Tab stop with a visible
 *     focus ring, works with Space and Enter, and never submits the form;
 *   - the button's icon and focus ring hold their contrast, light and dark;
 *   - wrong passwords say how many attempts are left once 3 or fewer do;
 *   - a 429 counts its Retry-After down with the button disabled, and
 *     re-enables it when the wait is over.
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
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { CONTRAST } from './contrast';
import {
  assertConnectedToTestDatabase,
  createUser,
  listen,
  migrateTestDatabase,
  resetAuthTables,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

const FIELD = `document.querySelector('#admin-password')`;
const TOGGLE = `document.querySelector('button[aria-controls="admin-password"]')`;
const SUBMIT = `document.querySelector('form button[type=submit]')`;

describe('the admin login page, in Chrome', { skip }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetAuthTables();
    await createUser();
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function poll(page: Page, expression: string, what: string, ms = 10_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  /** The login page, with a counter of the form's submit events (`__submits`). */
  async function openLogin(theme: 'light' | 'dark' = 'light'): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await saveTheme(page, theme);
    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/login` });
    await poll(page, `${FIELD} && ${TOGGLE}`, 'the login form', 20_000);
    await page.evaluate(`(window.__submits = 0, document.querySelector('form').addEventListener('submit', () => (window.__submits += 1)), true)`);
    return page;
  }

  async function press(page: Page, key: 'Tab' | 'Enter' | ' '): Promise<void> {
    const [code, keyCode, text] = key === 'Tab' ? ['Tab', 9, ''] : key === 'Enter' ? ['Enter', 13, '\r'] : ['Space', 32, ' '];
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, ...(text ? { text } : {}) });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
  }

  /** A real mouse click in the middle of `selector`'s element. */
  async function click(page: Page, element: string): Promise<void> {
    const { x, y } = await page.evaluate<{ x: number; y: number }>(
      `(() => { const r = ${element}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`
    );
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  }

  /** Replaces a field's text the way typing does (React sees the input events). */
  async function fill(page: Page, field: string, text: string): Promise<void> {
    await page.evaluate(`(${field}.focus(), ${field}.select(), true)`);
    await page.send('Input.insertText', { text });
  }

  const state = (page: Page) =>
    page.evaluate<{ type: string; pressed: string; label: string; icon: string; buttonType: string; autocomplete: string }>(`({
      type: ${FIELD}.type,
      pressed: ${TOGGLE}.getAttribute('aria-pressed'),
      label: ${TOGGLE}.getAttribute('aria-label'),
      icon: ${TOGGLE}.querySelector('svg').getAttribute('class'),
      buttonType: ${TOGGLE}.type,
      autocomplete: ${FIELD}.autocomplete
    })`);

  const HIDDEN = { type: 'password', pressed: 'false', label: 'Show password' };
  const SHOWN = { type: 'text', pressed: 'true', label: 'Hide password' };

  function assertState(actual: Awaited<ReturnType<typeof state>>, expected: typeof HIDDEN, what: string): void {
    assert.deepEqual({ type: actual.type, pressed: actual.pressed, label: actual.label }, expected, what);
    assert.match(actual.icon, expected === HIDDEN ? /\blucide-eye\b/ : /\blucide-eye-off\b/, `${what}: the icon`);
    assert.equal(actual.buttonType, 'button', `${what}: the toggle can't submit`);
    assert.equal(actual.autocomplete, 'current-password', `${what}: autocomplete`);
  }

  test('hidden by default; a click shows and hides it, keeping focus and the caret in the field', async () => {
    const page = await openLogin();
    assertState(await state(page), HIDDEN, 'at first');

    await fill(page, `document.querySelector('#admin-email')`, 'admin@example.test');
    await fill(page, FIELD, 'secret words');
    await page.evaluate(`(${FIELD}.setSelectionRange(3, 3), true)`);

    await click(page, TOGGLE);
    assertState(await state(page), SHOWN, 'after a click');
    const caret = () =>
      page.evaluate<{ focused: boolean; start: number; end: number; value: string }>(`({
        focused: document.activeElement === ${FIELD},
        start: ${FIELD}.selectionStart,
        end: ${FIELD}.selectionEnd,
        value: ${FIELD}.value
      })`);
    assert.deepEqual(await caret(), { focused: true, start: 3, end: 3, value: 'secret words' });

    await click(page, TOGGLE);
    assertState(await state(page), HIDDEN, 'after a second click');
    assert.deepEqual(await caret(), { focused: true, start: 3, end: 3, value: 'secret words' });

    assert.equal(await page.evaluate<number>('window.__submits'), 0, 'clicking the toggle never submits');
  });

  test('the keyboard: the next Tab stop, a visible focus ring, Space and Enter toggle, nothing submits', async () => {
    const page = await openLogin();
    await fill(page, `document.querySelector('#admin-email')`, 'admin@example.test');
    await fill(page, FIELD, 'secret words');

    await press(page, 'Tab');
    const focus = await page.evaluate<{ onToggle: boolean; visible: boolean; ring: string }>(`({
      onToggle: document.activeElement === ${TOGGLE},
      visible: ${TOGGLE}.matches(':focus-visible'),
      ring: getComputedStyle(${TOGGLE}).boxShadow
    })`);
    assert.ok(focus.onToggle, 'Tab from the field reaches the toggle');
    assert.ok(focus.visible, 'focus-visible from the keyboard');
    assert.match(focus.ring, /rgb\(.*\) 0px 0px 0px 2px/, `a 2px focus ring (box-shadow: ${focus.ring})`);

    await press(page, ' ');
    assertState(await state(page), SHOWN, 'after Space');
    await press(page, 'Enter');
    assertState(await state(page), HIDDEN, 'after Enter');
    await press(page, 'Enter');
    assertState(await state(page), SHOWN, 'after Enter again');

    await sleep(300);
    assert.equal(await page.evaluate<number>('window.__submits'), 0, 'Enter on the toggle never submits');
    const { rows } = await pool.query('select 1 from public.login_attempts');
    assert.equal(rows.length, 0, 'no sign-in was attempted');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: the icon and the focus ring hold their contrast`, async () => {
      const page = await openLogin(theme);
      await page.evaluate(CONTRAST);
      assert.equal(await page.evaluate<string>(`document.documentElement.dataset.theme`), theme);
      assert.deepEqual(await page.evaluate<string[]>(`window.__contrast(${TOGGLE}, 4.5)`), []);
      await click(page, TOGGLE);
      assert.deepEqual(await page.evaluate<string[]>(`window.__contrast(${TOGGLE}, 4.5)`), [], 'the eye-off icon');

      // The ring against the field it sits on: 3:1, as for any focus indicator.
      await page.evaluate(`(${FIELD}.focus(), true)`);
      await press(page, 'Tab');
      const ratio = await page.evaluate<number>(`(() => {
        const probe = document.createElement('canvas').getContext('2d');
        const rgb = (css) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = css; probe.fillRect(0, 0, 1, 1); return [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3); };
        const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const ring = getComputedStyle(${TOGGLE}).boxShadow.match(/rgba?\\([^)]*\\)(?= 0px 0px 0px 2px)/)[0];
        const [a, b] = [lum(rgb(ring)), lum(rgb(getComputedStyle(${FIELD}).backgroundColor))].sort((x, y) => y - x);
        return (a + 0.05) / (b + 0.05);
      })()`);
      assert.ok(ratio >= 3, `the focus ring is ${ratio.toFixed(2)}:1 against the field`);
    });
  }

  test('attempts left from 3; a 429 counts down with the button disabled, then re-enables it', async () => {
    const page = await openLogin();
    await fill(page, `document.querySelector('#admin-email')`, 'admin@example.test');

    const expected = [
      /Incorrect email or password\.(?! \d| Sign)/,
      /Incorrect email or password\. 3 attempts left before sign-in is paused for 15 minutes\./,
      /Incorrect email or password\. 2 attempts left before/,
      /Incorrect email or password\. 1 attempt left before/,
      /Incorrect email or password\. Sign-in is now paused for up to 15 minutes\./
    ];
    for (const [i, message] of expected.entries()) {
      await fill(page, FIELD, `wrong ${i}`);
      await page.evaluate(`(${SUBMIT}.click(), true)`);
      await poll(page, `!${SUBMIT}.disabled && ${message}.test(document.querySelector('form').innerText)`, `message ${i + 1}`);
    }

    // Locked: the next try is a 429 even with the right password.
    await fill(page, FIELD, 'correct horse battery staple');
    await page.evaluate(`(${SUBMIT}.click(), true)`);
    await poll(page, `/Too many attempts\\. Try again in 15 minutes\\./.test(document.querySelector('form').innerText)`, 'the 15-minute lock');
    assert.equal(await page.evaluate<boolean>(`${SUBMIT}.disabled`), true, 'the button is disabled while locked');
    await page.evaluate(`(document.querySelector('form').requestSubmit(), true)`);
    await sleep(300);
    const { rows } = await pool.query<{ n: number }>('select count(*)::int as n from public.login_attempts');
    assert.equal(rows[0].n, 5, 'a locked form sends nothing');

    // A lock about to lift: the failures 14:50 ago leave ~10 s.
    await pool.query(`update public.login_attempts set attempted_at = now() - interval '14 minutes 50 seconds'`);
    const short = await openLogin();
    await fill(short, `document.querySelector('#admin-email')`, 'admin@example.test');
    await fill(short, FIELD, 'correct horse battery staple');
    await short.evaluate(`(${SUBMIT}.click(), true)`);
    const seconds = /Too many attempts\. Try again in (\d+) seconds?\./;
    await poll(short, `${seconds}.test(document.querySelector('form').innerText)`, 'the seconds countdown');
    assert.equal(await short.evaluate<boolean>(`${SUBMIT}.disabled`), true);
    const first = Number(seconds.exec(await short.evaluate<string>(`document.querySelector('form').innerText`))![1]);
    await poll(short, `(${seconds}.exec(document.querySelector('form').innerText) || [])[1] < ${first}`, 'the countdown to tick', 3_000);

    await poll(short, `!${SUBMIT}.disabled && !/Too many attempts/.test(document.querySelector('form').innerText)`, 'the lock to lift', 15_000);
    await short.evaluate(`(${SUBMIT}.click(), true)`);
    await poll(short, `location.pathname === '/admin'`, 'signed in once the wait is over');
  });
});
