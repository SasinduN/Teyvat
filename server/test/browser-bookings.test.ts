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
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
    assert.ok(!(await linkTexts(tour, 'header nav')).includes('Book Your Ride'), 'header');
    assert.ok(!(await linkTexts(tour, 'footer')).includes('Book Your Ride'), 'footer');
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
    assert.equal(nav[nav.indexOf('Tours') + 1], 'Book Your Ride');
    assert.ok((await linkTexts(tour, 'footer')).includes('Book Your Ride'), 'footer');
    assert.ok((await buttonTexts(tour)).includes('Inquire About This Tour'));
    const href = await tour.evaluate<string>(`[...document.querySelectorAll('main a')].find((a) => a.textContent.trim() === 'Book This Tour').getAttribute('href')`);
    assert.equal(href, '/booking?tour=island-in-7-days');

    const booking = await openPage(on, href);
    assert.equal(await booking.evaluate<string>('document.title'), PAGE_TITLES.booking);
    await waitFor(booking, `document.querySelector('#booking-tour')?.value === 'island-in-7-days'`, 'the tour chosen');
    assert.equal(await booking.evaluate<number>(`document.querySelectorAll('main h1').length`), 1, 'one h1');
  });

  async function fill(page: Page, label: string, value: string) {
    await page.evaluate(`(() => { const label = [...document.querySelectorAll('label')].find(l => l.textContent.trim() === ${JSON.stringify(label)}); const input = document.getElementById(label.htmlFor); const prototype = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return true; })()`);
  }

  test('ride: seven inputs, live summary, conditional returns and all five responsive widths', async () => {
    const page = await openPage(on, '/booking');
    await waitFor(page, `document.querySelector('.ride-form')`, 'ride form');
    assert.equal(await page.evaluate<string>(`document.querySelector('main h1').textContent`), 'Book Your Ride');
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('.ride-form input:not([type=radio]), .ride-form select').length`), 6);
    assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('.ride-summary'))`), false, 'no empty summary');
    assert.equal(await page.evaluate<boolean>(`/Contact details|Customer name|Travel notes|Tours \(optional\)/.test(document.querySelector('.ride-form').textContent)`), false);
    await fill(page, 'Pickup location', 'Matara'); await fill(page, 'Drop-off location', 'Galle');
    await waitFor(page, `document.querySelector('.ride-summary')?.textContent.includes('Matara') && document.querySelector('.ride-summary')?.textContent.includes('Galle')`, 'live route');
    await page.evaluate(`document.querySelector('input[value=one_way]').focus(), true`);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await waitFor(page, `document.querySelector('#ride-returnDate')`, 'return fields');
    await fill(page, 'Return date', '2030-12-21'); await fill(page, 'Return time', '10:00');
    await page.evaluate(`document.querySelector('input[value=one_way]').click(), true`);
    await waitFor(page, `!document.querySelector('#ride-returnDate')`, 'hidden returns');
    await page.evaluate(`document.querySelector('input[value=round_trip]').click(), true`);
    assert.equal(await page.evaluate<string>(`document.querySelector('#ride-returnDate').value`), '', 'cleared returns');
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
      await sleep(150);
      const layout = await page.evaluate<{ overflow: boolean; form: { x: number; bottom: number }; summary: { x: number; y: number } }>(`(() => { const f = document.querySelector('.ride-form').getBoundingClientRect(); const s = document.querySelector('.ride-summary').getBoundingClientRect(); return { overflow: document.documentElement.scrollWidth > innerWidth, form: {x:f.x,bottom:f.bottom}, summary:{x:s.x,y:s.y} }; })()`);
      assert.equal(layout.overflow, false, `no overflow at ${width}`);
      if (width < 768) assert.ok(layout.summary.y >= layout.form.bottom, `summary below at ${width}`);
      else assert.ok(layout.summary.x > layout.form.x, `summary beside at ${width}`);
      const shot = await page.send('Page.captureScreenshot', { captureBeyondViewport: true });
      const directory = join(REPO_ROOT, 'docs/qa-results/rides'); mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, `ride-${width}.png`), Buffer.from(shot.data as string, 'base64'));
    }
    await page.evaluate(`document.documentElement.dataset.theme = 'dark', true`);
    assert.notEqual(await page.evaluate<string>(`getComputedStyle(document.querySelector('.ride-summary')).backgroundColor`), 'rgb(234, 247, 252)', 'dark summary');
  });

  test('ride: guest callback dialog, validation, keyboard focus and pending backend submission', async () => {
    // Test-only capacity: never changes the development/production catalog.
    await pool.query(`update public.booking_vehicles set passenger_capacity=4, accepting_requests=true where id='car'`);
    const page = await openPage(on, '/booking');
    await page.evaluate(`fetch('/api/auth/logout', { method: 'POST' }).then(() => true)`);
    await page.send('Page.navigate', { url: `${on.baseUrl}/booking` });
    await waitFor(page, `document.querySelector('.ride-form')`, 'guest ride form');
    await fill(page, 'Pickup location', 'Matara'); await fill(page, 'Drop-off location', 'Matara');
    await page.evaluate(`document.querySelector('.ride-submit').click(), true`);
    await waitFor(page, `document.body.textContent.includes('must be different')`, 'invalid identical route');
    assert.equal(await page.evaluate<boolean>(`document.querySelector('dialog').open`), false);
    await fill(page, 'Drop-off location', 'Galle'); await fill(page, 'Pickup date', '2030-12-20');
    await fill(page, 'Pickup time', '09:00'); await fill(page, 'Number of passengers', '5'); await fill(page, 'Vehicle category', 'car');
    await page.evaluate(`document.querySelector('.ride-submit').click(), true`);
    await waitFor(page, `document.querySelector('#ride-passengers').getAttribute('aria-invalid') === 'true'`, 'capacity validation');
    await fill(page, 'Number of passengers', '2');
    await page.evaluate(`document.querySelector('.ride-submit').click(), true`);
    await waitFor(page, `document.querySelector('dialog').open`, 'callback dialog');
    assert.equal(Number((await pool.query('select count(*) from public.bookings')).rows[0].count), 0, 'no anonymous request');
    assert.equal(await page.evaluate<boolean>(`document.querySelector('dialog').contains(document.activeElement)`), true, 'modal focus');
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor(page, `!document.querySelector('dialog').open`, 'escape closes');
    assert.equal(await page.evaluate<boolean>(`document.activeElement === document.querySelector('.ride-submit')`), true, 'focus returned');
    await page.evaluate(`document.querySelector('.ride-submit').click(), true`);
    await waitFor(page, `document.querySelector('dialog').open`, 'dialog reopened');
    await fill(page, 'Callback phone number', '123');
    await page.evaluate(`document.querySelector('dialog form').requestSubmit(), true`);
    await waitFor(page, `document.querySelector('#ride-callback-phone').getAttribute('aria-invalid') === 'true'`, 'callback validation');
    await fill(page, 'Callback phone number', '+94771234567');
    // Lose a real successful response: the retry must recover the same row.
    await page.evaluate(`(() => { const original = window.fetch.bind(window); window.__rideKeys = []; window.fetch = async (url, options) => { if (String(url).endsWith('/bookings/rides') && options?.method === 'POST') { window.__rideKeys.push(new Headers(options.headers).get('Idempotency-Key')); const response = await original(url, options); if (window.__rideKeys.length === 1) throw new TypeError('Simulated lost response'); return response; } return original(url, options); }; return true; })()`);
    await page.evaluate(`document.querySelector('dialog form').requestSubmit(); document.querySelector('dialog form').requestSubmit(); true`);
    await waitFor(page, `document.querySelector('dialog').textContent.includes('Retry Ride Request')`, 'recoverable network failure');
    assert.equal(await page.evaluate<boolean>(`document.querySelector('#ride-callback-phone').disabled`), true, 'ambiguous request cannot change');
    await page.evaluate(`document.querySelector('dialog form').requestSubmit(), true`);
    await waitFor(page, `document.body.textContent.includes('Ride request submitted. Confirmation is pending.')`, 'pending receipt');
    const keys = await page.evaluate<string[]>('window.__rideKeys'); assert.equal(keys.length, 2); assert.equal(keys[0], keys[1], 'retry preserves idempotency key');
    const rows = (await pool.query('select status, destination_id, details from public.bookings')).rows;
    assert.equal(rows.length, 1, 'duplicate submit prevented'); assert.equal(rows[0].status, 'pending'); assert.equal(rows[0].destination_id, null);
    assert.equal(rows[0].details.dropoff.label, 'Galle'); assert.equal(rows[0].details.contactPhone, '+94771234567');
    await pool.query('delete from public.booking_history'); await pool.query('delete from public.bookings');
  });

  test('on: GPS only when asked, with the explanation beside the button', async () => {
    const page = await openPage(on, '/booking');
    await waitFor(page, `[...document.querySelectorAll('main button')].some((b) => b.textContent.includes('Use My Current Location'))`, 'the form');
    await sleep(500);
    assert.equal(await page.evaluate<number>('window.__geoCalls'), 0, 'not on load');
    const help = await page.evaluate<string>(
      `document.getElementById([...document.querySelectorAll('main button')].find((b) => b.textContent.includes('Use My Current Location')).getAttribute('aria-describedby')).textContent`
    );
    assert.match(help, /once/);
    assert.match(help, /never track/);

    await page.evaluate(`[...document.querySelectorAll('main button')].find((b) => b.textContent.includes('Use My Current Location')).click(), true`);
    await waitFor(page, `window.__geoCalls === 1 && document.body.textContent.includes('Coordinates: 7.29000, 80.63000')`, 'one reading, shown');
    await page.evaluate(`navigator.geolocation.getCurrentPosition = (ok, fail) => fail({ code: 1 }); true`);
    await page.evaluate(`[...document.querySelectorAll('main button')].find((b) => b.textContent.includes('Use My Current Location')).click(), true`);
    await waitFor(page, `document.body.textContent.includes('You can type your pickup location.')`, 'manual fallback on denial');
  });

  test('on: Admin → Bookings lists requests and the vehicles', async () => {
    const page = await signIn(on);
    await page.send('Page.navigate', { url: `${on.baseUrl}/admin/bookings` });
    await waitFor(page, `document.body.textContent.includes('Vehicle categories') && document.body.textContent.includes('No booking requests')`, 'the bookings page');
    assert.equal(await page.evaluate<boolean>(`document.body.textContent.includes('Bookings are switched off')`), false);
  });
});
