// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Bookings in Chrome, switched off (the default) and on (`BOOKINGS_ENABLED`):
 *
 *   - off: no "Book a Trip" in the header or footer, no "Book This Tour" on a
 *     tour page (its enquiry button keeps "Book / Inquire This Tour"),
 *     /booking is the 404 page, and Admin → Bookings says they're off;
 *   - on: the link after Tours, the button on a tour page with that tour
 *     chosen, the form at /booking, and the admin's list and vehicles;
 *   - the GPS is read only when the visitor presses its button, which says
 *     what it does first.
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { PAGE_TITLES } from '../../shared/page-meta';
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

/** Counts geolocation calls, so a test can tell whether the page asked. */
const GEO_SPY = `
  window.__geoCalls = 0;
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition(ok) { window.__geoCalls += 1; ok({ coords: { latitude: 7.29, longitude: 80.63, accuracy: 25 } }); },
    watchPosition() { window.__geoCalls += 1; return 0; },
    clearWatch() {}
  } });
`;

describe('bookings off and on, in Chrome', { skip, timeout: 4 * 60_000 }, () => {
  let off: RunningApp;
  let on: RunningApp;
  let chrome: Chrome;

  async function waitFor(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await page.evaluate<boolean>(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`)) return;
      await sleep(100);
    }
    const shown = await page.evaluate<string>(`(document.querySelector('main') ?? document.body).innerText.slice(0, 300)`).catch(() => '');
    throw new Error(`timed out waiting for ${what}; the page shows: ${shown}`);
  }

  async function openPage(app: RunningApp, path: string): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: GEO_SPY });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await waitFor(page, `document.querySelector('main h1') && document.querySelector('footer')`, path);
    return page;
  }

  async function signIn(app: RunningApp): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/login` });
    // Cookies on localhost are shared between ports: the other app's sign-in may already hold.
    await waitFor(page, `document.querySelector('#admin-email') || document.querySelector('a[href="/admin/bookings"]')`, 'the login page or the admin');
    const status = await page.evaluate<number>(`fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} })
    }).then((r) => r.status)`);
    assert.equal(status, 200, 'signed in');
    return page;
  }

  const linkTexts = (page: Page, scope: string) =>
    page.evaluate<string[]>(`[...document.querySelectorAll(${JSON.stringify(`${scope} a`)})].map((a) => a.textContent.trim())`);
  const buttonTexts = (page: Page) => page.evaluate<string[]>(`[...document.querySelectorAll('main a, main button')].map((b) => b.textContent.trim())`);

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    await resetAuthTables();
    await createUser();
    off = await listen(createApp({ media: null }));
    on = await listen(createApp({ media: null, bookings: true }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await Promise.all([off?.close(), on?.close()]);
    await pool.end();
  }, HOOK_TIMEOUT);

  test('off: no link, no button, /booking is the 404 page', async () => {
    const tour = await openPage(off, '/tours/island-in-7-days');
    assert.ok(!(await linkTexts(tour, 'header nav')).includes('Book a Trip'), 'header');
    assert.ok(!(await linkTexts(tour, 'footer')).includes('Book a Trip'), 'footer');
    const buttons = await buttonTexts(tour);
    assert.ok(!buttons.some((t) => t.startsWith('Book This Tour')), 'no Book This Tour');
    assert.ok(buttons.includes('Book / Inquire This Tour'), 'the enquiry button as before');

    const booking = await openPage(off, '/booking');
    assert.equal(await booking.evaluate<string>('document.title'), PAGE_TITLES.notFound);
    assert.equal(await booking.evaluate<boolean>(`Boolean(document.querySelector('#my-bookings'))`), false);
  });

  test('off: Admin → Bookings says they are switched off', async () => {
    const page = await signIn(off);
    await page.send('Page.navigate', { url: `${off.baseUrl}/admin/bookings` });
    await waitFor(page, `document.body.textContent.includes('Bookings are switched off')`, 'the switched-off note');
    assert.equal(await page.evaluate<boolean>(`document.body.textContent.includes('Vehicle categories')`), false);
  });

  test('on: the link after Tours, Book This Tour with that tour chosen, and the form', async () => {
    const tour = await openPage(on, '/tours/island-in-7-days');
    const nav = await linkTexts(tour, 'header nav');
    assert.equal(nav[nav.indexOf('Tours') + 1], 'Book a Trip');
    assert.ok((await linkTexts(tour, 'footer')).includes('Book a Trip'), 'footer');
    assert.ok((await buttonTexts(tour)).includes('Inquire About This Tour'));
    const href = await tour.evaluate<string>(`[...document.querySelectorAll('main a')].find((a) => a.textContent.trim() === 'Book This Tour').getAttribute('href')`);
    assert.equal(href, '/booking?tour=island-in-7-days');

    const booking = await openPage(on, href);
    assert.equal(await booking.evaluate<string>('document.title'), PAGE_TITLES.booking);
    await waitFor(booking, `document.querySelector('#booking-tour')?.value === 'island-in-7-days'`, 'the tour chosen');
    assert.equal(await booking.evaluate<number>(`document.querySelectorAll('main h1').length`), 1, 'one h1');
  });

  test('on: GPS only when asked, with the explanation beside the button', async () => {
    const page = await openPage(on, '/booking');
    await waitFor(page, `[...document.querySelectorAll('main button')].some((b) => b.textContent.includes('Use my current location'))`, 'the form');
    await sleep(500);
    assert.equal(await page.evaluate<number>('window.__geoCalls'), 0, 'not on load');
    const help = await page.evaluate<string>(
      `document.getElementById([...document.querySelectorAll('main button')].find((b) => b.textContent.includes('Use my current location')).getAttribute('aria-describedby')).textContent`
    );
    assert.match(help, /once/);
    assert.match(help, /never track/);

    await page.evaluate(`[...document.querySelectorAll('main button')].find((b) => b.textContent.includes('Use my current location')).click(), true`);
    await waitFor(page, `window.__geoCalls === 1 && document.body.textContent.includes('Coordinates: 7.29000, 80.63000')`, 'one reading, shown');
  });

  test('on: Admin → Bookings lists requests and the vehicles', async () => {
    const page = await signIn(on);
    await page.send('Page.navigate', { url: `${on.baseUrl}/admin/bookings` });
    await waitFor(page, `document.body.textContent.includes('Vehicle categories') && document.body.textContent.includes('No booking requests')`, 'the bookings page');
    assert.equal(await page.evaluate<boolean>(`document.body.textContent.includes('Bookings are switched off')`), false);
  });
});
