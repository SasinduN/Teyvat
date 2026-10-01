// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The WhatsApp chat button, on the real built site in headless Chrome:
 *
 *   - with no number set there is no button and no wa.me link at all;
 *   - the link's message follows what the visitor is looking at: a
 *     destination modal, a tour modal, a tour route while the map is on
 *     screen, or nothing in particular;
 *   - `?destination=` and `?tour=` links open their modal, then leave the
 *     address bar;
 *   - on a phone it never covers the map's zoom buttons or Quick Jump bar,
 *     the modals' main buttons, or the enquiry form's submit button;
 *   - admin Settings shows "Test in WhatsApp" only once a number is saved.
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { whatsappMessage, whatsappUrl, type WhatsAppContext } from '../../shared/whatsapp';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import {
  assertConnectedToTestDatabase,
  createUser,
  listen,
  migrateTestDatabase,
  PASSWORD,
  resetAuthTables,
  resetContent,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

const NUMBER = '94771234567';
const BUTTON = '[data-whatsapp-button]';

describe('the WhatsApp button, in Chrome', { skip }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  /** The link the button should carry for `context` on this server. */
  const expected = (context: WhatsAppContext) => whatsappUrl(NUMBER, whatsappMessage(context, app.baseUrl));

  async function waitFor(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
      await sleep(100);
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  async function openPage(options: { mobile?: boolean; path?: string } = {}): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: options.mobile ? 390 : 1280,
      height: options.mobile ? 844 : 900,
      deviceScaleFactor: 1,
      mobile: Boolean(options.mobile)
    });
    await page.send('Page.navigate', { url: `${app.baseUrl}${options.path ?? '/'}` });
    await waitFor(page, `document.querySelectorAll('#tours h3').length === 4`, 'the tour cards');
    // Jumps, not smooth scrolls, so a scroll has landed when it returns.
    await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto', true`);
    return page;
  }

  const href = (page: Page) =>
    page.evaluate<string | null>(`document.querySelector('${BUTTON}')?.getAttribute('href') ?? null`);

  /** Waits for the button's link to become `want`. */
  async function expectHref(page: Page, want: string, what: string): Promise<void> {
    try {
      await waitFor(page, `document.querySelector('${BUTTON}')?.getAttribute('href') === ${JSON.stringify(want)}`, what, 5_000);
    } catch {
      assert.equal(await href(page), want, what);
    }
  }

  /** Lets the button's scroll check (one animation frame) run. */
  const frames = (page: Page) =>
    page.evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))`);

  const shown = (page: Page) => page.evaluate<boolean>(`document.querySelector('${BUTTON}').dataset.state === 'shown'`);

  /** Whether the button, while shown, overlaps the element `selector` picks. */
  const coversElement = (page: Page, selector: string) =>
    page.evaluate<boolean>(`(() => {
      const button = document.querySelector('${BUTTON}');
      if (button.dataset.state !== 'shown') return false;
      const b = button.getBoundingClientRect();
      const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
    })()`);

  /** Whether a tap at the middle of `selector` lands on it, not on something above it. */
  const tappable = (page: Page, selector: string) =>
    page.evaluate<boolean>(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return Boolean(hit && el.contains(hit));
    })()`);

  const setNumber = (value: string | null) =>
    pool.query('update public.site_settings set whatsapp_number = $1 where id', [value]);

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetAuthTables();
    await createUser();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
    await setNumber(NUMBER);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('no number: no button and no wa.me link anywhere', async () => {
    await setNumber(null);
    const page = await openPage();
    await sleep(500);
    assert.equal(
      await page.evaluate<number>(`document.querySelectorAll('${BUTTON}, a[href*="wa.me"]').length`),
      0
    );
  });

  test('the message follows what the visitor is looking at', async () => {
    const page = await openPage();
    await expectHref(page, expected({ kind: 'general' }), 'on load: the general message');
    assert.equal(
      await page.evaluate<string>(`document.querySelector('${BUTTON}').getAttribute('rel')`),
      'noopener noreferrer'
    );

    // A spotlight card opens the destination modal.
    const name = await page.evaluate<string>(`(() => {
      const card = document.querySelector('.group.cursor-pointer');
      card.click();
      return card.querySelector('img').alt;
    })()`);
    const id = await page.evaluate<string>(`fetch('/api/content').then((r) => r.json()).then((c) => c.destinations.find((d) => d.name === ${JSON.stringify(name)}).id)`);
    await expectHref(page, expected({ kind: 'destination', id, name }), `${name}'s modal`);
    await page.evaluate(`document.querySelector('[aria-label="Close modal"]').click(), true`);
    await expectHref(page, expected({ kind: 'general' }), 'modal closed');

    // "View Full Journey" opens the tour modal.
    await page.evaluate(`(() => {
      const card = [...document.querySelectorAll('#tours h3')].find((h) => h.textContent.trim() === 'Cultural Sri Lanka').closest('.group');
      [...card.querySelectorAll('button')].find((b) => b.textContent.trim() === 'View Full Journey').click();
      return true;
    })()`);
    await expectHref(page, expected({ kind: 'tour', id: 'cultural-sri-lanka', title: 'Cultural Sri Lanka' }), 'the tour modal');
    await page.evaluate(`document.querySelector('[aria-label="Close modal"]').click(), true`);
    await expectHref(page, expected({ kind: 'general' }), 'tour modal closed');

    // A route on the map counts while the map is on screen.
    await page.evaluate(`(() => {
      const card = [...document.querySelectorAll('#tours h3')].find((h) => h.textContent.trim() === 'Wild Sri Lanka Expedition').closest('.group');
      [...card.querySelectorAll('button')].find((b) => b.textContent.trim() === 'View route on map').click();
      return true;
    })()`);
    await waitFor(page, `document.querySelector('[data-route-chip]')`, 'the route chip');
    await expectHref(page, expected({ kind: 'tour', id: 'wild-sri-lanka', title: 'Wild Sri Lanka Expedition' }), 'the route on the map');
    await page.evaluate(`document.querySelector('footer').scrollIntoView(), true`);
    await expectHref(page, expected({ kind: 'general' }), 'route shown but the map scrolled away');
  });

  test('?destination= and ?tour= open their modal and leave the address bar; unknown ids are ignored', async () => {
    let page = await openPage({ path: '/?destination=ella' });
    await waitFor(page, `[...document.querySelectorAll('.fixed.inset-0 h2')].some((h) => h.textContent.trim() === 'Ella')`, "Ella's modal");
    await waitFor(page, `location.search === ''`, 'the parameter to go');
    await expectHref(page, expected({ kind: 'destination', id: 'ella', name: 'Ella' }), 'the deep-linked destination');

    page = await openPage({ path: '/?tour=island-in-7-days' });
    await waitFor(page, `[...document.querySelectorAll('.fixed.inset-0 h2')].some((h) => h.textContent.trim() === 'Island in 7 Days')`, 'the tour modal');
    await waitFor(page, `location.search === ''`, 'the parameter to go');
    await expectHref(page, expected({ kind: 'tour', id: 'island-in-7-days', title: 'Island in 7 Days' }), 'the deep-linked tour');

    page = await openPage({ path: '/?destination=nowhere&tour=nothing' });
    await waitFor(page, `location.search === ''`, 'the parameters to go');
    await sleep(300);
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('.fixed.inset-0').length`), 0, 'no modal');
    await expectHref(page, expected({ kind: 'general' }), 'unknown ids');
  });

  test('phone: never over the map zoom buttons or Quick Jump bar, shown again once clear', async () => {
    const page = await openPage({ mobile: true });
    await page.evaluate(`document.querySelector('#explore-map').scrollIntoView(), true`);
    await waitFor(page, `document.querySelector('#explore-map .leaflet-control-zoom')`, 'the zoom buttons');
    await sleep(800);

    // Sweep the map's bottom edge up through the button's corner.
    const zoomTop = await page.evaluate<number>(
      `document.querySelector('#explore-map .leaflet-control-zoom').getBoundingClientRect().top + window.scrollY`
    );
    let hiddenAtLeastOnce = false;
    for (let offset = -100; offset <= 900; offset += 20) {
      await page.evaluate(`window.scrollTo(0, ${zoomTop - 844 + offset}), true`);
      await frames(page);
      assert.equal(await coversElement(page, '#explore-map .leaflet-control-zoom'), false, `zoom buttons covered at ${offset}`);
      assert.equal(await coversElement(page, '#explore-map [data-keep-clear]'), false, `Quick Jump covered at ${offset}`);
      if (!(await shown(page))) hiddenAtLeastOnce = true;
    }
    assert.ok(hiddenAtLeastOnce, 'the button stepped aside somewhere in the sweep');

    // With the zoom buttons in the bottom-right corner, they take the tap.
    await page.evaluate(`(() => {
      const r = document.querySelector('#explore-map .leaflet-control-zoom').getBoundingClientRect();
      window.scrollBy(0, r.bottom - (innerHeight - 30));
      return true;
    })()`);
    await frames(page);
    assert.equal(await shown(page), false);
    assert.ok(await tappable(page, '#explore-map .leaflet-control-zoom-in'), 'zoom in takes the tap');
    assert.ok(await tappable(page, '#explore-map .leaflet-control-zoom-out'), 'zoom out takes the tap');

    // Away from the map, it's back.
    await page.evaluate(`document.querySelector('#tours').scrollIntoView(), true`);
    await frames(page);
    assert.equal(await shown(page), true);
  });

  test('phone: hidden while the enquiry form is open, so the submit button is clear', async () => {
    const page = await openPage({ mobile: true });
    await page.evaluate(`document.querySelector('#tours').scrollIntoView(), true`);
    await frames(page);
    assert.equal(await shown(page), true, 'precondition: shown');

    await page.evaluate(`[...document.querySelectorAll('#tours button')].find((b) => b.textContent.trim() === 'Inquire').click(), true`);
    await waitFor(page, `document.querySelector('.fixed.inset-0 form button[type=submit]')`, 'the enquiry form');
    await page.evaluate(`document.querySelector('.fixed.inset-0 form button[type=submit]').scrollIntoView({ block: 'end' }), true`);
    await sleep(400);
    assert.equal(await shown(page), false, 'hidden with the form open');
    assert.equal(
      await page.evaluate<string>(`getComputedStyle(document.querySelector('${BUTTON}')).visibility`),
      'hidden',
      'out of reach, not just transparent'
    );
    assert.ok(await tappable(page, '.fixed.inset-0 form button[type=submit]'), 'submit takes the tap');
  });

  test("phone: clear of the destination and tour modals' main buttons", async () => {
    const page = await openPage({ mobile: true, path: '/?destination=ella' });
    await waitFor(page, `document.querySelector('.fixed.inset-0 [data-keep-clear]')`, "Ella's modal");
    // Scroll the modal to its end, where its main button reaches the corner.
    for (let i = 0; i < 2; i += 1) {
      await page.evaluate(`[...document.querySelectorAll('.fixed.inset-0, .fixed.inset-0 .overflow-y-auto')].forEach((el) => { el.scrollTop = el.scrollHeight; }), true`);
      await sleep(500);
    }
    assert.equal(await coversElement(page, '.fixed.inset-0 [data-keep-clear]'), false, 'destination button covered');
    assert.ok(await tappable(page, '.fixed.inset-0 [data-keep-clear]'), 'destination button takes the tap');
    await page.evaluate(`document.querySelector('[aria-label="Close modal"]').click(), true`);

    await page.evaluate(`(() => {
      const card = [...document.querySelectorAll('#tours h3')].find((h) => h.textContent.trim() === 'Island in 7 Days').closest('.group');
      [...card.querySelectorAll('button')].find((b) => b.textContent.trim() === 'View Full Journey').click();
      return true;
    })()`);
    await waitFor(page, `document.querySelector('.fixed.inset-0 [data-keep-clear]')`, 'the tour modal');
    for (let i = 0; i < 2; i += 1) {
      await page.evaluate(`[...document.querySelectorAll('.fixed.inset-0, .fixed.inset-0 .overflow-y-auto')].forEach((el) => { el.scrollTop = el.scrollHeight; }), true`);
      await sleep(500);
    }
    assert.equal(await coversElement(page, '.fixed.inset-0 [data-keep-clear]'), false, 'tour button covered');
    assert.ok(await tappable(page, '.fixed.inset-0 [data-keep-clear]'), 'tour button takes the tap');
  });

  test('admin Settings: "Test in WhatsApp" only once a number is saved', async () => {
    await setNumber(null);
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/login` });
    await waitFor(page, `document.querySelector('#admin-email')`, 'the login page');
    const status = await page.evaluate<number>(`fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} })
    }).then((r) => r.status)`);
    assert.equal(status, 200, 'signed in');

    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/settings` });
    await waitFor(page, `document.querySelector('#field-whatsapp_number')`, 'the settings form');
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-whatsapp-test]').length`), 0, 'no number, no link');

    // Typing doesn't count; saving does. The saved value is digits only.
    await page.evaluate(`(() => {
      const input = document.querySelector('#field-whatsapp_number');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '+94 77 123 4567');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    await sleep(200);
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-whatsapp-test]').length`), 0, 'not before saving');
    await page.evaluate(`document.querySelector('form button[type=submit]').click(), true`);
    await waitFor(page, `document.querySelector('[data-whatsapp-test]')`, 'the test link');

    const link = await page.evaluate<{ href: string; target: string; rel: string; text: string }>(`(() => {
      const a = document.querySelector('[data-whatsapp-test]');
      return { href: a.getAttribute('href'), target: a.target, rel: a.rel, text: a.textContent.trim() };
    })()`);
    assert.deepEqual(link, { href: `https://wa.me/${NUMBER}`, target: '_blank', rel: 'noopener noreferrer', text: 'Test in WhatsApp' });

    // A bad number gets its message under the field.
    await page.evaluate(`(() => {
      const input = document.querySelector('#field-whatsapp_number');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '940771234567');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('focusout', { bubbles: true }));
      return true;
    })()`);
    await page.evaluate(`document.querySelector('form button[type=submit]').click(), true`);
    await waitFor(page, `document.body.innerText.includes('Remove the 0 after 94.')`, 'the field error');
  });
});
