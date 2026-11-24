// Must be first: points the server at the test database (and clears
// PUBLIC_SITE_URL and SITE_INDEXABLE), or refuses to run.
import './test-db';

/**
 * The medium SEO batch's structured data (handoff Task 9, M2), in the HTML Express sends:
 *
 *   - the TravelAgency has a stable `@id`, and a tour's `provider` points to it;
 *   - a tour is a TouristTrip: its published destinations as the itinerary, in route order, and
 *     a `touristType` only where a category names a kind of traveller;
 *   - a destination is a TouristDestination with its map pin, and its published attractions as
 *     TouristAttractions contained in it (by `@id`);
 *   - every block parses, every `@id` reference resolves on the page, no field is empty, and
 *     nothing says a rating, review, price, offer, opening hours or date.
 *
 * The visible links (M1) are `browser-links`'s. Needs `npm run build`; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { entityJsonLd, organizationId, placeId } from '../src/pages/head';
import { TOURIST_TYPES } from '../src/pages/pages';
import { MAX_PLACES, placesOnTours } from '../../src/lib/placesOnTours';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));

const SITE = 'https://travel.example';
const FORBIDDEN = /rating|review|offer|price|openingHours|startDate|endDate|datePublished/i;

type Block = Record<string, unknown> & { '@type': string };

const jsonLdOf = (html: string): Block[] =>
  [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => JSON.parse(m[1]) as Block);

/** Every `{ "@id": … }` reference object (an object whose only key is `@id`), anywhere in the blocks. */
function references(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => references(v, out));
  else if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === '@id') out.push((value as { '@id': string })['@id']);
    else Object.values(value).forEach((v) => references(v, out));
  }
  return out;
}

/** Every `@id` a node declares (with other fields), anywhere in the blocks. */
function declared(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => declared(v, out));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['@id'] === 'string' && Object.keys(record).length > 1) out.push(record['@id']);
    Object.values(record).forEach((v) => declared(v, out));
  }
  return out;
}

/** Every empty value (`''`, `null`, `[]`, `{}`), by its path. */
function empties(value: unknown, path = '', out: string[] = []): string[] {
  if (value === '' || value === null || value === undefined) out.push(path);
  else if (Array.isArray(value)) {
    if (value.length === 0) out.push(path);
    value.forEach((v, i) => empties(v, `${path}[${i}]`, out));
  } else if (typeof value === 'object') {
    if (Object.keys(value).length === 0) out.push(path);
    for (const [k, v] of Object.entries(value)) empties(v, `${path}.${k}`, out);
  }
  return out;
}

/* ------------------------------------------------------------------ pure */

describe('entityJsonLd (pure)', () => {
  test('a field only when the content has it', () => {
    const trip = entityJsonLd({ type: 'TouristTrip', name: 'A', description: '  ', path: '/tours/a', image: null, touristType: [], itinerary: [] }, SITE);
    assert.deepEqual(Object.keys(trip).sort(), ['@context', '@type', 'name', 'provider', 'url']);
    assert.deepEqual(trip.provider, { '@id': organizationId(SITE) });

    const place = entityJsonLd(
      { type: 'TouristDestination', name: 'B', description: null, path: '/destinations/b', image: 'http://insecure.example/x.jpg', geo: null, attractions: [] },
      SITE
    );
    assert.deepEqual(Object.keys(place).sort(), ['@context', '@id', '@type', 'name', 'url'], 'an http image is left out');
    assert.equal(place['@id'], placeId(SITE, '/destinations/b'));
  });

  test('touristType: only the categories that name a kind of traveller', () => {
    assert.deepEqual(TOURIST_TYPES, { family: 'Families', honeymoon: 'Couples' });
  });
});

/* ------------------------------------------------------------ over HTTP */

