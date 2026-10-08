// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The WhatsApp chat button, on the real built site in headless Chrome:
 *
 *   - with no number set there is no button and no wa.me link at all;
 *   - the link's message follows the page the visitor is on: a
 *     destination, tour or experience page, a tour route while the home
 *     map is on screen, or nothing in particular;
 *   - the old `?destination=` and `?tour=` links land on the pages;
 *   - on a phone it never covers the map's zoom buttons or Quick Jump bar,
 *     the pages' main buttons, or an enquiry form's submit button;
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
    await waitFor(page, `document.querySelector('main h1')`, 'the page');
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

  /**
   * Waits up to `ms` for the button to settle into `want`. It decides in an
   * animation frame and React commits after, so on a busy machine a fixed
   * two frames can sample it mid-update.
   */
  async function expectShown(page: Page, want: boolean, what: string, ms = 1_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if ((await shown(page)) === want) return;
      await sleep(25);
    }
    assert.equal(await shown(page), want, what);
  }

  /** Waits up to a second for the button to be clear of `selector`. */
  async function expectClearOf(page: Page, selector: string, what: string): Promise<void> {
    const until = Date.now() + 1_000;
    while (Date.now() < until) {
      if (!(await coversElement(page, selector))) return;
      await sleep(25);
    }
    assert.fail(what);
  }

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
  /**
   * Whether a tap at the middle of `selector` lands on it, not on something
   * above it: null when it does, else what is on top. Polls for up to 1.5 s,
   * since the button's 300 ms fade can start late behind other animations.
   */
  async function coveredBy(page: Page, selector: string): Promise<string | null> {
    const until = Date.now() + 1_500;
    for (;;) {
      const on = await page.evaluate<string | null>(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit && el.contains(hit) ? null : (hit ? hit.outerHTML.slice(0, 120) : 'nothing');
      })()`);
      if (on === null || Date.now() > until) return on;
      await sleep(50);
    }
  }


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

  /** Clicks the first link whose text is `text`, and waits for `path`. */
  async function follow(page: Page, scope: string, text: string, path: string): Promise<void> {
    await page.evaluate(`[...document.querySelectorAll(${JSON.stringify(`${scope} a`)})].find((a) => a.textContent.trim() === ${JSON.stringify(text)}).click(), true`);
    // The page on screen, not just the URL (see PublicLayout's RouteEffects).
    await waitFor(page, `document.body.dataset.route === ${JSON.stringify(path)} && document.querySelector('main h1')`, path);
  }

  test('the message follows the page the visitor is on', async () => {
    const page = await openPage();
    await expectHref(page, expected({ kind: 'general' }), 'home: the general message');
    assert.equal(
      await page.evaluate<string>(`document.querySelector('${BUTTON}').getAttribute('rel')`),
      'noopener noreferrer'
    );

    // A spotlight card goes to the destination's page.
    const name = await page.evaluate<string>(`(() => {
      const card = document.querySelector('#destinations a[href^="/destinations/"]');
      card.click();
      return card.querySelector('img').alt;
    })()`);
    const id = await page.evaluate<string>(`fetch('/api/content').then((r) => r.json()).then((c) => c.destinations.find((d) => d.name === ${JSON.stringify(name)}).id)`);
    await waitFor(page, `document.body.dataset.route === '/destinations/${id}'`, `${name}'s page`);
    await expectHref(page, expected({ kind: 'destination', id, name }), `${name}'s page`);

    // A tour page, from the Tours list.
    await follow(page, 'nav', 'Tours', '/tours');
    await expectHref(page, expected({ kind: 'general' }), 'the tours list');
    await follow(page, '#tours', 'View Full Journey', '/tours/island-in-7-days');
    await expectHref(page, expected({ kind: 'tour', id: 'island-in-7-days', title: 'Island in 7 Days' }), 'a tour page');

    // An experience page.
    await follow(page, 'nav', 'Experiences', '/experiences');
    await page.evaluate(`document.querySelector('a[href="/experiences/safari-yala"]').click(), true`);
    await waitFor(page, `document.body.dataset.route === '/experiences/safari-yala'`, 'the experience page');
    await expectHref(page, expected({ kind: 'experience', id: 'safari-yala', title: 'Safari in Yala' }), 'an experience page');

    // Home again: a route on the map counts while the map is on screen.
    await follow(page, 'nav', 'Home', '/');
    await expectHref(page, expected({ kind: 'general' }), 'home again');
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

  test('old ?destination= and ?tour= links land on the page; unknown ids on the 404', async () => {
    let page = await openPage({ path: '/?destination=ella' });
    await waitFor(page, `location.pathname === '/destinations/ella' && location.search === ''`, "Ella's page");
    await expectHref(page, expected({ kind: 'destination', id: 'ella', name: 'Ella' }), 'the old destination link');

    page = await openPage({ path: '/?tour=island-in-7-days' });
    await waitFor(page, `location.pathname === '/tours/island-in-7-days' && location.search === ''`, 'the tour page');
    await expectHref(page, expected({ kind: 'tour', id: 'island-in-7-days', title: 'Island in 7 Days' }), 'the old tour link');

    page = await openPage({ path: '/?destination=nowhere' });
    await waitFor(page, `location.pathname === '/destinations/nowhere' && document.querySelector('[data-not-found]')`, 'the 404 page');
    await expectHref(page, expected({ kind: 'general' }), 'an unknown id');
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
      await expectClearOf(page, '#explore-map .leaflet-control-zoom', `zoom buttons covered at ${offset}`);
      await expectClearOf(page, '#explore-map [data-keep-clear]', `Quick Jump covered at ${offset}`);
      if (!(await shown(page))) hiddenAtLeastOnce = true;
    }
    assert.ok(hiddenAtLeastOnce, 'the button stepped aside somewhere in the sweep');

    // With the zoom buttons in the bottom-right corner, they take the tap.
    await page.evaluate(`(() => {
      const r = document.querySelector('#explore-map .leaflet-control-zoom').getBoundingClientRect();
      window.scrollBy(0, r.bottom - (innerHeight - 30));
      return true;
    })()`);
    await expectShown(page, false, 'steps aside from the zoom buttons');
    assert.equal(await coveredBy(page, '#explore-map .leaflet-control-zoom-in'), null, 'zoom in takes the tap');
    assert.equal(await coveredBy(page, '#explore-map .leaflet-control-zoom-out'), null, 'zoom out takes the tap');

    // Away from the map, it's back.
    await page.evaluate(`document.querySelector('#tours').scrollIntoView(), true`);
    await expectShown(page, true, 'back once clear of the map');
  });

  test('phone: hidden while the enquiry form is open, so the submit button is clear', async () => {
    const page = await openPage({ mobile: true });
    await page.evaluate(`document.querySelector('#tours').scrollIntoView(), true`);
    await expectShown(page, true, 'precondition: shown');

    await page.evaluate(`[...document.querySelectorAll('#tours button')].find((b) => b.textContent.trim() === 'Inquire').click(), true`);
    await waitFor(page, `document.querySelector('.fixed.inset-0 form button[type=submit]')`, 'the enquiry form');
    await page.evaluate(`document.querySelector('.fixed.inset-0 form button[type=submit]').scrollIntoView({ block: 'end' }), true`);
    await expectShown(page, false, 'hidden with the form open');
    // Out of reach, not just transparent: the 300 ms fade ends in visibility: hidden.
    await waitFor(page, `getComputedStyle(document.querySelector('${BUTTON}')).visibility === 'hidden'`, 'the fade to finish', 1_500);
    assert.equal(await coveredBy(page, '.fixed.inset-0 form button[type=submit]'), null, 'submit takes the tap');
  });

  /**
   * Sweeps the page's scroll so `selector` passes through the bottom of the
   * viewport, where the button sits; it must never cover it, and it must take
   * the tap where they would meet.
   */
  async function sweepPast(page: Page, selector: string, what: string): Promise<void> {
    const top = await page.evaluate<number>(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top + scrollY`);
    for (let offset = -120; offset <= 160; offset += 20) {
      await page.evaluate(`window.scrollTo(0, ${top - 844 + offset}), true`);
      await frames(page);
      await expectClearOf(page, selector, `${what} covered at ${offset}`);
    }
    await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'end' }), true`);
    await frames(page);
    assert.equal(await coveredBy(page, selector), null, `${what} takes the tap`);
  }

  test("phone: clear of the pages' main buttons and the About page's form", async () => {
    let page = await openPage({ mobile: true, path: '/destinations/ella' });
    await sweepPast(page, 'main [data-keep-clear]', 'Plan A Trip to Ella');

    page = await openPage({ mobile: true, path: '/tours/island-in-7-days' });
    await sweepPast(page, 'main [data-keep-clear]', 'Book / Inquire This Tour');

    page = await openPage({ mobile: true, path: '/about' });
    await sweepPast(page, 'main form button[type=submit]', "the About page's submit button");
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
