// Must be first: points the server at the test database, or refuses to run.
import './test-db';

/**
 * The medium SEO batch's internal links (handoff Task 9, M1), in Chrome:
 *
 *   - a tour links each route stop whose destination is published, and its published categories;
 *   - a category lists "Places on these tours": the published places its tours stop at, at most six,
 *     those more of its tours visit first, then taking turns between the tours (`placesOnTours`);
 *   - a destination shows "Tours that visit <name>", at most four, and links to When to go;
 *   - only published targets (a draft is never linked), every link a real `<a href>` that answers
 *     200, and one h1 on each page.
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { MAX_PLACES, placesOnTours } from '../../src/lib/placesOnTours';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

const MAX_TOURS = 4;
const EXTRA_TOURS = ['links-test-1', 'links-test-2', 'links-test-3', 'links-test-4'];

describe('internal links between tours, categories and destinations, in Chrome', { skip, timeout: 5 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  async function waitFor(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await page.evaluate<boolean>(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`)) return;
      await sleep(100);
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  async function open(path: string, ready: string, width = 1280): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await waitFor(page, `document.body.dataset.route && document.querySelector('main h1') && ${ready}`, path);
    return page;
  }
  const close = (page: Page) => page.send('Page.close').catch(() => undefined);

  /** The links inside `scope`: text and href. */
  const linksIn = (page: Page, scope: string) =>
    page.evaluate<{ text: string; href: string | null }[]>(
      `[...document.querySelectorAll(${JSON.stringify(`${scope} a`)})].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))`
    );

  /** Every href answers 200 (a real page, never a draft's 404). */
  async function allAnswer(hrefs: (string | null)[]): Promise<void> {
    for (const href of hrefs) {
      assert.ok(href, 'a real href');
      const res = await fetch(`${app.baseUrl}${href.split('#')[0]}`);
      assert.equal(res.status, 200, href);
    }
  }

  const h1s = (page: Page) => page.evaluate<number>(`document.querySelectorAll('h1').length`);

  const publishedStops = async (tourId: string) =>
    (
      await pool.query<{ destination_id: string | null; published: boolean | null; name: string }>(
        `select s.destination_id, d.published, coalesce(s.name, d.name) as name from public.tour_stops s
           left join public.destinations d on d.id = s.destination_id where s.tour_id = $1 order by s.position`,
        [tourId]
      )
    ).rows;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await pool.query(`delete from public.tour_stops where tour_id = any($1)`, [EXTRA_TOURS]);
    await pool.query(`delete from public.tours where id = any($1)`, [EXTRA_TOURS]);
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await pool.query(`delete from public.tour_stops where tour_id = any($1)`, [EXTRA_TOURS]);
    await pool.query(`delete from public.tours where id = any($1)`, [EXTRA_TOURS]);
    await resetContent();
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('a tour: each published stop links to its destination; its published categories link to their pages', async () => {
    await pool.query(`update public.destinations set published = false where id = 'ella'`);
    await pool.query(`update public.tour_categories set published = false where id = 'cultural'`);
    const page = await open('/tours/island-in-7-days', `document.querySelector('[data-route-stops]')`);
    try {
      assert.equal(await h1s(page), 1);
      const stops = await publishedStops('island-in-7-days');
      const items = await page.evaluate<{ text: string; href: string | null }[]>(
        `[...document.querySelectorAll('[data-route-stops] li')].map((li) => ({ text: li.textContent.replace(/,$/, '').trim(), href: li.querySelector('a')?.getAttribute('href') ?? null }))`
      );
      assert.deepEqual(
        items,
        stops.map((s) => ({ text: s.name, href: s.destination_id && s.published ? `/destinations/${s.destination_id}` : null })),
        'a link exactly where the destination is published'
      );
      assert.ok(items.some((i) => i.text === 'Ella' && i.href === null), 'the draft Ella is its name, not a link');
      await allAnswer(items.map((i) => i.href).filter(Boolean));

      const styles = await linksIn(page, '[data-tour-categories-links]');
      assert.deepEqual(styles, [{ text: 'Hill Country Tours', href: '/tours/category/hill-country' }], 'the draft Cultural is left out');
      await allAnswer(styles.map((s) => s.href));
    } finally {
      await close(page);
    }
  });

  test('a category: "Places on these tours", the published places its tours stop at, at most six', async () => {
    /** The row the database says: Cultural's published tours in their order, and the published places. */
    const expected = async () => {
      const tours = (
        await pool.query<{ stops: string[] }>(
          `select array_agg(s.destination_id order by s.position) filter (where s.destination_id is not null) as stops
             from public.tour_category_links l
             join public.tours t on t.id = l.tour_id and t.published
             left join public.tour_stops s on s.tour_id = t.id
            where l.category_id = 'cultural'
            group by t.id, t.sort_order
            order by t.sort_order, t.id`
        )
      ).rows.map((t) => ({ stops: (t.stops ?? []).map((destinationId) => ({ destinationId })) }));
      const destinations = (await pool.query<{ id: string; name: string }>(`select id, name from public.destinations where published`)).rows;
      const visited = new Set(tours.flatMap((t) => t.stops.map((s) => s.destinationId)));
      return { row: placesOnTours(tours, destinations), all: destinations.filter((d) => visited.has(d.id)) };
    };
    let page = await open('/tours/category/cultural', `document.querySelector('[data-category-places]')`);
    try {
      assert.equal(await h1s(page), 1);
      const links = await linksIn(page, '[data-category-places]');
      const { row, all } = await expected();
      assert.ok(all.length > MAX_PLACES, `cultural's tours visit more than ${MAX_PLACES} published places (${all.length})`);
      assert.equal(links.length, MAX_PLACES, 'capped');
      assert.deepEqual(
        links,
        row.map((d) => ({ text: d.name, href: `/destinations/${d.id}` })),
        'most-visited first, then taking turns between the tours'
      );
      // Island in 7 Days alone has six stops; Cultural Sri Lanka's own places still make the row.
      const later = links.filter((l) => ['/destinations/anuradhapura', '/destinations/sigiriya', '/destinations/dambulla'].includes(l.href!));
      assert.ok(later.length > 0, `a later tour's stops make the row: ${links.map((l) => l.text).join(', ')}`);
      assert.equal(links[0].href, '/destinations/kandy', 'Kandy, on both tours, comes first');
      assert.equal(new Set(links.map((l) => l.href)).size, links.length, 'each once');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-category-places] h2').textContent`), 'Places on these tours');
      await allAnswer(links.map((l) => l.href));
    } finally {
      await close(page);
    }

    // The first place drops out once it's a draft.
    const first = (await linksIn(await (page = await open('/tours/category/cultural', `document.querySelector('[data-category-places]')`)), '[data-category-places]'))[0];
    await close(page);
    await pool.query(`update public.destinations set published = false where id = $1`, [first.href!.split('/').pop()]);
    page = await open('/tours/category/cultural', `document.querySelector('[data-category-places]')`);
    try {
      const links = await linksIn(page, '[data-category-places]');
      assert.ok(!links.some((l) => l.href === first.href), `${first.href}: a draft is never linked`);
      await allAnswer(links.map((l) => l.href));
    } finally {
      await close(page);
    }
  });

  test('a destination: "Tours that visit <name>", at most four, and a link to When to go', async () => {
    // Four more published tours through Kandy (it has two), so the cap shows.
    for (const [i, id] of EXTRA_TOURS.entries()) {
      await pool.query(
        `insert into public.tours select (jsonb_populate_record(null::public.tours, to_jsonb(t) || jsonb_build_object('id', $1::text, 'title', $2::text, 'sort_order', 900 + $3::int))).*
           from public.tours t where t.id = 'cultural-sri-lanka'`,
        [id, `Links test tour ${i + 1}`, i]
      );
      await pool.query(`insert into public.tour_stops (tour_id, position, destination_id) values ($1, 0, 'kandy')`, [id]);
    }
    const { rows } = await pool.query<{ n: number }>(
      `select count(distinct s.tour_id)::int as n from public.tour_stops s join public.tours t on t.id = s.tour_id and t.published where s.destination_id = 'kandy'`
    );
    assert.ok(rows[0].n > MAX_TOURS, `more than ${MAX_TOURS} tours visit Kandy (${rows[0].n})`);

    const page = await open('/destinations/kandy', `document.querySelector('[data-tours-through]')`);
    try {
      assert.equal(await h1s(page), 1);
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-tours-through] h2').textContent.trim()`), 'Tours that visit Kandy');
      const tours = (await linksIn(page, '[data-tours-through]')).filter((l) => /^\/tours\/[^/]+$/.test(l.href ?? ''));
      assert.equal(new Set(tours.map((t) => t.href)).size, MAX_TOURS, 'capped at four');
      await allAnswer([...new Set(tours.map((t) => t.href))]);
      assert.equal(await page.evaluate<string | null>(`document.querySelector('[data-when-to-go-link]')?.getAttribute('href') ?? null`), '/when-to-go');
    } finally {
      await close(page);
    }

    // A draft tour is never among them.
    await pool.query(`update public.tours set published = false where id = any($1)`, [EXTRA_TOURS]);
    const again = await open('/destinations/kandy', `document.querySelector('[data-tours-through]')`);
    try {
      const hrefs = new Set((await linksIn(again, '[data-tours-through]')).map((l) => l.href));
      for (const id of EXTRA_TOURS) assert.ok(!hrefs.has(`/tours/${id}`), `${id}: a draft is never linked`);
    } finally {
      await close(again);
    }
  });

  test('the new links are at least 44 px tall on a phone', async () => {
    const page = await open('/tours/island-in-7-days', `document.querySelector('[data-route-stops]')`, 375);
    try {
      const small = await page.evaluate<string[]>(`[...document.querySelectorAll('[data-route-stops] a, [data-tour-categories-links] a')]
        .filter((a) => a.getBoundingClientRect().height < 44).map((a) => a.textContent.trim())`);
      assert.deepEqual(small, []);
      assert.equal(await page.evaluate<number>('document.documentElement.scrollWidth'), 375, 'no sideways scroll');
    } finally {
      await close(page);
    }
  });
});
