// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Phase 8's pages and links, on the real built site in headless Chrome:
 *
 *   - the Navbar (desktop and the mobile menu) and the Footer are real links;
 *     cards, search results and journal cards land on their pages;
 *   - a new page opens at the top, and Back returns to the scroll position;
 *   - "Explore" from another page lands on the home map, "Contact" on the
 *     About page's form;
 *   - focus moves to the new page's <h1> (or the section a hash names), and
 *     document.title follows;
 *   - unknown paths and slugs show the 404 page;
 *   - the enquiry form pre-fills from the page;
 *   - /destinations filters by ?category=, and /experiences links there;
 *   - Leaflet loads only on pages with a map;
 *   - an admin edit shows on the next page, without a reload;
 *   - the admin editor links to the record's page.
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { NAV_LINKS } from '../../shared/site-paths';
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

const NAV_HREFS = NAV_LINKS.map((l) => l.to);

describe('pages and links, in Chrome', { skip }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  /**
   * Polls `expression` until it's truthy. A throw counts as "not yet": the
   * router changes the URL a moment before React commits the new page, so an
   * element can be briefly missing.
   */
  async function waitFor(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await page.evaluate<boolean>(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`)) return;
      await sleep(100);
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  async function openPage(path = '/', options: { mobile?: boolean } = {}): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: options.mobile ? 390 : 1280,
      height: options.mobile ? 844 : 900,
      deviceScaleFactor: 1,
      mobile: Boolean(options.mobile)
    });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await waitFor(page, `document.querySelector('main h1')`, path);
    return page;
  }

  /** Clicks the first `<a>` inside `scope` whose text is `text`. */
  const clickLink = (page: Page, scope: string, text: string) =>
    page.evaluate(
      `[...document.querySelectorAll(${JSON.stringify(`${scope} a`)})].find((a) => a.textContent.trim() === ${JSON.stringify(text)}).click(), true`
    );

  /**
   * Waits for `path` to be the page on screen: navigations run in a
   * transition, so the URL changes a moment before the page does, and
   * `<body data-route>` changes with the page.
   */
  const at = (page: Page, path: string) => {
    const [route, hash = ''] = path.split('#');
    return waitFor(
      page,
      `document.body.dataset.route === ${JSON.stringify(route)} && location.hash === ${JSON.stringify(hash ? `#${hash}` : '')} && document.querySelector('main h1')`,
      path
    );
  };

  const scrollY = (page: Page) => page.evaluate<number>('Math.round(scrollY)');

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
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test("the build's manifest (for bundle:report) is never served", async () => {
    const res = await fetch(`${app.baseUrl}/.vite/manifest.json`);
    const body = await res.text();
    assert.ok(!body.includes('isEntry'), 'the manifest leaked');
    assert.match(res.headers.get('content-type') ?? '', /text\/html/, 'the page shell instead');
  });

  test('the Navbar, the mobile menu and the Footer are real links', async () => {
    let page = await openPage('/destinations');
    const hrefs = (scope: string) =>
      page.evaluate<string[]>(`[...document.querySelectorAll(${JSON.stringify(scope)})].map((a) => a.getAttribute('href'))`);
    assert.deepEqual(await hrefs('header nav a'), NAV_HREFS, 'desktop');
    assert.deepEqual(await hrefs('footer li a[href^="/"]'), NAV_HREFS, 'footer');
    assert.deepEqual(
      await page.evaluate<string[]>(`[...document.querySelectorAll('footer li a[href^="/"]')].map((a) => a.textContent.trim())`),
      NAV_LINKS.map((l) => l.label),
      "the footer uses the Navbar's labels"
    );
    assert.equal(await page.evaluate<string>(`document.querySelector('header .te-home-link').getAttribute('href')`), '/');
    // Its name is the logo's text plus "homepage" (the visible label leads the accessible name).
    assert.match(await page.evaluate<string>(`document.querySelector('header .te-home-link').textContent`), /TRAVEL.*EYE.*SRI LANKA.*homepage/s);

    page = await openPage('/destinations', { mobile: true });
    await page.evaluate(`document.querySelector('[aria-label="Open menu"]').click(), true`);
    await waitFor(page, `document.querySelectorAll('.fixed.inset-0 a').length >= 7`, 'the mobile menu');
    assert.deepEqual(
      await page.evaluate<string[]>(`[...document.querySelectorAll('.fixed.inset-0 .grid a')].map((a) => a.getAttribute('href'))`),
      NAV_HREFS,
      'mobile menu'
    );
    await clickLink(page, '.fixed.inset-0', 'Tours');
    await at(page, '/tours');
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('[aria-label="Close menu"]').length`), 0, 'the menu closed');
  });

  test('cards, journal cards and search results land on their pages', async () => {
    // The home page's destination cards (the friend import): the info button shows the link.
    const home = await openPage('/');
    await home.evaluate(`document.querySelector('#discover button[aria-label="Show information about Ella"]').click(), true`);
    await waitFor(home, `!document.querySelector('#discover a[href="/destinations/ella"]').closest('[inert]')`, 'the revealed link');
    await home.evaluate(`document.querySelector('#discover a[href="/destinations/ella"]').click(), true`);
    await at(home, '/destinations/ella');

    // The journal cards live on /journal (redesign PR 3).
    const page = await openPage('/journal');
    await page.evaluate(`document.querySelector('#journal a[href="/journal/ultimate-ella-guide"]').click(), true`);
    await at(page, '/journal/ultimate-ella-guide');

    await page.evaluate(`document.querySelector('header button[aria-label="Search Destinations"]').click(), true`);
    await waitFor(page, `document.querySelector('.fixed.inset-0 a[href="/destinations/sigiriya"]')`, 'search results');
    await page.evaluate(`document.querySelector('.fixed.inset-0 a[href="/destinations/sigiriya"]').click(), true`);
    await at(page, '/destinations/sigiriya');
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('.fixed.inset-0').length`), 0, 'the search closed');

    await clickLink(page, 'nav', 'Experiences');
    await at(page, '/experiences');
    await page.evaluate(`document.querySelector('main a[href="/experiences/sunrise-ella"]').click(), true`);
    await at(page, '/experiences/sunrise-ella');
  });

  test('a new page opens at the top, and Back returns to where you were', async () => {
    // The tour cards are on /tours since redesign PR 4 trimmed the home page:
    // the last card is well down that page.
    const page = await openPage('/tours');
    const last = `[...document.querySelectorAll('#tours a')].filter((a) => a.textContent.trim() === 'View Full Journey').at(-1)`;
    await page.evaluate(`${last}.scrollIntoView({ block: 'center' }), true`);
    await sleep(300);
    const before = await scrollY(page);
    assert.ok(before > 1000, `precondition: well down the page (${before})`);

    const href = await page.evaluate<string>(`${last}.getAttribute('href')`);
    await page.evaluate(`${last}.click(), true`);
    await at(page, href);
    await sleep(300);
    assert.equal(await scrollY(page), 0, 'the tour page opens at the top');

    await page.evaluate('history.back(), true');
    await at(page, '/tours');
    await waitFor(page, `Math.abs(scrollY - ${before}) <= 2`, `the tours list back at ${before}`, 5_000);
  });

  test('"Explore" lands on its own page, "Contact" on the About form, focused', async () => {
    const page = await openPage('/tours');
    // Redesign PR 3: Explore is a page of its own, opened at the top with focus on its heading.
    await clickLink(page, 'header nav', 'Explore');
    await at(page, '/explore');
    await waitFor(page, `document.activeElement === document.querySelector('main h1')`, 'focus on the Explore heading', 5_000);
    assert.equal(await page.evaluate<string>('document.activeElement.textContent.trim()'), 'Explore Sri Lanka');
    assert.ok(await page.evaluate<boolean>(`scrollY < 2 && Boolean(document.querySelector('#explore-map'))`), 'at the top, with the map below');

    await clickLink(page, 'header nav', 'Contact');
    await at(page, '/about#contact');
    await waitFor(page, `Math.abs(document.querySelector('#contact').getBoundingClientRect().top) < 2`, 'the contact section at the top', 5_000);
    assert.equal(await page.evaluate<string>('document.activeElement.id'), 'contact');

    // A fresh load with a hash scrolls there too, once the content is in.
    const fresh = await openPage('/about#contact');
    await waitFor(fresh, `Math.abs(document.querySelector('#contact').getBoundingClientRect().top) < 2`, 'a fresh #contact', 5_000);
  });

  test('every page has one <h1>, and no other heading repeats it', async () => {
    const problems: string[] = [];
    for (const path of [
      '/', '/explore', '/plan', '/journal', '/destinations', '/destinations/ella', '/experiences',
      '/experiences/safari-yala', '/tours', '/tours/island-in-7-days', '/journal/ultimate-ella-guide',
      '/about', '/photo-credits', '/unsubscribe', '/nope'
    ]) {
      const page = await openPage(path);
      const { h1s, repeats } = await page.evaluate<{ h1s: string[]; repeats: string[] }>(`(() => {
        const text = (el) => el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
        const h1s = [...document.querySelectorAll('h1')].map(text);
        const repeats = [...document.querySelectorAll('h2, h3, h4')].map(text).filter((t) => h1s.includes(t));
        return { h1s, repeats };
      })()`);
      if (h1s.length !== 1) problems.push(`${path}: ${h1s.length} <h1> (${h1s.join(' | ')})`);
      for (const r of repeats) problems.push(`${path}: a heading repeats the <h1> "${r}"`);
    }
    assert.deepEqual(problems, []);
  });

  test('focus moves to the new page’s <h1>, and the title follows', async () => {
    const page = await openPage('/');
    assert.equal(await page.evaluate<string>('document.title'), 'Travel Eye | See Sri Lanka Through a Different Eye');

    await clickLink(page, 'header nav', 'Destinations');
    await at(page, '/destinations');
    await waitFor(page, `document.activeElement?.tagName === 'H1'`, 'focus on the h1', 2_000);
    assert.equal(await page.evaluate<string>('document.activeElement.textContent.trim()'), 'Destinations');
    assert.equal(await page.evaluate<string>('document.title'), 'Destinations | Travel Eye');

    await page.evaluate(`document.querySelector('main a[href="/destinations/ella"]').click(), true`);
    await at(page, '/destinations/ella');
    await waitFor(page, `document.activeElement?.textContent.trim() === 'Ella'`, "focus on Ella's h1", 2_000);
    assert.equal(await page.evaluate<string>('document.title'), 'Ella | Travel Eye');
    assert.equal(
      await page.evaluate<string>(`getComputedStyle(document.activeElement).outlineStyle`),
      'none',
      'no focus ring on a heading'
    );
  });

  test('unknown paths and slugs show the 404 page', async () => {
    for (const path of ['/no-such-page', '/destinations/nowhere', '/tours/nothing', '/experiences/none', '/journal/missing']) {
      const page = await openPage(path);
      await waitFor(page, `document.querySelector('[data-not-found]')`, `the 404 page for ${path}`);
      assert.equal(await page.evaluate<string>('document.title'), 'Page not found | Travel Eye', path);
    }

    // Unpublished is the same as missing.
    await pool.query(`update public.destinations set published = false where id = 'ella'`);
    const page = await openPage('/destinations/ella');
    await waitFor(page, `document.querySelector('[data-not-found]')`, 'an unpublished destination');
  });

  test('the enquiry form pre-fills from the page', async () => {
    const message = (page: Page) =>
      page.evaluate<string>(`document.querySelector('.fixed.inset-0 textarea')?.value ?? ''`);
    const closeModal = (page: Page) =>
      page.evaluate(`document.querySelector('.fixed.inset-0 button').click(), true`);

    let page = await openPage('/tours/island-in-7-days');
    await page.evaluate(`[...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === 'Book / Inquire This Tour').click(), true`);
    await waitFor(page, `document.querySelector('.fixed.inset-0 textarea')`, 'the enquiry form');
    assert.equal(await message(page), 'I would like to inquire about: Island in 7 Days');
    await closeModal(page);

    // A destination's own "Plan A Trip" button uses the page's subject. (The
    // Navbar's "Plan Your Trip" carried it until redesign PR 3, which made it
    // a link to /plan: checked below.)
    page = await openPage('/destinations/ella');
    await page.evaluate(`[...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === 'Plan A Trip to Ella').click(), true`);
    await waitFor(page, `document.querySelector('.fixed.inset-0 textarea')`, 'the enquiry form');
    assert.equal(await message(page), 'I would like to inquire about: Ella');
    await closeModal(page);
    assert.equal(
      await page.evaluate<string>(`[...document.querySelectorAll('header a')].find((a) => a.textContent.trim() === 'Plan Your Trip').getAttribute('href')`),
      '/plan',
      "the Navbar's Plan Your Trip is a link to /plan"
    );

    page = await openPage('/experiences/safari-yala');
    await page.evaluate(`[...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === 'Enquire About This Experience').click(), true`);
    await waitFor(page, `document.querySelector('.fixed.inset-0 textarea')`, 'the enquiry form');
    assert.match(await message(page), /^I would like to inquire about: Experience: Safari in Yala \(.+\)$/);

    // /plan: the journey builder's quote request names the chosen journey.
    page = await openPage('/plan');
    await page.evaluate(`document.querySelector('#planner form button[type=submit]').click(), true`);
    await waitFor(page, `[...document.querySelectorAll('#planner button')].some((b) => b.textContent.trim() === 'Request Custom Quote')`, 'a sample journey');
    await page.evaluate(`[...document.querySelectorAll('#planner button')].find((b) => b.textContent.trim() === 'Request Custom Quote').click(), true`);
    await waitFor(page, `document.querySelector('.fixed.inset-0 textarea')`, 'the enquiry form');
    assert.equal(await message(page), 'I would like to inquire about: Journey Plan: Custom Culture & Nature (6–8 days) — Around the Island');

    // The About page's form is inline.
    page = await openPage('/about');
    assert.equal(
      await page.evaluate<string>(`document.querySelector('[data-inline-inquiry] textarea').value`),
      'I would like to inquire about: General Sri Lanka Trip Inquiry'
    );
  });

  test('/destinations filters by ?category=, and /experiences links to it', async () => {
    const page = await openPage('/destinations?category=Beaches');
    const beaches = (await pool.query(`select count(*)::int as n from public.destinations where published and 'Beaches' = any(category)`)).rows[0].n;
    const all = (await pool.query(`select count(*)::int as n from public.destinations where published`)).rows[0].n;
    const cards = `document.querySelectorAll('main a[href^="/destinations/"]').length`;
    assert.equal(await page.evaluate<number>(cards), beaches);

    // Picking a category keeps the page where it is.
    await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto', window.scrollTo(0, 300), true`);
    await sleep(300);
    const scrolled = await scrollY(page);
    assert.ok(scrolled > 100, `precondition: scrolled to the filters (${scrolled})`);
    await page.evaluate(`[...document.querySelectorAll('main [role=group] button')].find((b) => b.textContent.startsWith('All')).click(), true`);
    await at(page, '/destinations');
    await waitFor(page, `${cards} === ${all}`, `all ${all} destinations`, 5_000);
    await sleep(300);
    assert.equal(await scrollY(page), scrolled, 'the page stayed where it was');

    const experiences = await openPage('/experiences');
    const hrefs = await experiences.evaluate<string[]>(`[...document.querySelectorAll('#experiences a')].map((a) => a.getAttribute('href'))`);
    assert.ok(hrefs.length > 0, 'the category cards are links');
    for (const href of hrefs) assert.match(href, /^\/destinations\?category=[A-Za-z%0-9]+$/);

    // The home page no longer has the category cards (redesign PR 4).
    const home = await openPage('/');
    assert.equal(await home.evaluate<number>(`document.querySelectorAll('#experiences').length`), 0);
  });

  test('Leaflet loads only on pages that show a map', async () => {
    const leaflet = (page: Page) =>
      page.evaluate<boolean>(
        `performance.getEntriesByType('resource').some((r) => /leaflet/.test(r.name)) || Boolean(document.querySelector('link[data-leaflet]'))`
      );

    // The home page has no map since redesign PR 4.
    for (const path of ['/', '/destinations', '/destinations/ella', '/experiences', '/about', '/journal/ultimate-ella-guide', '/plan', '/journal']) {
      const page = await openPage(path);
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight), true');
      await sleep(600);
      assert.equal(await leaflet(page), false, path);
    }

    const tour = await openPage('/tours/island-in-7-days');
    await waitFor(tour, `document.querySelectorAll('[data-route-map] .route-stop-marker').length === 6`, 'the route map');
    assert.equal(await leaflet(tour), true, 'the tour page');

    // /explore: the map is the page. It starts below the fold (at 1280 x 900), but
    // within the 400 px the map starts loading ahead (LAZY_MARGIN), so Leaflet
    // arrives with the page rather than on scroll. Leaflet is still its own
    // chunk, never in a page's first load (npm run bundle:report). Accepted on
    // #23; browser-map test 1 checks the chunk arrives after the page's own.
    const explore = await openPage('/explore');
    const mapTop = await explore.evaluate<number>(`document.querySelector('#explore-map .grid').getBoundingClientRect().top`);
    assert.ok(mapTop > 900, `the map starts below the fold (${mapTop}px)`);
    await waitFor(explore, `document.querySelector('#explore-map .leaflet-container')`, 'the Explore map');
    assert.equal(await leaflet(explore), true, '/explore loads Leaflet for its map');
  });

  test('"View route on map" on /tours opens /explore with that route', async () => {
    const page = await openPage('/tours');
    await page.evaluate(`(() => {
      const card = [...document.querySelectorAll('#tours h3')].find((h) => h.textContent.trim() === 'Cultural Sri Lanka').closest('.group');
      [...card.querySelectorAll('button')].find((b) => b.textContent.trim() === 'View route on map').click();
      return true;
    })()`);
    await waitFor(page, `location.pathname === '/explore' && new URLSearchParams(location.search).get('mapTour') === 'cultural-sri-lanka'`, '/explore?mapTour=cultural-sri-lanka');
    await waitFor(page, `document.querySelectorAll('#explore-map .route-stop-marker').length === 4`, 'the route on the map', 10_000);
    assert.match(await page.evaluate<string>(`document.querySelector('#explore-map [data-route-chip]').textContent`), /Cultural Sri Lanka/);

    // Clearing the route drops it from the URL too.
    await page.evaluate(`document.querySelector('#explore-map [aria-label="Clear route"]').click(), true`);
    await waitFor(page, `!new URLSearchParams(location.search).has('mapTour') && !document.querySelector('#explore-map .route-stop-marker')`, 'the route cleared');
  });

  test('an admin edit shows on the next page without a reload', async () => {
    const page = await openPage('/destinations');
    await pool.query(`update public.destinations set short_description = 'Freshly edited.' where id = 'ella'`);
    await page.evaluate(`document.querySelector('main a[href="/destinations/ella"]').click(), true`);
    await at(page, '/destinations/ella');
    await waitFor(page, `document.body.innerText.includes('Freshly edited.')`, 'the edit', 5_000);
  });

  test('the admin editor links to a published record’s page', async () => {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/login` });
    await waitFor(page, `document.querySelector('#admin-email')`, 'the login page');
    const status = await page.evaluate<number>(`fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} })
    }).then((r) => r.status)`);
    assert.equal(status, 200, 'signed in');

    const cases: [string, string][] = [
      ['/admin/destinations/ella', '/destinations/ella'],
      ['/admin/tours/wild-sri-lanka', '/tours/wild-sri-lanka'],
      ['/admin/featured-experiences/safari-yala', '/experiences/safari-yala'],
      ['/admin/articles/ultimate-ella-guide', '/journal/ultimate-ella-guide']
    ];
    for (const [editor, href] of cases) {
      await page.send('Page.navigate', { url: `${app.baseUrl}${editor}` });
      await waitFor(page, `document.querySelector('[data-view-page]')`, `View page on ${editor}`);
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-view-page]').getAttribute('href')`), href);
    }

    // Unpublished: no page to view.
    await pool.query(`update public.tours set published = false where id = 'wild-sri-lanka'`);
    await page.send('Page.navigate', { url: `${app.baseUrl}/admin/tours/wild-sri-lanka` });
    await waitFor(page, `document.querySelector('form')`, 'the editor');
    await sleep(300);
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-view-page]').length`), 0);
  });
});
