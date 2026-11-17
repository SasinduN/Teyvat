// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The home hero's "Book a ride" slide and button (docs/plans/ride-vehicle-picker.md, part 9):
 *
 *   - bookings off: no ride slide, no "Book a ride" button, and no link to /booking anywhere on
 *     the home page (with them off, /booking is a 404);
 *   - bookings on: the ride slide is second (the first photo, its preload and share image stay),
 *     the button is among the fixed ones on every slide and links to /booking, and on the ride
 *     slide the line under the one h1 changes and the button becomes the primary one.
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { RIDE_SLIDE_COPY, RIDE_SLIDE_IMAGE } from '../../shared/ride-slide';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

describe('the hero\'s "Book a ride", off and on, in Chrome', { skip, timeout: 3 * 60_000 }, () => {
  let off: RunningApp;
  let on: RunningApp;
  let chrome: Chrome;
  let firstPhoto: string;

  async function waitFor(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await page.evaluate<boolean>(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`)) return;
      await sleep(100);
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  async function home(app: RunningApp, width = 1280): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    // Still slides: the carousel doesn't turn by itself with reduced motion.
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await page.send('Page.navigate', { url: `${app.baseUrl}/` });
    await waitFor(page, `document.body.dataset.route && document.querySelector('#hero .te-hero-slide') && document.querySelector('footer')`, 'the home page');
    return page;
  }

  const slides = (page: Page) => page.evaluate<{ ride: boolean; src: string | null }[]>(
    `[...document.querySelectorAll('#hero .te-hero-slide')].map((s) => ({ ride: s.classList.contains('te-hero-slide--ride'), src: s.querySelector('img')?.getAttribute('src') ?? null }))`
  );
  const bookingLinks = (page: Page) => page.evaluate<string[]>(
    `[...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /^\\/booking(\\?|$)/.test(h))`
  );

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    firstPhoto = (await pool.query<{ image: string }>('select image from public.hero_slides where published order by sort_order, id limit 1')).rows[0].image;
    off = await listen(createApp({ media: null }));
    on = await listen(createApp({ media: null, bookings: true }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await Promise.all([off?.close(), on?.close()]);
    await pool.end();
  }, HOOK_TIMEOUT);

  test('off: no ride slide, no button, and nothing on the home page links to /booking', async () => {
    const page = await home(off);
    const shown = await slides(page);
    assert.equal(shown.some((s) => s.ride), false, 'no ride slide');
    const count = Number((await pool.query('select count(*) from public.hero_slides where published')).rows[0].count);
    assert.equal(shown.length, count, 'only the published photos');
    assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-hero-booking], [data-hero-ride-line]'))`), false, 'no button, no ride line');
    assert.equal(await page.evaluate<boolean>(`document.querySelector('#hero').textContent.includes(${JSON.stringify(RIDE_SLIDE_COPY.button)})`), false);
    assert.deepEqual(await bookingLinks(page), [], 'no link to /booking anywhere');
    await page.send('Page.close');
  });

  /** The hero's buttons a visitor can see, by href. */
  const visibleActions = (page: Page) => page.evaluate<string[]>(
    `[...document.querySelectorAll('.te-hero-actions a')].filter((a) => getComputedStyle(a).display !== 'none' && a.getBoundingClientRect().height > 0).map((a) => a.getAttribute('href'))`
  );

  test('the buttons: phones with bookings on show Plan Your Journey and Book a ride; off, the hero is as before', async () => {
    const offPhone = await home(off, 375);
    assert.deepEqual(await visibleActions(offPhone), ['/explore', '/plan'], 'off, phone: as before');
    await offPhone.send('Page.close');
    const offWide = await home(off, 1280);
    assert.deepEqual(await visibleActions(offWide), ['/explore', '/plan'], 'off, laptop: as before');
    await offWide.send('Page.close');

    const onWide = await home(on, 1280);
    assert.deepEqual(await visibleActions(onWide), ['/explore', '/plan', '/booking'], 'on, laptop: three in a row');
    await onWide.send('Page.close');

    const onPhone = await home(on, 375);
    assert.deepEqual(await visibleActions(onPhone), ['/plan', '/booking'], 'on, phone: Book a ride in place of Explore');
    // Explore is still one tap away: the phone menu's Discover section links to it.
    await onPhone.evaluate(`document.querySelector('header button[aria-label*="menu" i]').click(), true`);
    await waitFor(onPhone, `[...document.querySelectorAll('a[href="/explore"]')].some((a) => !a.closest('#hero') && a.getBoundingClientRect().height > 0 && getComputedStyle(a).visibility === 'visible')`, 'Explore in the phone menu');
    await onPhone.send('Page.close');
  });

  test("the floating Book a ride steps out while the hero's is on screen, and comes back once it scrolls away", async () => {
    const floating = `document.querySelector('[data-floating-booking]')?.dataset.state`;
    for (const width of [375, 1280]) {
      const page = await home(on, width);
      await waitFor(page, `document.querySelector('[data-hero-booking]') && ${floating} === 'hidden'`, `hidden beside the hero's at ${width}`);
      assert.equal(await page.evaluate<boolean>(`document.querySelector('[data-floating-booking]').hasAttribute('inert')`), true, 'and out of the tab order');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-whatsapp-button]')?.dataset.state ?? 'none'`) !== 'hidden', true, 'WhatsApp stays');
      await page.evaluate(`window.scrollTo(0, document.querySelector('#hero').offsetHeight + 400), true`);
      await waitFor(page, `${floating} === 'shown'`, `back once the hero has gone at ${width}`);
      await page.evaluate('window.scrollTo(0, 0), true');
      await waitFor(page, `${floating} === 'hidden'`, `hidden again at the top at ${width}`);
      await page.send('Page.close');
    }
    // Elsewhere, with no hero button, it shows as before.
    const about = await chrome.newPage();
    await about.send('Page.navigate', { url: `${on.baseUrl}/about` });
    await waitFor(about, `document.body.dataset.route && ${floating} === 'shown'`, 'shown on /about');
    await about.send('Page.close');
    // Bookings off: no hero button and no floating Book a ride, as today; WhatsApp unchanged.
    const page = await home(off, 375);
    await waitFor(page, `document.querySelector('[data-whatsapp-button]')`, 'the WhatsApp button');
    assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-hero-booking], [data-floating-booking]'))`), false);
    assert.notEqual(await page.evaluate<string>(`document.querySelector('[data-whatsapp-button]').dataset.state`), 'hidden');
    await page.send('Page.close');
  });

  test('on: the ride slide is second, and the first photo stays first', async () => {
    const page = await home(on);
    const shown = await slides(page);
    assert.equal(shown[0].ride, false, 'a photo first');
    assert.equal(shown[1].ride, true, 'the ride slide second');
    assert.equal(shown.filter((s) => s.ride).length, 1);
    const without = await home(off);
    assert.equal(shown[0].src, (await slides(without))[0].src, 'the same first photo as with bookings off');
    assert.ok(shown[0].src?.includes(firstPhoto.split('?')[0]), `the first published slide's photo (${shown[0].src})`);
    await Promise.all([page.send('Page.close'), without.send('Page.close')]);
  });

  test('on: the fixed button links to /booking on every slide, and the ride slide makes it the primary one', async () => {
    for (const width of [1280, 375]) {
      const page = await home(on, width);
      const button = `document.querySelector('[data-hero-booking]')`;
      assert.equal(await page.evaluate<string>(`${button}.getAttribute('href')`), '/booking', `linked at ${width}`);
      assert.equal(await page.evaluate<string>(`${button}.textContent.trim()`), RIDE_SLIDE_COPY.button);
      assert.ok(await page.evaluate<boolean>(`${button}.classList.contains('te-button--secondary')`), 'secondary on a photo');
      const rideLine = `getComputedStyle(document.querySelector('[data-hero-ride-line]')).visibility`;
      assert.equal(await page.evaluate<string>(rideLine), 'hidden', 'the photo line on a photo');
      const height = await page.evaluate<number>(`document.querySelector('.te-hero-subtitle').getBoundingClientRect().height`);

      await page.evaluate(`document.querySelector('[aria-label="Next featured destination"]').click(), true`);
      await waitFor(page, `document.querySelectorAll('#hero .te-hero-slide')[1].dataset.active === 'true'`, `the ride slide at ${width}`);
      // RIDE_SLIDE_IMAGE unset: the slide draws the van and car icons, inline.
      assert.equal(RIDE_SLIDE_IMAGE, null);
      assert.deepEqual(await page.evaluate<string[]>(`[...document.querySelectorAll('#hero .te-hero-slide')[1].querySelectorAll('[data-ride-art] svg[data-vehicle-icon]')].map((s) => s.dataset.vehicleIcon)`), ['van', 'car']);
      await waitFor(page, `${rideLine} === 'visible'`, 'the ride line');
      assert.equal(
        await page.evaluate<string>(`document.querySelector('[data-hero-ride-line]').textContent`),
        `${RIDE_SLIDE_COPY.headline} ${RIDE_SLIDE_COPY.line}`
      );
      assert.ok(await page.evaluate<boolean>(`${button}.classList.contains('te-button--primary')`), 'primary on the ride slide');
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('h1').length`), 1, 'one h1');
      assert.equal(await page.evaluate<number>(`document.querySelector('.te-hero-subtitle').getBoundingClientRect().height`), height, 'the copy keeps its height');
      assert.deepEqual(await bookingLinks(page).then((l) => l.includes('/booking')), true);
      await page.send('Page.close');
    }
  });
});
