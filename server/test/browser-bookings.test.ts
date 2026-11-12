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

import { PAGE_NAMES, pageTitle } from '../../shared/page-meta';
import { BRAND } from '../../shared/brand';
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
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__bookingRequests = []; const originalFetch = window.fetch.bind(window); window.fetch = (input, init) => { const url = new URL(input instanceof Request ? input.url : String(input), location.href); if (url.pathname.startsWith('/api/bookings')) window.__bookingRequests.push({ path: url.pathname, method: init?.method ?? (input instanceof Request ? input.method : 'GET') }); return originalFetch(input, init); };` });
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
    assert.equal(await booking.evaluate<string>('document.title'), pageTitle(PAGE_NAMES.notFound, BRAND));
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
    assert.equal(await booking.evaluate<string>('document.title'), pageTitle(PAGE_NAMES.booking, BRAND));
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

  test('ride: missing WhatsApp configuration disables handoff without an admin fallback', async () => {
    await pool.query('update public.site_settings set whatsapp_number = null where id');
    const page = await openPage(on, '/booking');
    await waitFor(page, `document.querySelector('.ride-form')`, 'ride form');
    assert.equal(await page.evaluate<boolean>(`document.querySelector('.ride-submit').disabled`), true);
    assert.ok(await page.evaluate<boolean>(`document.body.textContent.includes('WhatsApp ride enquiries are currently unavailable')`));
    const requests = await page.evaluate<{ path: string; method: string }[]>('window.__bookingRequests');
    assert.ok(requests.length > 0); assert.ok(requests.every(r => r.method === 'GET' && r.path === '/api/bookings/catalog'));
  });

  test('ride: validated WhatsApp handoff uses configured number and never submits to admin', async () => {
    await pool.query(`update public.booking_vehicles set passenger_capacity=4, accepting_requests=true where id='car'`);
    await pool.query(`update public.site_settings set whatsapp_number='94771236478' where id`);
    const before = Number((await pool.query('select count(*) from public.bookings')).rows[0].count);
    const page = await openPage(on, '/booking');
    await waitFor(page, `document.querySelector('.ride-form')`, 'ride form');
    await page.evaluate(`window.__rideOpened = []; window.open = (url, target, features) => { window.__rideOpened.push({url, target, features}); return null; }; true`);
    await fill(page, 'Pickup location', 'Matara'); await fill(page, 'Drop-off location', 'Matara');
    await page.evaluate(`document.querySelector('.ride-form').requestSubmit(), true`);
    await waitFor(page, `document.body.textContent.includes('must be different')`, 'invalid identical route');
    assert.equal(await page.evaluate<number>('window.__rideOpened.length'), 0);
    await fill(page, 'Drop-off location', 'Galle'); await fill(page, 'Pickup date', '2099-12-20');
    await fill(page, 'Pickup time', '09:00'); await fill(page, 'Number of passengers', '5'); await fill(page, 'Vehicle category', 'car');
    await page.evaluate(`document.querySelector('.ride-form').requestSubmit(), true`);
    await waitFor(page, `document.querySelector('#ride-passengers').getAttribute('aria-invalid') === 'true'`, 'capacity validation');
    assert.equal(await page.evaluate<number>('window.__rideOpened.length'), 0);
    await fill(page, 'Number of passengers', '2');
    await page.evaluate(`document.querySelector('input[value=round_trip]').click(), true`);
    await fill(page, 'Return date', '2099-12-21'); await fill(page, 'Return time', '17:30');
    // Keyboard submits the actual form; mocked opening prevents contacting WhatsApp.
    await page.send('Page.bringToFront');
    assert.equal(await page.evaluate<boolean>(`document.querySelector('.ride-submit').disabled`), false, 'configured WhatsApp enables submission');
    await page.evaluate(`document.querySelector('.ride-submit').focus(), true`);
    assert.equal(await page.evaluate<boolean>(`document.activeElement === document.querySelector('.ride-submit')`), true, 'submit has keyboard focus');
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await waitFor(page, `window.__rideOpened.length === 1`, 'WhatsApp draft');
    const opened = await page.evaluate<{url:string;target:string;features:string}[]>('window.__rideOpened');
    const url = new URL(opened[0].url); assert.equal(url.origin, 'https://wa.me'); assert.equal(url.pathname, '/94771236478');
    assert.equal(opened[0].target, '_blank'); assert.equal(opened[0].features, 'noopener,noreferrer');
    const message = url.searchParams.get('text')!;
    for (const part of ['Pickup: Matara', 'Drop-off: Galle', '2099-12-20 09:00', '2099-12-21 17:30', 'Return route: Galle → Matara', 'Passengers: 2', 'Vehicle: Car', 'UTC+05:30']) assert.ok(message.includes(part), part);
    assert.equal(await page.evaluate<string>(`document.querySelector('.ride-form a[href^="https://wa.me/"]').href`), url.href, 'popup fallback has the same draft after URL normalization');
    assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('dialog, .ride-success, .ride-requests'))`), false, 'no admin callback, receipt or request history');
    const requests = await page.evaluate<{path:string;method:string}[]>('window.__bookingRequests');
    assert.ok(requests.every(r => r.method === 'GET' && r.path === '/api/bookings/catalog'), 'no guest/account/history or booking writes');
    assert.equal(Number((await pool.query('select count(*) from public.bookings')).rows[0].count), before, 'admin bookings unchanged');
    await fill(page, 'Drop-off location', 'Colombo');
    await waitFor(page, `!document.querySelector('.ride-form a[href^="https://wa.me/"]')`, 'old draft cleared after edits');
    await pool.query('update public.site_settings set whatsapp_number = null where id');
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
