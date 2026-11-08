// Must be first: points the server at the test database, or refuses to run.
import './test-db';

/**
 * Nearby attractions on the real built site, in Chrome:
 *
 *   - a destination's "Nearby attractions" cards: name, kind, text, "About N km away" (straight line), a
 *     placeholder without a photo, a Save button, "View on map"; one h1; none for a place without any;
 *   - only published attractions of published destinations;
 *   - the wishlist: saved from a card, its own group on /wishlist, named in the enquiry;
 *   - search finds them, and lands on the card;
 *   - /explore: none at the island view; a picked place's, and all from zoom 10; a popup linking to the
 *     destination, from the keyboard too; clear of the controls and of other markers;
 *   - /when-to-go: a place's own while its popup is open;
 *   - AA in both themes, and 120% text with nothing clipped and no sideways scroll;
 *   - the admin: the list by destination, a new one with its destination, the map's click setting the
 *     place, reordering within a destination, and the warning when a destination would take them along.
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { distanceKm } from '../../shared/geo';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { CONTRAST } from './contrast';
import { COVERED } from './floating';
import { assertConnectedToTestDatabase, createUser, listen, migrateTestDatabase, PASSWORD, resetAuthTables, resetContent, TEST_ATTRACTION_IDS, type RunningApp } from './helpers';
import { SCROLL_THROUGH, TEXT_AUDIT } from './text-audit';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

const CARDS = `[...document.querySelectorAll('[data-nearby] [data-attraction-card]')]`;
const ATTRACTION_MARKERS = (scope: string) => `[...document.querySelectorAll('${scope} .attraction-leaflet-marker')]`;

const KEYS: Record<string, { code: string; vk: number; text?: string }> = {
  Enter: { code: 'Enter', vk: 13, text: '\r' },
  Escape: { code: 'Escape', vk: 27 }
};

describe('nearby attractions, in Chrome', { skip, timeout: 8 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetAuthTables();
    await createUser();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  async function poll(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(40);
    }
  }

  const closePage = (page: Page) => page.send('Page.close').catch(() => undefined);

  async function openPage(path: string, options: { width?: number; height?: number; theme?: 'light' | 'dark' } = {}): Promise<Page> {
    const page = await chrome.newPage();
    const width = options.width ?? 1280;
    await page.send('Page.enable');
    await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: options.height ?? 900, deviceScaleFactor: 1, mobile: width < 500 });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await saveTheme(page, options.theme ?? 'light');
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(page, `document.readyState === 'complete' && document.body.dataset.route && document.querySelector('main h1') && document.querySelector('footer')`, path);
    await page.evaluate('document.fonts.ready.then(() => true)');
    return page;
  }

  async function press(page: Page, key: string): Promise<void> {
    const { code, vk, text } = KEYS[key];
    await page.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
  }

  /** A real click at an element's middle, as a mouse makes it, once it's on screen. */
  async function clickAt(page: Page, expression: string): Promise<void> {
    const { x, y } = await page.evaluate<{ x: number; y: number }>(`(() => {
      const el = ${expression};
      const r0 = el.getBoundingClientRect();
      if (r0.top < 0 || r0.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  }

  /** The Explore map, scrolled to and drawn. */
  async function exploreMap(page: Page): Promise<void> {
    await page.evaluate(`document.getElementById('explore-map').scrollIntoView({ block: 'center', behavior: 'instant' }), true`);
    await poll(page, `document.querySelectorAll('#explore-map .custom-leaflet-marker').length === 20 && document.querySelector('#explore-map .leaflet-container').dataset.view`, 'the markers');
  }

  const galle = async () => (await pool.query<{ latitude: number; longitude: number }>(`select latitude, longitude from public.destinations where id = 'galle'`)).rows[0];
  const attraction = async (id: string) => (await pool.query<{ name: string; latitude: number; longitude: number }>(`select name, latitude, longitude from public.attractions where id = $1`, [id])).rows[0];

  /* ------------------------------------------------------------- the page */

  test('a destination’s Nearby: its attractions in order, each with its kind, text, distance and a placeholder; one h1; “View on map”', async () => {
    const page = await openPage('/destinations/galle');
    try {
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('h1').length`), 1);
      assert.equal(await page.evaluate<string>(`document.querySelector('#nearby-heading').textContent`), 'Nearby attractions');
      // The older section of other destinations is "Similar places", so no two headings both say "Nearby".
      const headings = await page.evaluate<string[]>(`[...document.querySelectorAll('main h2')].map((h) => h.textContent.trim())`);
      assert.ok(headings.includes('Similar places'), `the other destinations' heading: ${headings.join(' | ')}`);
      assert.deepEqual(headings.filter((h) => /nearby/i.test(h)), ['Nearby attractions']);
      const cards = await page.evaluate<{ id: string; name: string; label: string; distance: string; placeholder: boolean; tag: string; save: string | null }[]>(`${CARDS}.map((c) => ({
        id: c.dataset.attractionCard,
        name: c.querySelector('h3').textContent,
        label: c.querySelector('.te-ed-label').textContent,
        distance: c.querySelector('[data-distance]').textContent,
        placeholder: Boolean(c.querySelector('[data-attraction-placeholder]')),
        tag: c.tagName,
        save: c.closest('.te-save-card')?.querySelector('[data-save]')?.dataset.save ?? null
      }))`);
      assert.deepEqual(cards.map((c) => c.id), [...TEST_ATTRACTION_IDS]);
      const from = await galle();
      for (const card of cards) {
        const a = await attraction(card.id);
        assert.equal(card.name, a.name);
        assert.equal(card.tag, 'ARTICLE', 'a card, not a link: an attraction has no page');
        assert.ok(card.placeholder, `${card.id}: no photo, so the placeholder`);
        assert.equal(card.save, `attraction:${card.id}`);
        assert.equal(card.distance, `About ${Math.round(distanceKm(from, a))} km away`);
      }
      assert.deepEqual(cards.map((c) => c.label), ['Beaches', 'Culture', 'Beaches', 'Beaches']);
      assert.match(await page.evaluate<string>(`document.querySelector('.te-nearby-intro').textContent`), /straight line from Galle Fort/);
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-nearby-map-link]').getAttribute('href')`), '/explore?place=galle#explore-map');
      // A Save button is beside the card, never inside it.
      assert.equal(await page.evaluate<number>(`${CARDS}.filter((c) => c.querySelector('button')).length`), 0);
    } finally {
      await closePage(page);
    }
    const ella = await openPage('/destinations/ella');
    try {
      assert.equal(await ella.evaluate<number>(`document.querySelectorAll('[data-nearby]').length`), 0, 'no attractions, no section');
    } finally {
      await closePage(ella);
    }
  });

  test('a photo shows in place of the placeholder; unpublished attractions are not there', async () => {
    await pool.query(`update public.attractions set image = 'https://images.unsplash.com/photo-test' where id = 'unawatuna-beach'`);
    await pool.query(`update public.attractions set published = false where id = 'jungle-beach'`);
    const page = await openPage('/destinations/galle');
    try {
      const ids = await page.evaluate<string[]>(`${CARDS}.map((c) => c.dataset.attractionCard)`);
      assert.deepEqual(ids, TEST_ATTRACTION_IDS.filter((id) => id !== 'jungle-beach'));
      assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-attraction-card="unawatuna-beach"] img'))`), true);
      assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-attraction-card="unawatuna-beach"] [data-attraction-placeholder]'))`), false);
    } finally {
      await closePage(page);
    }
  });

  test('saved from its card: in the list as an attraction, its own group on /wishlist, and named in the enquiry', async () => {
    const page = await openPage('/destinations/galle');
    try {
      await clickAt(page, `document.querySelector('[data-save="attraction:japanese-peace-pagoda"]')`);
      await poll(page, `document.querySelector('[data-save="attraction:japanese-peace-pagoda"]').getAttribute('aria-pressed') === 'true'`, 'saved', 3_000);
      assert.deepEqual(await page.evaluate(`JSON.parse(localStorage.getItem('site:wishlist'))`), [{ kind: 'attraction', id: 'japanese-peace-pagoda' }]);

      await page.send('Page.navigate', { url: `${app.baseUrl}/wishlist` });
      await poll(page, `document.querySelector('[data-wishlist-group="attraction"]')`, 'the group');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-wishlist-group="attraction"] h2').textContent`), 'Nearby attractions');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-wishlist-group="attraction"] h3').textContent`), 'Japanese Peace Pagoda');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-wishlist-group="attraction"] .te-nearby-distance a').getAttribute('href')`), '/destinations/galle#attraction-japanese-peace-pagoda');

      await page.evaluate(`document.querySelector('[data-wishlist-send]').click(), true`);
      await poll(page, `document.querySelector('[role="dialog"] textarea')`, 'the enquiry form');
      assert.match(await page.evaluate<string>(`document.querySelector('[role="dialog"] textarea').value`), /Nearby attractions\n- Japanese Peace Pagoda \(near Galle Fort\)/);
    } finally {
      await closePage(page);
    }
  });

  test('search finds an attraction by name and by its destination, and lands on its card', async () => {
    const page = await openPage('/');
    try {
      await page.evaluate(`document.querySelector('header button[aria-label="Search Destinations"]').click(), true`);
      await poll(page, `document.querySelector('[role="dialog"] input[aria-label="Search destinations"]')`, 'the search');
      const type = async (text: string) => {
        await page.evaluate(`(() => {
          const input = document.querySelector('[role="dialog"] input');
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(text)});
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        })()`);
        await sleep(100);
        return page.evaluate<string[]>(`[...document.querySelectorAll('[data-search-attraction]')].map((a) => a.dataset.searchAttraction)`);
      };
      assert.deepEqual(await type('japanese'), ['japanese-peace-pagoda']);
      // By the words in a description too: Jungle Beach is reached by the Peace Pagoda's road.
      assert.deepEqual(await type('pagoda'), ['jungle-beach', 'japanese-peace-pagoda']);
      assert.deepEqual(await type('galle'), [...TEST_ATTRACTION_IDS], 'by the place they are near');
      assert.deepEqual(await type(''), [], 'none until there is something to match');
      await type('dalawella');
      const result = `document.querySelector('[data-search-attraction="dalawella-beach"]')`;
      assert.match(await page.evaluate<string>(`${result}.textContent`), /Near Galle Fort/);
      assert.equal(await page.evaluate<string>(`${result}.getAttribute('href')`), '/destinations/galle#attraction-dalawella-beach');
      await clickAt(page, result);
      await poll(page, `location.pathname === '/destinations/galle' && document.querySelector('#attraction-dalawella-beach')`, 'the destination page');
      await poll(page, `(() => { const r = document.querySelector('#attraction-dalawella-beach').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; })()`, 'the card in view', 5_000);
    } finally {
      await closePage(page);
    }
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`AA contrast, ${theme}: the Nearby cards, and an attraction’s popup on the map`, async () => {
      const page = await openPage('/explore?place=galle#explore-map', { theme });
      try {
        await exploreMap(page);
        await poll(page, `${ATTRACTION_MARKERS('#explore-map')}.length === 4`, 'Galle’s attractions');
        await clickAt(page, `document.querySelector('#explore-map [data-attraction="unawatuna-beach"]')`);
        await poll(page, `document.querySelector('[data-attraction-popup]') && getComputedStyle(document.querySelector('.leaflet-popup')).opacity === '1'`, 'the popup', 5_000);
        await page.evaluate(CONTRAST);
        assert.deepEqual(await page.evaluate<string[]>(`__contrast(document.querySelector('.leaflet-popup-content'), 4.5)`), []);
        assert.deepEqual(await page.evaluate<string[]>(`__contrast(document.querySelector('#explore-map [data-legend="attraction"]'), 4.5)`), []);
      } finally {
        await closePage(page);
      }
      const nearby = await openPage('/destinations/galle', { theme });
      try {
        await nearby.evaluate(CONTRAST);
        assert.deepEqual(await nearby.evaluate<string[]>(`__contrast(document.querySelector('[data-nearby]'), 4.5)`), []);
      } finally {
        await closePage(nearby);
      }
    });
  }

  for (const width of [375, 1280]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`120% text at ${width} px, ${theme}: the Nearby cards fit, with no sideways scroll`, async () => {
        await pool.query('update public.site_settings set text_size = 120 where id');
        const page = await openPage('/destinations/galle', { width, theme });
        try {
          await page.evaluate(SCROLL_THROUGH);
          assert.deepEqual(await page.evaluate<string[]>(TEXT_AUDIT), []);
          assert.ok(await page.evaluate<boolean>(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), 'no sideways scroll');
        } finally {
          await closePage(page);
          await pool.query('update public.site_settings set text_size = 100 where id');
        }
      });
    }
  }

  /* --------------------------------------------------------------- the maps */

  test('/explore: none at the island view; all from zoom 10; the legend names them', async () => {
    const page = await openPage('/explore');
    try {
      await exploreMap(page);
      assert.equal(await page.evaluate<number>(`${ATTRACTION_MARKERS('#explore-map')}.length`), 0, 'the island view stays as it was');
      assert.match(await page.evaluate<string>(`document.querySelector('#explore-map [data-legend="attraction"]').textContent`), /Nearby attraction/);
      for (let i = 0; i < 12 && Number(await page.evaluate<string>(`document.querySelector('#explore-map .leaflet-container').dataset.zoom`)) < 10; i += 1) {
        await page.evaluate(`document.querySelector('#explore-map .leaflet-control-zoom-in').click(), true`);
        await sleep(350);
      }
      await poll(page, `${ATTRACTION_MARKERS('#explore-map')}.length === 4`, 'every attraction at zoom 10');
      assert.equal(await page.evaluate<string>(`document.querySelector('#explore-map .leaflet-container').dataset.attractions`), '4');
    } finally {
      await closePage(page);
    }
  });

  for (const [width, height] of [[1280, 800], [390, 844]]) {
    test(`/explore “View on map” at ${width}x${height}: Galle picked, its attractions shown and labelled, clear of each other, the markers and the controls`, async () => {
      const page = await openPage('/explore?place=galle#explore-map', { width, height });
      try {
        await exploreMap(page);
        await poll(page, `${ATTRACTION_MARKERS('#explore-map')}.length === 4`, 'Galle’s attractions');
        await sleep(400);
        const labels = await page.evaluate<string[]>(`${ATTRACTION_MARKERS('#explore-map')}.map((m) => m.getAttribute('aria-label')).sort()`);
        assert.deepEqual(labels, ['Dalawella, near Galle Fort', 'Japanese Peace Pagoda, near Galle Fort', 'Jungle Beach, near Galle Fort', 'Unawatuna, near Galle Fort']);
        const boxes = await page.evaluate<{ kind: string; x: number; y: number; r: number; inside: boolean }[]>(`(() => {
          const map = document.querySelector('#explore-map .leaflet-container').getBoundingClientRect();
          const of = (el, kind, r) => { const b = el.getBoundingClientRect(); const x = b.left + b.width / 2; const y = b.top + b.height / 2; return { kind, x, y, r, inside: x > map.left && x < map.right && y > map.top && y < map.bottom }; };
          return [
            ...[...document.querySelectorAll('#explore-map .custom-leaflet-marker')].map((m) => of(m.querySelector('.map-marker-disc'), 'place', 16)),
            ...${ATTRACTION_MARKERS('#explore-map')}.map((m) => of(m, 'attraction', 11))
          ];
        })()`);
        const shown = boxes.filter((b) => b.inside);
        const overlaps: string[] = [];
        for (let i = 0; i < shown.length; i += 1) {
          for (let j = i + 1; j < shown.length; j += 1) {
            const a = shown[i];
            const b = shown[j];
            if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - 1) overlaps.push(`${a.kind}@${Math.round(a.x)},${Math.round(a.y)} / ${b.kind}@${Math.round(b.x)},${Math.round(b.y)}`);
          }
        }
        assert.deepEqual(overlaps, [], 'no marker on another');
        const onControls = await page.evaluate<string[]>(`(() => {
          const controls = [...document.querySelectorAll('#explore-map .leaflet-control, #explore-map [data-keep-clear]')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
          return ${ATTRACTION_MARKERS('#explore-map')}.filter((m) => { const r = m.getBoundingClientRect(); return controls.some((c) => r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top); }).map((m) => m.dataset.attraction);
        })()`);
        assert.deepEqual(onControls, [], 'none under a control');
        assert.deepEqual(await page.evaluate<string[]>(COVERED), [], 'the floating buttons clear of the controls');
      } finally {
        await closePage(page);
      }
    });
  }

  test('/explore: a popup names it, where it is and how far, and links to its destination, from the keyboard too', async () => {
    const page = await openPage('/explore?place=galle#explore-map');
    try {
      await exploreMap(page);
      await poll(page, `${ATTRACTION_MARKERS('#explore-map')}.length === 4`, 'Galle’s attractions');
      await page.evaluate(`document.querySelector('#explore-map [data-attraction="jungle-beach"]').focus(), true`);
      await press(page, 'Enter');
      await poll(page, `document.querySelector('[data-attraction-popup]')`, 'the popup', 5_000);
      const a = await attraction('jungle-beach');
      const popup = await page.evaluate<{ name: string; meta: string; href: string; focused: boolean }>(`(() => {
        const p = document.querySelector('[data-attraction-popup]');
        return { name: p.querySelector('.te-attraction-popup__name').textContent, meta: p.querySelector('.te-attraction-popup__meta').textContent, href: p.querySelector('a').getAttribute('href'), focused: document.activeElement === p.querySelector('a') };
      })()`);
      assert.equal(popup.name, 'Jungle Beach');
      assert.equal(popup.meta, `Beaches. Near Galle Fort, about ${Math.round(distanceKm(await galle(), a))} km away`);
      assert.equal(popup.href, '/destinations/galle#attraction-jungle-beach');
      assert.ok(popup.focused, 'the link has focus');
      await press(page, 'Escape');
      await poll(page, `!document.querySelector('[data-attraction-popup]') && document.activeElement?.dataset.attraction === 'jungle-beach'`, 'closed, focus back on the marker', 3_000);

      await press(page, 'Enter');
      await poll(page, `document.querySelector('[data-attraction-popup] a')`, 'open again', 3_000);
      await clickAt(page, `document.querySelector('[data-attraction-popup] a')`);
      await poll(page, `location.pathname === '/destinations/galle' && document.querySelector('[data-nearby]')`, 'the destination page');
    } finally {
      await closePage(page);
    }
  });

  test('/when-to-go: a place’s attractions while its popup is open, and an attraction’s popup keeps them', async () => {
    const page = await openPage('/when-to-go');
    try {
      await page.evaluate(`document.querySelector('[data-season-map]').scrollIntoView({ block: 'center', behavior: 'instant' }), true`);
      await poll(page, `document.querySelectorAll('[data-season-map] .custom-leaflet-marker[data-destination]').length === 20`, 'the markers');
      assert.equal(await page.evaluate<number>(`${ATTRACTION_MARKERS('[data-season-map]')}.length`), 0);
      assert.match(await page.evaluate<string>(`document.querySelector('[data-season-legend] [data-legend="attraction"]').textContent`), /Nearby attraction/);
      await page.evaluate(`document.querySelector('[data-season-map] [data-destination="galle"]').click(), true`);
      await poll(page, `${ATTRACTION_MARKERS('[data-season-map]')}.length === 4`, 'Galle’s attractions');
      await page.evaluate(`document.querySelector('[data-season-map] [data-attraction="japanese-peace-pagoda"]').click(), true`);
      await poll(page, `document.querySelector('[data-attraction-popup]')`, 'its popup', 5_000);
      await sleep(100);
      assert.equal(await page.evaluate<number>(`${ATTRACTION_MARKERS('[data-season-map]')}.length`), 4, 'still shown under its popup');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-attraction-popup] a').getAttribute('href')`), '/destinations/galle#attraction-japanese-peace-pagoda');
      // Its own close button: Galle's closed popup may still be fading out, first in the page.
      await page.evaluate(`document.querySelector('[data-attraction-popup]').closest('.leaflet-popup').querySelector('.leaflet-popup-close-button').click(), true`);
      await poll(page, `${ATTRACTION_MARKERS('[data-season-map]')}.length === 0`, 'gone with the popup', 3_000);
    } finally {
      await closePage(page);
    }
  });

  /* ------------------------------------------------------------- the admin */

  describe('the admin', () => {
    async function adminPage(path: string, ready: string, width = 1280): Promise<Page> {
      const page = await chrome.newPage();
      await page.send('Page.enable');
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      await page.send('Page.navigate', { url: `${app.baseUrl}/admin/login` });
      // Every tab shares cookies: after the first sign-in this page moves on to /admin.
      await poll(page, `document.querySelector('#admin-email') || location.pathname === '/admin'`, 'the login page or the admin');
      assert.equal(await page.evaluate<number>(`fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} }) }).then((r) => r.status)`), 200);
      await page.send('Page.navigate', { url: app.baseUrl + path });
      await poll(page, ready, path);
      return page;
    }

    const rowsShown = (page: Page) => page.evaluate<string[]>(`[...document.querySelectorAll('main .font-mono')].map((p) => p.textContent.split(' · ')[0])`);

    test('the list by destination; a new one starts there, the map’s click sets the place, and it saves as a draft', async () => {
      const page = await adminPage('/admin/attractions', `document.querySelector('[data-collection-filter]') && document.querySelectorAll('main .font-mono').length === 4 && document.querySelector('[data-collection-filter] option[value="galle"]')`);
      try {
        await page.evaluate(`(() => {
          const select = document.querySelector('[data-collection-filter]');
          Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'ella');
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        })()`);
        await poll(page, `location.search === '?destination_id=ella'`, 'the filter in the URL', 3_000);
        assert.deepEqual(await rowsShown(page), []);
        assert.match(await page.evaluate<string>(`document.querySelector('main').textContent`), /No attractions for this destination yet/);
        await page.evaluate(`[...document.querySelectorAll('main a')].find((a) => /New Attraction/.test(a.textContent)).click(), true`);
        await poll(page, `location.pathname === '/admin/attractions/new' && document.querySelector('[data-reference-select]')?.value === 'ella' && document.querySelector('[data-location-map] .leaflet-tile-pane')`, 'the new form, in Ella');

        // A click on the map: the place, in the boxes.
        await poll(page, `document.querySelector('[data-location-map] .custom-leaflet-marker')`, 'Ella on the map', 5_000);
        const map = `document.querySelector('[data-location-map]')`;
        const size = await page.evaluate<{ width: number; height: number }>(`(() => { const r = ${map}.getBoundingClientRect(); return { width: r.width, height: r.height }; })()`);
        assert.ok(size.height >= 250 && size.width >= 400, `a map you can click on: ${JSON.stringify(size)}`);
        // In the middle of the screen, clear of the form's sticky Save bar, as a person would have it.
        const { x, y } = await page.evaluate<{ x: number; y: number }>(`(() => { ${map}.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = ${map}.getBoundingClientRect(); return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.4 }; })()`);
        for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
        await poll(page, `document.querySelector('#field-latitude').value && document.querySelector('#field-longitude').value`, 'the place set', 3_000);
        const lat = Number(await page.evaluate<string>(`document.querySelector('#field-latitude').value`));
        const lng = Number(await page.evaluate<string>(`document.querySelector('#field-longitude').value`));
        assert.ok(Math.abs(lat - 6.8667) < 0.1 && Math.abs(lng - 81.0466) < 0.1, `near Ella: ${lat}, ${lng}`);
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-location-map] .attraction-leaflet-marker').length`), 1);

        const fill = (selector: string, value: string) => page.evaluate(`(() => {
          const el = document.querySelector('${selector}');
          const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
          return true;
        })()`);
        await fill('#field-name', 'Test viewpoint');
        await fill('#field-short_description', 'A test place near Ella.');
        await page.evaluate(`[...document.querySelectorAll('button[type=submit]')].find((b) => /Create Attraction/.test(b.textContent)).click(), true`);
        await poll(page, `location.pathname === '/admin/attractions' && location.search === '?destination_id=ella'`, 'back on the list, still in Ella');
        await poll(page, `document.querySelectorAll('main .font-mono').length === 1`, 'the new row', 5_000);
        const { rows } = await pool.query(`select destination_id, published, latitude, longitude from public.attractions where id = 'test-viewpoint'`);
        assert.equal(rows[0].destination_id, 'ella');
        assert.equal(rows[0].published, false, 'a draft');
        assert.ok(Math.abs(rows[0].latitude - lat) < 1e-6 && Math.abs(rows[0].longitude - lng) < 1e-6);
      } finally {
        await closePage(page);
      }
    });

    test('reordering within a destination moves only the two that swap; deleting a destination says it takes its attractions', async () => {
      // Galle's at 0, 2, 4, 6, and one of Ella's between Galle's first two.
      await pool.query(`update public.attractions set sort_order = sort_order * 2`);
      await pool.query(`insert into public.attractions (id, destination_id, name, category, short_description, latitude, longitude, sort_order) values ('ella-test', 'ella', 'Ella test', 'Culture', 'T.', 6.87, 81.05, 1)`);
      const order = async () => (await pool.query<{ id: string }>(`select id from public.attractions order by sort_order, id`)).rows.map((r) => r.id);
      const before = await order();
      assert.equal(before[1], 'ella-test');
      const page = await adminPage('/admin/attractions?destination_id=galle', `document.querySelectorAll('main .font-mono').length === 4`);
      try {
        await page.evaluate(`document.querySelector('main button[aria-label="Move down"]').click(), true`);
        const until = Date.now() + 5_000;
        let after = await order();
        while (after[0] === before[0] && Date.now() < until) {
          await sleep(100);
          after = await order();
        }
        // Galle's first two swap places; Ella's, in between them in the table, doesn't move.
        const galleBefore = before.filter((id) => id !== 'ella-test');
        const expected = [...before];
        const [i, j] = [before.indexOf(galleBefore[0]), before.indexOf(galleBefore[1])];
        [expected[i], expected[j]] = [expected[j], expected[i]];
        assert.deepEqual(after, expected);
      } finally {
        await closePage(page);
      }
      const destinations = await adminPage('/admin/destinations', `document.querySelectorAll('main .font-mono').length === 20`);
      try {
        await destinations.evaluate(`[...document.querySelectorAll('main .font-mono')].find((p) => p.textContent.startsWith('galle')).closest('div.flex').querySelector('button[aria-label="Delete"]').click(), true`);
        await poll(destinations, `document.querySelector('[data-cascade-warning]')`, 'the warning', 5_000);
        assert.equal(await destinations.evaluate<string>(`document.querySelector('[data-cascade-warning]').textContent`), 'Also deletes its 4 attractions.');
      } finally {
        await closePage(destinations);
      }
    });
  });
});
