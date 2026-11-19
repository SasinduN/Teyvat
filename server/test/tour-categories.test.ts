/**
 * Tour categories (0030, docs/plans/tour-categories.md): the tables and their rules, the
 * seed and its assignments, a price that may be empty, the reserved tour id, what
 * `GET /api/content` shows, the admin's reads and writes of a category, and a tour's
 * categories saved with the tour.
 */
import './test-db';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import { schemaForTable } from '../../shared/content-schema';
import type { SiteContentPayload } from '../../shared/api';
import { hasTourPrice } from '../../shared/tour-price';
import { activeNavigationTarget } from '../../src/lib/activeNavigation';
import { navItems, navLinks } from '../../shared/site-paths';
import { TOUR_CATEGORIES, TOUR_CATEGORY_LINKS } from '../../scripts/fixtures/tourCategories';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import {
  assertConnectedToTestDatabase,
  createUser,
  listen,
  login,
  migrateTestDatabase,
  PASSWORD,
  resetAuthTables,
  resetContent,
  seedPhotoSet,
  sessionTokenFrom,
  withSession,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGRATION = readFileSync(resolve(REPO_ROOT, 'db/migrations/0030_tour_categories.sql'), 'utf8');

type Row = Record<string, unknown> & { id: string; updated_at: string };

let app: RunningApp;
let token: string;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  app = await listen(createApp({ media: null }));
  await resetAuthTables();
  await createUser();
  token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  assert.ok(token);
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetContent({ whatsappNumber: null });
  await pool.query('delete from public.media');
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

function admin(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${app.baseUrl}/api/admin${path}`, {
    method,
    headers: { ...withSession(token), Origin: app.baseUrl, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function content(): Promise<SiteContentPayload> {
  const res = await fetch(`${app.baseUrl}/api/content`);
  assert.equal(res.status, 200);
  return (await res.json()) as SiteContentPayload;
}

async function getRow(table: string, id: string): Promise<Row> {
  const res = await admin('GET', `/content/${table}/${id}`);
  assert.equal(res.status, 200);
  return (await res.json()) as Row;
}

function put(table: string, row: Row, changes: Record<string, unknown>): Promise<Response> {
  const { id: _id, created_at: _c, updated_at: _u, sort_order: _s, tour_count: _t, ...values } = row;
  return admin('PUT', `/content/${table}/${row.id}`, { values: { ...values, ...changes }, expectedUpdatedAt: row.updated_at });
}

async function fields(res: Response): Promise<Record<string, string>> {
  const body = (await res.json()) as { error: { fields?: Record<string, string> } };
  return body.error.fields ?? {};
}

async function links(tourId: string): Promise<string[]> {
  const { rows } = await pool.query('select category_id from public.tour_category_links where tour_id = $1 order by position', [tourId]);
  return rows.map((r) => r.category_id as string);
}

const NEW_CATEGORY = {
  id: 'rail',
  name: 'Rail Tours',
  heading: 'Rail tours in Sri Lanka',
  short_intro: 'Days on the train.',
  long_intro: 'One.\n\nTwo.',
  image: '',
  best_time_note: '',
  published: true
};

describe('migration 0030', () => {
  test('seeds the eight categories, published, in order, with the approved text', async () => {
    const { rows } = await pool.query('select * from public.tour_categories order by sort_order, id');
    assert.deepEqual(rows.map((r) => r.id), TOUR_CATEGORIES.map((c) => c.id));
    assert.deepEqual(rows.map((r) => r.id), ['beach', 'family', 'hill-country', 'wellness', 'adventure', 'honeymoon', 'cultural', 'wildlife']);
    for (const [i, c] of TOUR_CATEGORIES.entries()) {
      const row = rows[i];
      assert.equal(row.name, c.name, c.id);
      assert.equal(row.heading, c.heading, c.id);
      assert.equal(row.short_intro, c.shortIntro, c.id);
      assert.equal(row.long_intro, c.intro.join('\n\n'), c.id);
      assert.equal(row.best_time_note, c.bestTimeNote ?? null, c.id);
      assert.equal(row.published, true, c.id);
      assert.equal(row.sort_order, i, c.id);
      // Local databases have no R2 rows: the destination's stored cover.
      const cover = (await pool.query('select image from public.destinations where id = $1', [c.photo])).rows[0].image;
      assert.equal(row.image, cover, `${c.id}: ${c.photo}'s photo`);
    }
    assert.deepEqual(rows.filter((r) => r.best_time_note).map((r) => r.id), ['beach', 'hill-country'], 'best-time notes only where sourced');
  });

  test('the seed text: no em dashes, no promised sightings, nothing medical', () => {
    const text = TOUR_CATEGORIES.flatMap((c) => [c.name, c.heading, c.shortIntro, ...c.intro, c.bestTimeNote ?? '']).join('\n');
    assert.doesNotMatch(text, /—/);
    // "best seen early" is advice, not a claim: only "the best" and the like are out.
    assert.doesNotMatch(text, /\b(cure|cures|detox|heal|healing|guaranteed sightings?|the best|stunning|breathtaking|unforgettable|world-class)\b/i);
    assert.match(TOUR_CATEGORIES.find((c) => c.id === 'wildlife')!.intro.join(' '), /sightings can't be guaranteed/);
  });

  test('assigns the seed tours as approved, in order', async () => {
    for (const [tourId, expected] of Object.entries(TOUR_CATEGORY_LINKS)) assert.deepEqual(await links(tourId), expected, tourId);
    const { rows } = await pool.query('select count(*)::int as n from public.tour_category_links');
    assert.equal(rows[0].n, 5);
  });

  test('re-runs without changing anything, and leaves an admin edit alone', async () => {
    await pool.query(`update public.tour_categories set name = 'Seaside' where id = 'beach'`);
    await pool.query(`delete from public.tour_category_links where tour_id = 'island-in-7-days' and category_id = 'cultural'`);
    await pool.query(MIGRATION);
    assert.equal((await pool.query(`select name from public.tour_categories where id = 'beach'`)).rows[0].name, 'Seaside');
    assert.equal((await pool.query('select count(*)::int as n from public.tour_categories')).rows[0].n, 8);
  });

  test('a category photo is the R2 file of the verified photo when media has it', async () => {
    const files = await seedPhotoSet('yala', 'https://test-bucket.r2.dev', [480, 1280]);
    await pool.query(`delete from public.tour_categories where id = 'wildlife'`);
    await pool.query(MIGRATION);
    const image = (await pool.query(`select image from public.tour_categories where id = 'wildlife'`)).rows[0].image;
    assert.equal(image, files.find((f) => f.width === 1280)!.url);
  });

  test('price_from may be empty; no tour may have the id "category"', async () => {
    await pool.query(`update public.tours set price_from = null where id = 'wild-sri-lanka'`);
    assert.equal((await pool.query(`select price_from from public.tours where id = 'wild-sri-lanka'`)).rows[0].price_from, null);
    await assert.rejects(
      pool.query(`insert into public.tours (id, title, subtitle, days, short_desc, full_desc, image, category) values ('category', 'x', 'x', 1, 'x', 'x', 'https://images.unsplash.com/x', 'Culture')`),
      /tours_id_not_category/
    );
  });

  test('deleting a tour or a category deletes its links, never the other', async () => {
    await pool.query(`delete from public.tour_categories where id = 'cultural'`);
    assert.deepEqual(await links('island-in-7-days'), ['hill-country']);
    assert.equal((await pool.query(`select count(*)::int as n from public.tours where id = 'cultural-sri-lanka'`)).rows[0].n, 1, 'the tour stays');
  });

  test('the CHECKs refuse a bad id, an empty name and an http image', async () => {
    const insert = (id: string, name: string, image: string | null) =>
      pool.query(`insert into public.tour_categories (id, name, heading, short_intro, long_intro, image) values ($1, $2, 'h', 's', 'l', $3)`, [id, name, image]);
    await assert.rejects(insert('Bad Id', 'x', null));
    await assert.rejects(insert('ok-id', '  ', null));
    await assert.rejects(insert('ok-id', 'x', 'http://example.com/a.jpg'));
  });
});

