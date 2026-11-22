/**
 * The new tour drafts (0031, docs/plans/new-tours.md): `scripts/content/tours.json` itself
 * (every stop a destination, every category real, a day for every day, the copy rules,
 * the best months by coast, no prices), and `importTours` against the test database: a dry
 * run writes nothing; a run creates unpublished drafts with no price, their stops,
 * categories and best months; a second run changes nothing; an admin's edit and a deletion
 * are respected; a tour whose destination is missing is skipped.
 */
import './test-db';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';
import type { PoolClient } from 'pg';

import { parsePlacesFile, type PlacesFile } from '../src/content-import';
import { importTours, parseToursFile, type ToursFile } from '../src/tours-import';
import { pool } from '../src/db';
import { DESTINATIONS } from '../../scripts/fixtures/destinations';
import { TOUR_CATEGORIES } from '../../scripts/fixtures/tourCategories';
import { assertConnectedToTestDatabase, migrateTestDatabase, resetContent, seedPhotoSet } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path: string) => JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8'));
const RAW = read('scripts/content/tours.json') as ToursFile;
const FILE = parseToursFile(RAW);
const PLACES = parsePlacesFile(read('scripts/content/places.json') as PlacesFile);

const EAST = ['east-coast-beaches', 'rock-climbs-and-surf', 'ancient-cities-and-the-east-coast-for-two'];
const SOUTH_WEST = ['family-south-coast', 'southwest-coast-rest', 'hills-and-coast-for-two', 'southern-parks-and-whales'];
const textOf = (t: ToursFile['tours'][number]) =>
  [t.title, t.subtitle, t.short_desc, t.full_desc, ...t.highlights, ...t.itinerary.flatMap((d) => [d.title, d.description, d.location])].join('\n');

