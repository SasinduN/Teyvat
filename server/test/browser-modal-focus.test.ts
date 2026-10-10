// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The enquiry and search dialogs keep keyboard focus (useModalFocus, as the
 * Navbar's phone menu does), in Chrome:
 *
 *   - opening one moves focus into it (the search: its field);
 *   - Tab and Shift+Tab never leave it;
 *   - the page behind is inert and doesn't scroll;
 *   - Escape closes it, and focus returns to the button that opened it.
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

const DIALOG = `document.querySelector('[role=dialog][aria-modal=true]')`;

describe('the enquiry and search dialogs keep focus, in Chrome', { skip }, () => {
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

  async function poll(page: Page, expression: string, what: string, ms = 10_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  async function openPage(path: string): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await poll(page, `document.querySelector('main h1') && document.body.dataset.route`, path, 20_000);
    return page;
  }

  async function press(page: Page, key: 'Tab' | 'Escape', shift = false): Promise<void> {
    const code = key === 'Tab' ? 9 : 27;
    const modifiers = shift ? 8 : 0;
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, modifiers });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, modifiers });
  }

  const focusInDialog = (page: Page) => page.evaluate<boolean>(`Boolean(${DIALOG}?.contains(document.activeElement))`);

  /** Tab forwards and backwards through the dialog: focus never leaves it, and it wraps. */
  async function assertTrapped(page: Page, what: string): Promise<void> {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i += 1) {
      await press(page, 'Tab');
      assert.ok(await focusInDialog(page), `${what}: Tab ${i + 1} left the dialog`);
      seen.add(await page.evaluate<string>(`document.activeElement.outerHTML.slice(0, 60)`));
    }
    assert.ok(seen.size > 2, `${what}: Tab moved between controls (${seen.size})`);
    for (let i = 0; i < 10; i += 1) {
      await press(page, 'Tab', true);
      assert.ok(await focusInDialog(page), `${what}: Shift+Tab ${i + 1} left the dialog`);
    }
  }

  async function assertPageBehindIsInert(page: Page, inert: boolean): Promise<void> {
    const state = await page.evaluate<{ header: boolean; main: boolean; overflow: string }>(`({
      header: Boolean(document.querySelector('header').closest('[inert]')),
      main: Boolean(document.querySelector('main').closest('[inert]')),
      overflow: document.body.style.overflow
    })`);
    assert.deepEqual(state, { header: inert, main: inert, overflow: inert ? 'hidden' : '' });
  }

  test('the enquiry form: focus in, trapped, the page inert; Escape returns focus to its button', async () => {
    const page = await openPage('/tours');
    await page.evaluate(`(() => {
      const button = [...document.querySelectorAll('#tours button')].find((b) => b.textContent.trim() === 'Inquire');
      button.dataset.opener = 'yes';
      button.focus();
      button.click();
      return true;
    })()`);
    await poll(page, `${DIALOG}?.querySelector('form')`, 'the enquiry form');
    await poll(page, `${DIALOG}.contains(document.activeElement)`, 'focus in the dialog');
    await assertPageBehindIsInert(page, true);
    await assertTrapped(page, 'enquiry');

    await press(page, 'Escape');
    await poll(page, `!document.querySelector('[role=dialog]')`, 'the dialog closed');
    await poll(page, `document.activeElement?.dataset.opener === 'yes'`, 'focus back on Inquire');
    await assertPageBehindIsInert(page, false);
  });

  test('the search: focus in its field, trapped; Escape returns focus to the search button', async () => {
    const page = await openPage('/about');
    const opener = `document.querySelector('header button[aria-label="Search Destinations"]')`;
    await page.evaluate(`${opener}.focus(), ${opener}.click(), true`);
    await poll(page, `${DIALOG}`, 'the search');
    await poll(page, `document.activeElement === ${DIALOG}.querySelector('input')`, 'focus in the search field');
    await assertPageBehindIsInert(page, true);
    await assertTrapped(page, 'search');

    await press(page, 'Escape');
    await poll(page, `!document.querySelector('[role=dialog]')`, 'the search closed');
    await poll(page, `document.activeElement === ${opener}`, 'focus back on the search button');
    await assertPageBehindIsInert(page, false);
  });

  test('a click outside still closes the enquiry form', async () => {
    const page = await openPage('/tours');
    await page.evaluate(`[...document.querySelectorAll('#tours button')].find((b) => b.textContent.trim() === 'Inquire').click(), true`);
    await poll(page, `${DIALOG}?.querySelector('form')`, 'the enquiry form');
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 10, y: 450, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 10, y: 450, button: 'left', clickCount: 1 });
    await poll(page, `!document.querySelector('[role=dialog]')`, 'the dialog closed');
  });
});