describe('GET /api/content', () => {
  test('published categories in order, and each tour its published categories in its own order', async () => {
    let payload = await content();
    assert.deepEqual(payload.tourCategories.map((c) => c.id), TOUR_CATEGORIES.map((c) => c.id));
    const ids = Object.fromEntries(payload.tours.map((t) => [t.id, t.category_ids]));
    assert.deepEqual(ids, { ...TOUR_CATEGORY_LINKS });

    await pool.query(`update public.tour_categories set published = false where id = 'hill-country'`);
    payload = await content();
    assert.ok(!payload.tourCategories.some((c) => c.id === 'hill-country'), 'a draft is not public');
    assert.deepEqual(payload.tours.find((t) => t.id === 'island-in-7-days')!.category_ids, ['cultural'], "nor is a draft's id on a tour");
  });

  test('an empty price is null; a tour with none still shows', async () => {
    await pool.query(`update public.tours set price_from = null where id = 'southern-escape'`);
    const tour = (await content()).tours.find((t) => t.id === 'southern-escape')!;
    assert.equal(tour.price_from, null);
    assert.equal(hasTourPrice(tour.price_from), false);
    assert.equal(hasTourPrice(0), false, '0 is on request too');
    assert.equal(hasTourPrice(1250), true);
  });
});