describe('scripts/content/tours.json', () => {
  test('eleven drafts, the categories topped up to two as planned', () => {
    assert.equal(FILE.tours.length, 11);
    const main = FILE.tours.map((t) => t.categories[0]).sort();
    assert.deepEqual(main, ['adventure', 'adventure', 'beach', 'family', 'family', 'hill-country', 'honeymoon', 'honeymoon', 'wellness', 'wellness', 'wildlife']);
    const known = new Set(TOUR_CATEGORIES.map((c) => c.id));
    for (const t of FILE.tours) for (const c of t.categories) assert.ok(known.has(c), `${t.id}: ${c}`);
  });

  test('every stop and cover is a destination: the seed\'s, or one the places file adds (Kitulgala)', () => {
    const ids = new Set([...DESTINATIONS.map((d) => d.id), ...PLACES.destinations.map((d) => d.id)]);
    const seed = new Set(DESTINATIONS.map((d) => d.id));
    for (const t of FILE.tours) {
      for (const stop of t.stops) assert.ok(ids.has(stop), `${t.id}: ${stop}`);
      assert.ok(seed.has(t.cover), `${t.id}: its cover is a seed destination's verified photo`);
    }
    assert.ok(FILE.tours.find((t) => t.id === 'rivers-and-ridges')!.stops.includes('kitulgala'));
    assert.ok(PLACES.destinations.some((d) => d.id === 'kitulgala'));
  });

  test('a day in the itinerary for every day; no prices anywhere', () => {
    for (const t of RAW.tours) {
      assert.equal(t.itinerary.length, t.days, t.id);
      assert.ok(!('price_from' in t), t.id);
      assert.doesNotMatch(textOf(t), /\$\s?\d|USD|price/i, `${t.id}: no price in the text`);
    }
  });

  test('best months: the east coast trips its dry season, the others theirs, and the text says so', () => {
    for (const t of FILE.tours) {
      if (EAST.includes(t.id)) {
        assert.deepEqual(t.best_months, [5, 6, 7, 8, 9], t.id);
        assert.match(t.full_desc, /Best from May to September/, t.id);
      } else {
        assert.deepEqual(t.best_months, [1, 2, 3, 12], t.id);
        assert.match(t.full_desc, /Best from December to March/, t.id);
      }
    }
    for (const id of SOUTH_WEST) assert.ok(!EAST.includes(id));
    const whales = FILE.tours.find((t) => t.id === 'southern-parks-and-whales')!;
    assert.match(whales.full_desc, /Yala, or some of its blocks, has closed for some weeks in September and October/);
    assert.match(whales.full_desc, /whale watching off Mirissa runs from about December to April/);
    assert.match(FILE.tours.find((t) => t.id === 'rock-climbs-and-surf')!.full_desc, /Surfing at Arugam Bay is seasonal/);
  });

  test('plain copy: no em dashes, stock phrases, promises or medical claims; wildlife never guaranteed', () => {
    const STOCK = /\b(authentic|unforgettable|seamless|curated|breathtaking|stunning|timeless|immersive|nestled|paradise|premier|luxury|luxurious|5-star|five-star|world-class|the best|private chef|guaranteed sightings?)\b|—/i;
    const MEDICAL = /\b(cure|cures|curing|detox|detoxify|heal|heals|healing|therapeutic|treat (?:illness|disease)|immunity|boost)\b/i;
    for (const t of FILE.tours) {
      assert.doesNotMatch(textOf(t), STOCK, t.id);
      if (t.categories.includes('wellness')) assert.doesNotMatch(textOf(t), MEDICAL, t.id);
      // Inclusions: the car and driver, the nights, the transfers; nothing else promised.
      assert.match(t.full_desc, /Included: a car and driver for (the whole route|the transfers), accommodation for the nights listed, and (the transfers between stops|the drive between Bentota and Galle)\./, t.id);
    }
    for (const t of FILE.tours.filter((x) => /safari|whale/i.test(textOf(x)))) {
      for (const day of t.itinerary.filter((d) => /jeep safari|safaris in|whale-watching boat|An early boat/i.test(d.description))) {
        assert.match(day.description, /can't be guaranteed/, `${t.id}: ${day.title}`);
      }
    }
  });

  test('a bad file stops before anything is written', () => {
    const short = structuredClone(RAW);
    short.tours[0].itinerary.pop();
    assert.throws(() => parseToursFile(short), /7 days, but 6 in the itinerary/);
    const twice = structuredClone(RAW);
    twice.tours.push(twice.tours[0]);
    assert.throws(() => parseToursFile(twice), /listed twice/);
    const reserved = structuredClone(RAW);
    reserved.tours[0].id = 'category';
    assert.throws(() => parseToursFile(reserved), /reserved/);
  });
});

describe('importTours', () => {
  let client: PoolClient;
  const count = async (sql: string) => (await pool.query<{ n: number }>(`select count(*)::int as n from ${sql}`)).rows[0].n;
  const counts = async () => ({
    tours: await count('public.tours'),
    stops: await count('public.tour_stops'),
    links: await count('public.tour_category_links'),
    records: await count(`public.content_imports where table_name = 'tours'`)
  });
  /** Kitulgala, as the places import would leave it (a draft). */
  const addKitulgala = () =>
    pool.query(
      `insert into public.destinations (id, name, region, province, latitude, longitude, short_description, long_description, image, best_time, rating, published)
       values ('kitulgala', 'Kitulgala', 'Central', 'Sabaragamuwa Province', 6.99787, 80.40849, 'x', 'x', '', '', 0, false)`
    );

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    client = await pool.connect();
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
    await pool.query('delete from public.media');
  }, HOOK_TIMEOUT);

  after(async () => {
    client?.release();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('a dry run writes nothing, counting Kitulgala as there when the places file creates it', async () => {
    const before = await counts();
    const outcomes = await importTours(client, FILE, { dryRun: true, plannedDestinations: ['kitulgala'] });
    assert.deepEqual(await counts(), before);
    assert.equal(outcomes.filter((o) => o.action === 'create').length, 11);
    // Without the places file's plan, Kitulgala's tour can't be made.
    const alone = await importTours(client, FILE, { dryRun: true });
    assert.match(alone.find((o) => o.id === 'rivers-and-ridges')!.reason ?? '', /destination "kitulgala" isn't in the database/);
  });

  test('a run creates eleven unpublished drafts with no price, their stops, categories and months; a second run changes nothing', async () => {
    await addKitulgala();
    const ella = await seedPhotoSet('ella', 'https://test-bucket.r2.dev', [480, 1280]);
    const before = await counts();
    const first = await importTours(client, FILE);
    assert.deepEqual(first.filter((o) => o.action !== 'create'), [], JSON.stringify(first));

    const after = await counts();
    assert.equal(after.tours, before.tours + 11);
    assert.equal(after.records, 11);
    const ids = FILE.tours.map((t) => t.id);
    const { rows } = await pool.query(`select * from public.tours where id = any($1::text[])`, [ids]);
    for (const row of rows) {
      const t = FILE.tours.find((x) => x.id === row.id)!;
      assert.equal(row.published, false, row.id);
      assert.equal(row.price_from, null, `${row.id}: Price on request`);
      assert.deepEqual(row.best_months, t.best_months, row.id);
      assert.equal(row.itinerary.length, t.days, row.id);
      assert.deepEqual(row.itinerary.map((d: { day: number }) => d.day), Array.from({ length: t.days }, (_, i) => i + 1));
      const stops = (await pool.query('select destination_id from public.tour_stops where tour_id = $1 order by position', [row.id])).rows.map((r) => r.destination_id);
      assert.deepEqual(stops, t.stops, row.id);
      const links = (await pool.query('select category_id from public.tour_category_links where tour_id = $1 order by position', [row.id])).rows.map((r) => r.category_id);
      assert.deepEqual(links, t.categories, row.id);
      assert.match(row.image, /^https:\/\//, `${row.id}: a cover`);
    }
    // The cover: the verified photo in R2 when media has it, else the destination's stored cover.
    assert.equal(rows.find((r) => r.id === 'hills-and-coast-for-two').image, ella.find((f) => f.width === 1280)!.url);
    const yala = (await pool.query(`select image from public.destinations where id = 'yala'`)).rows[0].image;
    assert.equal(rows.find((r) => r.id === 'southern-parks-and-whales').image, yala);

    // Not public: drafts stay off /api/content.
    const published = (await pool.query(`select count(*)::int as n from public.tours where published and id = any($1::text[])`, [ids])).rows[0].n;
    assert.equal(published, 0);

    const second = await importTours(client, FILE);
    assert.deepEqual([...new Set(second.map((o) => o.action))], ['unchanged']);
    assert.deepEqual(await counts(), after);
  });

  test("an admin's edit is never overwritten; a changed file updates only untouched drafts, never publishing them", async () => {
    await addKitulgala();
    await importTours(client, FILE);
    await pool.query(`update public.tours set title = 'Edited in the admin' where id = 'east-coast-beaches'`);
    await pool.query(`update public.tours set published = true where id = 'tea-country-slowly'`);
    const changed = structuredClone(FILE);
    for (const t of changed.tours) t.subtitle = `${t.subtitle} (revised)`;
    const outcomes = await importTours(client, changed);
    const by = (id: string) => outcomes.find((o) => o.id === id)!;
    assert.equal(by('east-coast-beaches').action, 'skip');
    assert.match(by('east-coast-beaches').reason ?? '', /edited in the admin/);
    assert.equal(by('tea-country-slowly').action, 'skip', 'publishing it is an edit too');
    assert.equal(by('rivers-and-ridges').action, 'update');
    const row = (id: string) => pool.query('select title, subtitle, published from public.tours where id = $1', [id]).then((r) => r.rows[0]);
    assert.equal((await row('east-coast-beaches')).title, 'Edited in the admin');
    assert.match((await row('rivers-and-ridges')).subtitle, /\(revised\)$/);
    assert.equal((await row('rivers-and-ridges')).published, false);
  });

  test('a tour deleted in the admin is not created again; one it did not create is left alone', async () => {
    await addKitulgala();
    await importTours(client, FILE);
    await pool.query(`delete from public.tours where id = 'family-south-coast'`);
    const again = await importTours(client, FILE);
    assert.equal(again.find((o) => o.id === 'family-south-coast')!.action, 'skip');
    assert.match(again.find((o) => o.id === 'family-south-coast')!.reason ?? '', /deleted in the admin/);
    assert.equal(await count(`public.tours where id = 'family-south-coast'`), 0);

    // A tour with a draft's id that the seed or an admin made: left alone.
    await resetContent();
    await addKitulgala();
    const clash = structuredClone(FILE);
    clash.tours[0].id = 'southern-escape';
    const outcomes = await importTours(client, clash);
    assert.match(outcomes.find((o) => o.id === 'southern-escape')!.reason ?? '', /did not create it/);
    assert.equal((await pool.query(`select title from public.tours where id = 'southern-escape'`)).rows[0].title, 'Southern Coastal Escape');
  });

  test('a missing destination or category skips that tour only', async () => {
    const outcomes = await importTours(client, FILE);
    const skipped = outcomes.filter((o) => o.action === 'skip').map((o) => o.id);
    assert.deepEqual(skipped, ['rivers-and-ridges'], 'Kitulgala is not there');
    assert.equal(outcomes.filter((o) => o.action === 'create').length, 10);
    await resetContent();
    await pool.query(`delete from public.tour_categories where id = 'wellness'`);
    const again = await importTours(client, FILE);
    for (const id of ['southwest-coast-rest', 'quiet-days-in-the-hills']) {
      assert.match(again.find((o) => o.id === id)!.reason ?? '', /category "wellness"/, id);
    }
  });
});
