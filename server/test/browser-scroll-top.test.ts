/**
 * The scroll-to-top button (src/components/ScrollToTop.tsx), in Chrome.
 *
 * Every check first waits for a still page (no scrolling, no layout change),
 * then polls for the expected state. Nothing relies on a fixed wait.
 */
// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

const TOP = '[data-scroll-top]';
const WHATSAPP = '[data-whatsapp-button]';

describe('the scroll-to-top button, in Chrome', { skip }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    // With the WhatsApp number, so its button is on the page to stay clear of.
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function poll(page: Page, expression: string, what: string, ms = 5_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  /**
   * Waits until the page has stopped moving: the scroll position, the page
   * height and every keep-clear target's position unchanged across 300 ms.
   */
  async function still(page: Page): Promise<void> {
    const snapshot = `JSON.stringify([scrollY, document.documentElement.scrollHeight,
      ...[...document.querySelectorAll('.leaflet-control-zoom, [data-keep-clear], ${WHATSAPP}')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })])`;
    const until = Date.now() + 15_000;
    for (;;) {
      const a = await page.evaluate<string>(snapshot);
      await sleep(300);
      if (a === (await page.evaluate<string>(snapshot))) return;
      if (Date.now() > until) throw new Error('the page never stopped moving');
    }
  }

  const SHOWN = `document.querySelector('${TOP}').dataset.visible === 'true'`;
  const HIDDEN = `document.querySelector('${TOP}').dataset.visible === 'false'`;

  /** Whether the button's box (with the 8 px margin) overlaps any of `selector`. */
  const overlaps = (selector: string) => `(() => {
    const b = document.querySelector('${TOP}').getBoundingClientRect();
    return [...document.querySelectorAll(${JSON.stringify(selector)})].some((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left < b.right + 8 && r.right > b.left - 8 && r.top < b.bottom + 8 && r.bottom > b.top - 8;
    });
  })()`;

  async function openPage(path: string, mobile: boolean): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: mobile ? 390 : 1280,
      height: mobile ? 844 : 900,
      deviceScaleFactor: 1,
      mobile
    });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await poll(page, `document.querySelector('main h1') && document.querySelector('${TOP}')`, 'the page', 20_000);
    await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto', true`);
    return page;
  }

  for (const mobile of [false, true]) {
    const width = mobile ? 'phone' : 'desktop';

    test(`${width}: hidden at the top, shown a screen down, and a click goes back to the heading`, async () => {
      const page = await openPage('/tours', mobile);
      await still(page);
      await poll(page, HIDDEN, 'hidden at the top');
      assert.equal(await page.evaluate<number>(`document.querySelector('${TOP}').tabIndex`), -1, 'out of the tab order while hidden');

      await page.evaluate(`window.scrollTo(0, innerHeight * 1.5), true`);
      await still(page);
      await poll(page, SHOWN, 'shown more than a screen down');

      await page.evaluate(`document.querySelector('${TOP}').click(), true`);
      await poll(page, 'scrollY === 0', 'back at the top');
      await poll(page, `document.activeElement === document.querySelector('main h1')`, 'focus on the page heading');
      await still(page);
      await poll(page, HIDDEN, 'hidden again at the top');
    });
  }

  test('phone: hidden while the enquiry form is open, back once it closes', async () => {
    const page = await openPage('/tours', true);
    await page.evaluate(`window.scrollTo(0, innerHeight * 1.5), true`);
    await still(page);
    await poll(page, SHOWN, 'precondition: shown');

    await page.evaluate(`[...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === 'Inquire').click(), true`);
    await poll(page, `document.querySelector('.fixed.inset-0 form button[type=submit]')`, 'the enquiry form');
    await still(page);
    await poll(page, HIDDEN, 'hidden with the form open');

    // The modal's close button (its X, top right of the panel).
    await page.evaluate(`document.querySelector('.fixed.inset-0 form').closest('.relative').querySelector('button').click(), true`);
    await poll(page, `!document.querySelector('.fixed.inset-0 form')`, 'the form closed');
    await still(page);
    await poll(page, SHOWN, 'shown again');
  });

  test('phone: never over the map zoom buttons, the Quick Jump bar or the WhatsApp button', async () => {
    // The map is on /explore since redesign PR 4 trimmed the home page.
    const page = await openPage('/explore', true);
    await page.evaluate(`document.querySelector('#explore-map').scrollIntoView(), true`);
    await poll(page, `document.querySelector('#explore-map .leaflet-control-zoom')`, 'the map', 20_000);
    await still(page);

    const mapTop = await page.evaluate<number>(`document.querySelector('#explore-map').getBoundingClientRect().top + scrollY`);
    const mapHeight = await page.evaluate<number>(`document.querySelector('#explore-map').offsetHeight`);
    let shownAtLeastOnce = false;
    for (let y = mapTop - 844; y <= mapTop + mapHeight; y += 40) {
      await page.evaluate(`window.scrollTo(0, ${y}), true`);
      await still(page);
      // Visible only where it covers nothing.
      if (await page.evaluate<boolean>(SHOWN)) {
        shownAtLeastOnce = true;
        assert.equal(await page.evaluate<boolean>(overlaps(`.leaflet-control-zoom, [data-keep-clear], ${WHATSAPP}`)), false, `covering a target at ${y}`);
      }
    }
    assert.ok(shownAtLeastOnce, 'precondition: shown somewhere in the sweep');
    assert.equal(await page.evaluate<boolean>(overlaps(WHATSAPP)), false, 'never on the WhatsApp button (opposite corners)');
  });

  test('steps aside when a target moves or grows into its corner, with no scroll', async () => {
    const page = await openPage('/tours', true);
    await page.evaluate(`window.scrollTo(0, innerHeight * 1.5), true`);
    await still(page);
    await poll(page, SHOWN, 'precondition: shown');
    const scrollY = await page.evaluate<number>('scrollY');

    // A keep-clear target in the top-left corner, then moved down onto the button.
    await page.evaluate(`(() => {
      const el = document.createElement('div');
      el.id = 'mover';
      el.setAttribute('data-keep-clear', '');
      el.style.cssText = 'position:fixed;left:0;top:0;width:120px;height:60px;';
      document.body.append(el);
      return true;
    })()`);
    await still(page);
    await poll(page, SHOWN, 'still shown while the target is elsewhere');
    await page.evaluate(`document.getElementById('mover').style.top = (innerHeight - 70) + 'px', true`);
    await still(page);
    await poll(page, HIDDEN, 'hidden once the target moved onto it');

    // Moved away again, then a target that grows from nothing into the corner.
    await page.evaluate(`document.getElementById('mover').remove(), true`);
    await still(page);
    await poll(page, SHOWN, 'shown again once it is gone');
    await page.evaluate(`(() => {
      const el = document.createElement('div');
      el.id = 'grower';
      el.setAttribute('data-keep-clear', '');
      el.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;';
      document.body.append(el);
      return true;
    })()`);
    await still(page);
    await poll(page, SHOWN, 'shown while the target is empty');
    await page.evaluate(`Object.assign(document.getElementById('grower').style, { width: '140px', height: '90px' }), true`);
    await still(page);
    await poll(page, HIDDEN, 'hidden once the target grew onto it');

    assert.equal(await page.evaluate<number>('scrollY'), scrollY, 'no scroll happened');
  });
});