describe('the admin', () => {
  test('a category: create, read, update, publish, reorder and delete, like any content', async () => {
    const created = await admin('POST', '/content/tour_categories', NEW_CATEGORY);
    assert.equal(created.status, 201);
    const row = (await created.json()) as Row;
    assert.equal(row.image, null, 'no photo: NULL');
    assert.equal(row.best_time_note, null);
    assert.equal(row.sort_order, 8, 'at the end');

    const read = await getRow('tour_categories', 'rail');
    const saved = await put('tour_categories', read, { name: 'Train Tours' });
    assert.equal(saved.status, 200);
    assert.equal(((await saved.json()) as Row).name, 'Train Tours');

    assert.equal((await admin('PATCH', '/content/tour_categories/rail/published', { published: false })).status, 200);
    assert.ok(!(await content()).tourCategories.some((c) => c.id === 'rail'));

    const list = (await (await admin('GET', '/content/tour_categories')).json()) as Row[];
    assert.equal(list.find((r) => r.id === 'cultural')!.tour_count, 2, 'the list says how many tours each holds');
    const ids = list.map((r) => r.id).reverse();
    assert.equal((await admin('PUT', '/content/tour_categories/order', { ids })).status, 204);
    assert.deepEqual(((await (await admin('GET', '/content/tour_categories')).json()) as Row[]).map((r) => r.id), ids);

    assert.equal((await admin('DELETE', '/content/tour_categories/cultural')).status, 204);
    assert.deepEqual(await links('island-in-7-days'), ['hill-country'], 'its tours lose it and stay');
  });

  test('a category: the schema refuses a missing heading, a long intro and a bad slug', async () => {
    const res = await admin('POST', '/content/tour_categories', { ...NEW_CATEGORY, id: 'Bad Slug', heading: '', short_intro: 'x'.repeat(301) });
    assert.equal(res.status, 400);
    const f = await fields(res);
    assert.ok(f.id && f.heading && f.short_intro, JSON.stringify(f));
    assert.equal((await admin('GET', '/content/tour_categories/rail')).status, 404);
  });

  test("a tour's categories: read and saved with the tour, in the order picked", async () => {
    const tour = await getRow('tours', 'wild-sri-lanka');
    assert.deepEqual(tour.category_ids, ['wildlife']);

    const res = await put('tours', tour, { category_ids: ['adventure', 'wildlife', 'adventure'] });
    assert.equal(res.status, 200);
    assert.deepEqual(((await res.json()) as Row).category_ids, ['adventure', 'wildlife'], 'twice is once');
    assert.deepEqual(await links('wild-sri-lanka'), ['adventure', 'wildlife']);

    // Left out (an older client): unchanged.
    const again = await getRow('tours', 'wild-sri-lanka');
    const { category_ids: _ids, ...rest } = again;
    assert.equal((await put('tours', rest as Row, { title: 'Wild Sri Lanka' })).status, 200);
    assert.deepEqual(await links('wild-sri-lanka'), ['adventure', 'wildlife']);

    // A category that doesn't exist: a field error, and nothing changes.
    const bad = await put('tours', await getRow('tours', 'wild-sri-lanka'), { category_ids: ['nowhere'] });
    assert.equal(bad.status, 400);
    assert.ok((await fields(bad)).category_ids);
    assert.deepEqual(await links('wild-sri-lanka'), ['adventure', 'wildlife']);

    // None: listed under All tours only.
    assert.equal((await put('tours', await getRow('tours', 'wild-sri-lanka'), { category_ids: [] })).status, 200);
    assert.deepEqual(await links('wild-sri-lanka'), []);
  });

  test('a new tour: no price is "Price on request", and the id "category" is refused', async () => {
    const tour = await getRow('tours', 'southern-escape');
    const { id: _id, created_at: _c, updated_at: _u, sort_order: _s, ...values } = tour;
    const res = await admin('POST', '/content/tours', { ...values, id: 'tea-trails', price_from: '', category_ids: ['hill-country'] });
    assert.equal(res.status, 201, JSON.stringify(await res.clone().json()));
    const row = (await res.json()) as Row;
    assert.equal(row.price_from, null);
    assert.deepEqual(row.category_ids, ['hill-country']);

    const reserved = await admin('POST', '/content/tours', { ...values, id: 'category' });
    assert.equal(reserved.status, 400);
    assert.match((await fields(reserved)).id ?? '', /reserved/);
  });

  test('the shared schema: an optional number left empty is null; a required one still refuses', () => {
    const tours = schemaForTable('tours', 'update');
    const base = { title: 't', subtitle: 's', days: 1, category: 'Culture', image: 'https://images.unsplash.com/x', short_desc: 'x', full_desc: 'x', stops: [{ kind: 'destination', destination_id: 'ella' }], highlights: [], included_places: [], itinerary: [], published: true };
    assert.equal(tours.parse({ ...base, price_from: '' }).price_from, null);
    assert.equal(tours.parse({ ...base, price_from: null }).price_from, null);
    assert.equal(tours.parse({ ...base, price_from: '950' }).price_from, 950);
    assert.equal(tours.safeParse({ ...base, price_from: '', days: '' }).success, false);
  });
});