describe('tours, destinations and attractions as structured data', { skip: built ? false : 'no build; run `npm run build` first' }, () => {
  let open: RunningApp;
  const page = async (path: string) => {
    const res = await fetch(`${open.baseUrl}${path}`);
    assert.equal(res.status, 200, path);
    return jsonLdOf(await res.text());
  };

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    open = await listen(createApp({ media: null, site: { url: SITE, indexable: true } }));
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await resetContent();
    await open?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('every page type: the TravelAgency’s @id; every @id reference resolves; nothing empty or forbidden', async () => {
    for (const path of ['/', '/tours', '/tours/island-in-7-days', '/tours/category/cultural', '/destinations', '/destinations/galle', '/destinations/ella', '/experiences/safari-yala', '/journal/ultimate-ella-guide', '/about']) {
      const blocks = await page(path);
      const agency = blocks.filter((b) => b['@type'] === 'TravelAgency');
      assert.equal(agency.length, 1, path);
      assert.equal(agency[0]['@id'], organizationId(SITE), path);
      const ids = new Set(declared(blocks));
      for (const ref of references(blocks)) assert.ok(ids.has(ref), `${path}: ${ref} resolves`);
      assert.deepEqual(empties(blocks), [], `${path}: no empty field`);
      // Keys only: a place's own text may say "price" in passing, but no property may.
      const keys = JSON.stringify(blocks).match(/"([^"]+)":/g) ?? [];
      assert.deepEqual(keys.filter((k) => FORBIDDEN.test(k)), [], `${path}: no forbidden property`);
    }
    // Only tours and destinations get an entity.
    for (const path of ['/experiences/safari-yala', '/journal/ultimate-ella-guide', '/tours', '/destinations']) {
      const types = (await page(path)).map((b) => b['@type']);
      assert.ok(!types.includes('TouristTrip') && !types.includes('TouristDestination'), `${path}: ${types}`);
    }
  });

  test('a tour: a TouristTrip, its published destinations in route order, its provider the agency', async () => {
    const trip = async () => (await page('/tours/island-in-7-days')).find((b) => b['@type'] === 'TouristTrip') as Record<string, any>;
    const expected = async () =>
      (
        await pool.query<{ id: string; name: string }>(
          `select d.id, d.name from public.tour_stops s join public.destinations d on d.id = s.destination_id and d.published
            where s.tour_id = 'island-in-7-days' order by s.position`
        )
      ).rows.map((r) => ({ name: r.name, url: `${SITE}/destinations/${r.id}` }));

    let t = await trip();
    const { rows } = await pool.query<{ title: string; short_desc: string }>(`select title, short_desc from public.tours where id = 'island-in-7-days'`);
    assert.equal(t.name, rows[0].title);
    assert.equal(t.description, rows[0].short_desc);
    assert.equal(t.url, `${SITE}/tours/island-in-7-days`);
    assert.match(t.image, /^https:\/\//);
    assert.deepEqual(t.provider, { '@id': organizationId(SITE) });
    assert.ok(!('touristType' in t), 'hill country and cultural name kinds of trip, not of traveller');
    const want = await expected();
    assert.ok(want.length >= 4);
    assert.equal(t.itinerary['@type'], 'ItemList');
    assert.equal(t.itinerary.numberOfItems, want.length);
    assert.deepEqual(
      t.itinerary.itemListElement.map((li: any) => ({ position: li.position, type: li.item['@type'], name: li.item.name, url: li.item.url })),
      want.map((w, i) => ({ position: i + 1, type: 'TouristDestination', ...w }))
    );

    // A draft destination drops out; a category that names travellers adds a touristType.
    await pool.query(`update public.destinations set published = false where id = 'ella'`);
    await pool.query(`insert into public.tour_category_links (tour_id, category_id, position) values ('island-in-7-days', 'family', 9)`);
    t = await trip();
    assert.ok(!t.itinerary.itemListElement.some((li: any) => li.item.url.endsWith('/ella')), 'no draft destination');
    assert.equal(t.itinerary.numberOfItems, want.length - 1);
    assert.equal(t.touristType, 'Families');
    // ...unless that category is a draft itself.
    await pool.query(`update public.tour_categories set published = false where id = 'family'`);
    assert.ok(!('touristType' in (await trip())));
  });

  test('a destination: a TouristDestination with its pin; its published attractions inside it', async () => {
    const place = async () => (await page('/destinations/galle')).find((b) => b['@type'] === 'TouristDestination') as Record<string, any>;
    let d = await place();
    const { rows } = await pool.query<{ name: string; short_description: string; latitude: number; longitude: number }>(
      `select name, short_description, latitude, longitude from public.destinations where id = 'galle'`
    );
    assert.equal(d['@id'], `${SITE}/destinations/galle#place`);
    assert.equal(d.name, rows[0].name);
    assert.equal(d.description, rows[0].short_description);
    assert.equal(d.url, `${SITE}/destinations/galle`);
    assert.deepEqual(d.geo, { '@type': 'GeoCoordinates', latitude: Number(rows[0].latitude), longitude: Number(rows[0].longitude) });

    const published = async () =>
      (await pool.query<{ id: string; name: string }>(`select id, name from public.attractions where destination_id = 'galle' and published order by sort_order, id`)).rows;
    let want = await published();
    assert.ok(want.length >= 2, 'Galle has attractions to list');
    assert.deepEqual(
      d.includesAttraction.map((a: any) => [a['@type'], a.name, a.url, a.containedInPlace['@id'], a.geo['@type']]),
      want.map((a) => ['TouristAttraction', a.name, `${SITE}/destinations/galle#attraction-${a.id}`, d['@id'], 'GeoCoordinates'])
    );

    await pool.query(`update public.attractions set published = false where id = $1`, [want[0].id]);
    d = await place();
    want = await published();
    assert.deepEqual(d.includesAttraction.map((a: any) => a.name), want.map((a) => a.name), 'a draft attraction is left out');
  });
});

describe('placesOnTours: the order of a category\'s "Places on these tours"', () => {
  const tour = (...ids: (string | null)[]) => ({ stops: ids.map((destinationId) => ({ destinationId })) });
  const places = (...ids: string[]) => ids.map((id) => ({ id }));
  const order = (tours: ReturnType<typeof tour>[], published: { id: string }[]) => placesOnTours(tours, published).map((d) => d.id);

  test('places more of the tours visit come first, then the tours take turns', () => {
    const published = places('colombo', 'kandy', 'ella', 'yala', 'mirissa', 'galle', 'anuradhapura', 'sigiriya', 'dambulla');
    assert.deepEqual(
      order([tour('colombo', 'kandy', 'ella', 'yala', 'mirissa', 'galle'), tour('anuradhapura', 'sigiriya', 'dambulla', 'kandy')], published),
      ['kandy', 'colombo', 'anuradhapura', 'sigiriya', 'ella', 'dambulla']
    );
  });

  test(`at most ${MAX_PLACES}, each once, published only, and stops without a place are skipped`, () => {
    assert.deepEqual(order([tour('a', 'b', 'a', null, 'draft', 'c')], places('a', 'b', 'c')), ['a', 'b', 'c']);
    const many = 'abcdefghij'.split('');
    assert.equal(order([tour(...many)], places(...many)).length, MAX_PLACES);
    assert.deepEqual(order([tour('draft'), tour()], places('a')), []);
  });

  test('a draft stop never takes a turn: the tour\'s next published stop does', () => {
    assert.deepEqual(order([tour('a', 'b'), tour('draft', 'x')], places('a', 'b', 'x')), ['a', 'x', 'b']);
  });
});