describe('navigation', () => {
  test('Tours is a group: All tours, then the published categories; Book Your Ride goes with the flag', () => {
    const categories = TOUR_CATEGORIES.map(({ id, name }) => ({ id, name }));
    const tours = navItems({ bookings: false }, categories).find((item) => item.label === 'Tours');
    assert.ok(tours && 'links' in tours);
    assert.deepEqual(tours.links.map((l) => l.label), ['All tours', ...TOUR_CATEGORIES.map((c) => c.name)]);
    assert.equal(tours.links[1].to, '/tours/category/beach');
    assert.ok(!navLinks({ bookings: false }, categories).some((l) => l.to === '/booking'));
    assert.ok(navLinks({ bookings: true }, categories).some((l) => l.to === '/booking'));
  });

  test("the current link: a category's own page, All tours for the list and a tour", () => {
    const all = navLinks({ bookings: true }, TOUR_CATEGORIES);
    assert.equal(activeNavigationTarget('/tours/category/beach', '', all), '/tours/category/beach');
    assert.equal(activeNavigationTarget('/tours', '', all), '/tours');
    assert.equal(activeNavigationTarget('/tours/island-in-7-days', '', all), '/tours');
    assert.equal(activeNavigationTarget('/about', '#contact', all), '/about#contact');
  });
});
