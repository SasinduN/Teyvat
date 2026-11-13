/**
 * Nearby attractions (0023): the table and its rules, the admin's reads and writes,
 * what `GET /api/content` shows, the straight-line distance label, and
 * `npm run content:import` against the test database (dry run, twice, an admin's
 * edit kept, drafts only, photos to a memory R2 with credits).
 */
import './test-db';

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';
import type { PoolClient } from 'pg';

import { schemaForTable } from '../../shared/content-schema';
import { distanceKm, distanceLabel } from '../../shared/geo';
import type { SiteContentPayload } from '../../shared/api';
import { createApp } from '../src/app';
import { importPlaces, parsePlacesFile, type PlacesFile } from '../src/content-import';
import { pool } from '../src/db';
import type { MediaConfig } from '../src/media/media';
import { memoryStore } from '../src/media/store';
import {
  assertConnectedToTestDatabase,
  createUser,
  listen,
  login,
  migrateTestDatabase,
  PASSWORD,
  resetAuthTables,
  resetContent,
  sessionTokenFrom,
  TEST_ATTRACTION_IDS,
  withSession,
  type RunningApp
} from './helpers';
import { TEST_DATABASE_URL } from './test-db';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLACES = JSON.parse(readFileSync(resolve(REPO_ROOT, 'scripts/content/places.json'), 'utf8')) as PlacesFile & Record<string, unknown>;
const BASE = 'https://test-bucket.r2.dev';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array(60).fill(1)]);

type Row = Record<string, unknown> & { id: string; updated_at: string };

let app: RunningApp;
let token: string;
const store = memoryStore();
const media: MediaConfig = { store, publicBaseUrl: BASE };

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  app = await listen(createApp({ media }));
  await resetAuthTables();
  await createUser();
  token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  assert.ok(token);
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetContent({ whatsappNumber: null });
  await pool.query('delete from public.image_credits');
  await pool.query('delete from public.media');
  store.objects.clear();
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

const NEW_ATTRACTION = {
  id: 'galle-lighthouse-test',
  name: 'Test lighthouse',
  destination_id: 'galle',
  category: 'Culture',
  short_description: 'A test place inside the fort.',
  latitude: '6.0247',
  longitude: '80.2192',
  image: '',
  best_months: [],
  published: false
};

/* ----------------------------------------------------------- the table */

describe('the attractions table (0023)', () => {
  test('a draft by default, and the columns the brief asks for', async () => {
    await pool.query(
      `insert into public.attractions (id, destination_id, name, category, short_description, latitude, longitude)
       values ('t1', 'ella', 'T', 'Culture', 'Text.', 6.87, 81.05)`
    );
    const { rows } = await pool.query(`select * from public.attractions where id = 't1'`);
    assert.equal(rows[0].published, false);
    assert.equal(rows[0].image, null);
    assert.deepEqual(rows[0].best_months, []);
    assert.equal(typeof rows[0].sort_order, 'number');
    assert.ok(rows[0].created_at instanceof Date && rows[0].updated_at instanceof Date);
  });

  test('deleting a destination deletes its attractions (on delete cascade)', async () => {
    await pool.query(`delete from public.tour_stops where destination_id = 'galle'`);
    await pool.query(`delete from public.destinations where id = 'galle'`);
    const { rows } = await pool.query(`select id from public.attractions where destination_id = 'galle'`);
    assert.deepEqual(rows, []);
  });

  test('the database refuses what the form would: no such destination, a bad category, off the island, a 13th month, a non-https image', async () => {
    const base = `insert into public.attractions (id, destination_id, name, category, short_description, latitude, longitude, best_months, image)`;
    const refused = async (sql: string, code: string) => {
      await assert.rejects(pool.query(sql), (error: { code?: string }) => error.code === code, sql);
    };
    await refused(`${base} values ('x', 'nowhere', 'X', 'Culture', 'T.', 6.5, 80.5, '{}', null)`, '23503');
    await refused(`${base} values ('x', 'ella', 'X', 'Shopping', 'T.', 6.5, 80.5, '{}', null)`, '23514');
    await refused(`${base} values ('x', 'ella', 'X', 'Culture', 'T.', 12.5, 80.5, '{}', null)`, '23514');
    await refused(`${base} values ('x', 'ella', 'X', 'Culture', 'T.', 6.5, 80.5, '{13}', null)`, '23514');
    await refused(`${base} values ('x', 'ella', 'X', 'Culture', 'T.', 6.5, 80.5, '{}', 'http://a.test/x.jpg')`, '23514');
  });

  test('the migration runs again without changing anything', async () => {
    const before = (await pool.query('select count(*)::int as n from public.attractions')).rows[0].n;
    await pool.query(readFileSync(resolve(REPO_ROOT, 'db/migrations/0023_attractions.sql'), 'utf8'));
    assert.equal((await pool.query('select count(*)::int as n from public.attractions')).rows[0].n, before);
    assert.equal(before, TEST_ATTRACTION_IDS.length);
  });
});

/* ------------------------------------------------------------ the admin */

describe('admin: attractions', () => {
  test('create, read, update, publish, reorder and delete, like any content', async () => {
    const created = await admin('POST', '/content/attractions', NEW_ATTRACTION);
    assert.equal(created.status, 201, await created.clone().text());
    const row = (await created.json()) as Row;
    assert.equal(row.published, false);
    assert.equal(row.image, null, 'an empty photo is stored as none');
    assert.equal(row.latitude, 6.0247);

    const read = (await (await admin('GET', `/content/attractions/${row.id}`)).json()) as Row;
    const { id: _id, created_at: _c, updated_at: _u, sort_order: _s, ...values } = read;
    const saved = await admin('PUT', `/content/attractions/${row.id}`, { values: { ...values, short_description: 'Edited.' }, expectedUpdatedAt: read.updated_at });
    assert.equal(saved.status, 200, await saved.clone().text());
    assert.equal(((await saved.json()) as Row).short_description, 'Edited.');

    assert.equal((await admin('PATCH', `/content/attractions/${row.id}/published`, { published: true })).status, 200);

    const list = (await (await admin('GET', '/content/attractions')).json()) as Row[];
    const ids = list.map((r) => r.id).reverse();
    assert.equal((await admin('PUT', '/content/attractions/order', { ids })).status, 204);
    const reordered = (await (await admin('GET', '/content/attractions')).json()) as Row[];
    assert.deepEqual(reordered.map((r) => r.id), ids);

    assert.equal((await admin('DELETE', `/content/attractions/${row.id}`)).status, 204);
    assert.equal((await admin('GET', `/content/attractions/${row.id}`)).status, 404);
  });

  test('a save over someone else’s is a 409, and nothing changes', async () => {
    const read = (await (await admin('GET', '/content/attractions/jungle-beach')).json()) as Row;
    const { id: _id, created_at: _c, updated_at: _u, sort_order: _s, ...values } = read;
    assert.equal((await admin('PUT', '/content/attractions/jungle-beach', { values: { ...values, name: 'First' }, expectedUpdatedAt: read.updated_at })).status, 200);
    const stale = await admin('PUT', '/content/attractions/jungle-beach', { values: { ...values, name: 'Second' }, expectedUpdatedAt: read.updated_at });
    assert.equal(stale.status, 409);
    const { rows } = await pool.query(`select name from public.attractions where id = 'jungle-beach'`);
    assert.equal(rows[0].name, 'First');
  });

  test('a destination that doesn’t exist is a field error, not a 500', async () => {
    const res = await admin('POST', '/content/attractions', { ...NEW_ATTRACTION, destination_id: 'nowhere' });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: { fields?: Record<string, string> } };
    assert.match(body.error.fields?.destination_id ?? '', /no longer exists/);
  });

  test('the form’s rules: a name, a known category, on the island, a photo from the library or none', async () => {
    const res = await admin('POST', '/content/attractions', { ...NEW_ATTRACTION, name: '', category: 'Shopping', latitude: '12', image: 'https://elsewhere.test/a.jpg' });
    assert.equal(res.status, 400);
    const fields = ((await res.json()) as { error: { fields: Record<string, string> } }).error.fields;
    assert.deepEqual(Object.keys(fields).sort(), ['category', 'image', 'latitude', 'name']);
    const ours = await admin('POST', '/content/attractions', { ...NEW_ATTRACTION, image: 'https://images.unsplash.com/photo-1' });
    assert.equal(ours.status, 201);
  });

  test('the short description is one or two sentences: 300 characters at most', () => {
    const schema = schemaForTable('attractions', 'create');
    assert.equal(schema.safeParse({ ...NEW_ATTRACTION, short_description: 'x'.repeat(301) }).success, false);
    assert.equal(schema.safeParse({ ...NEW_ATTRACTION, short_description: 'x'.repeat(300) }).success, true);
  });
});

/* ------------------------------------------------------- the public site */

describe('GET /api/content: only published attractions of published destinations', () => {
  test('the seeded four are there, in order', async () => {
    const { attractions } = await content();
    assert.deepEqual(attractions.map((a) => a.id), [...TEST_ATTRACTION_IDS]);
    assert.ok(attractions.every((a) => a.destination_id === 'galle'));
  });

  test('an unpublished attraction is left out', async () => {
    await pool.query(`update public.attractions set published = false where id = 'jungle-beach'`);
    assert.ok(!(await content()).attractions.some((a) => a.id === 'jungle-beach'));
  });

  test('an unpublished destination takes its attractions with it, and they return with it', async () => {
    await pool.query(`update public.destinations set published = false where id = 'galle'`);
    assert.deepEqual((await content()).attractions, []);
    await pool.query(`update public.destinations set published = true where id = 'galle'`);
    assert.equal((await content()).attractions.length, TEST_ATTRACTION_IDS.length);
  });

  test('a credited photo of an attraction is in the payload’s credits', async () => {
    const url = `${BASE}/attractions/a.jpg`;
    await pool.query(`update public.attractions set image = $1 where id = 'jungle-beach'`, [url]);
    await pool.query(`insert into public.image_credits (url, author, license, source_url) values ($1, 'A. Author', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:X.jpg')`, [url]);
    const payload = await content();
    assert.equal(payload.attractions.find((a) => a.id === 'jungle-beach')?.image, url);
    assert.ok(payload.imageCredits.some((c) => c.url === url && c.author === 'A. Author'));
  });
});

describe('the straight-line distance', () => {
  test('kilometres between two points, and the label', () => {
    // Galle Fort to Unawatuna beach, both as stored: about 5.7 km as the crow flies.
    const km = distanceKm({ latitude: 6.0535, longitude: 80.221 }, { latitude: 6.00817, longitude: 80.24437 });
    assert.ok(Math.abs(km - 5.66) < 0.05, String(km));
    assert.equal(distanceLabel(km), 'about 6 km away');
    assert.equal(distanceLabel(0.4), 'under 1 km away');
    assert.equal(distanceLabel(1), 'about 1 km away');
    assert.equal(distanceLabel(22.6), 'about 23 km away');
    assert.equal(distanceKm({ latitude: 6, longitude: 80 }, { latitude: 6, longitude: 80 }), 0);
  });
});

/* -------------------------------------------------------- content:import */

describe('npm run content:import', () => {
  let client: PoolClient;
  let downloads: string[];
  let failDownloads: boolean;
  const fakeFetch: typeof fetch = async (input) => {
    downloads.push(String(input));
    if (failDownloads) return new Response('no', { status: 404 });
    return new Response(JPEG, { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
  };
  const quick = { fetch: fakeFetch, sleep: async () => undefined, minIntervalMs: 0, backoffMs: 0, maxTries: 1 };
  const file = parsePlacesFile(PLACES);
  const counts = async () => {
    const { rows } = await pool.query<{ d: number; a: number; m: number; c: number }>(
      `select (select count(*)::int from public.destinations) as d, (select count(*)::int from public.attractions) as a,
              (select count(*)::int from public.media) as m, (select count(*)::int from public.image_credits) as c`
    );
    return rows[0];
  };

  before(async () => {
    client = await pool.connect();
  });
  after(() => client?.release());
  beforeEach(() => {
    downloads = [];
    failDownloads = false;
  });

  test('the file passes: every row as the admin would check it, all photos from Commons with a credit', () => {
    assert.equal(file.destinations.length, 6);
    assert.equal(file.attractions.length, 30);
    for (const row of [...file.destinations, ...file.attractions]) {
      if (!row.photo) continue;
      assert.match(row.photo.download, /^https:\/\/upload\.wikimedia\.org\//);
      assert.match(row.photo.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      assert.match(row.photo.license, /^CC (BY|BY-SA) [234]\.0$/, `${row.id}: ${row.photo.license}`);
      assert.ok(row.photo.author);
    }
  });

  test('a bad file stops before anything is written', () => {
    const bad = structuredClone(PLACES);
    bad.attractions[0].category = 'Shopping' as never;
    assert.throws(() => parsePlacesFile(bad));
    const twice = structuredClone(PLACES);
    twice.attractions.push(twice.attractions[0]);
    assert.throws(() => parsePlacesFile(twice), /listed twice/);
    const elsewhere = structuredClone(PLACES);
    elsewhere.destinations[1].photo!.download = 'https://example.test/a.jpg';
    assert.throws(() => parsePlacesFile(elsewhere));
  });

  test('a dry run writes nothing and downloads nothing, and says what it would do', async () => {
    const before = await counts();
    const outcomes = await importPlaces(client, file, { ...quick, dryRun: true, media: null });
    assert.deepEqual(await counts(), before);
    assert.deepEqual(downloads, []);
    const created = outcomes.filter((o) => o.action === 'create');
    assert.equal(created.length, 6 + 30 - TEST_ATTRACTION_IDS.length);
    // The seeded Galle four exist and weren't made by an import: left alone.
    const kept = outcomes.filter((o) => o.action === 'skip').map((o) => o.id).sort();
    assert.deepEqual(kept, [...TEST_ATTRACTION_IDS].sort());
    assert.ok(created.filter((o) => o.photo === 'upload').length > 20);
  });

  test('a run creates drafts only, with photos in R2 and their credits; a second run changes nothing', async () => {
    const before = await counts();
    const first = await importPlaces(client, file, { ...quick, media });
    assert.equal(first.filter((o) => o.action === 'failed').length, 0, JSON.stringify(first.filter((o) => o.action === 'failed')));
    const created = first.filter((o) => o.action === 'create');
    const withPhoto = created.filter((o) => o.photo === 'upload');
    assert.equal(created.length, 6 + 30 - TEST_ATTRACTION_IDS.length);

    const after = await counts();
    assert.equal(after.d, before.d + 6);
    assert.equal(after.a, before.a + 30 - TEST_ATTRACTION_IDS.length);
    assert.equal(store.objects.size, withPhoto.length);
    assert.equal(after.m, withPhoto.length);
    assert.equal(after.c, withPhoto.length);

    // Nothing it made is published.
    const ids = created.map((o) => o.id);
    const { rows: published } = await pool.query(
      `select id from public.destinations where published and id = any($1) union select id from public.attractions where published and id = any($1)`,
      [ids]
    );
    assert.deepEqual(published, []);

    // A photo row: an R2 URL, credited with its author, licence and Commons page.
    const { rows } = await pool.query(
      `select a.image, ic.author, ic.license, ic.license_url, ic.source_url from public.attractions a join public.image_credits ic on ic.url = a.image where a.id = 'hummanaya-blowhole'`
    );
    const hummanaya = file.attractions.find((a) => a.id === 'hummanaya-blowhole')!;
    assert.ok(String(rows[0].image).startsWith(`${BASE}/attractions/`));
    assert.equal(rows[0].author, hummanaya.photo!.author);
    assert.equal(rows[0].license, hummanaya.photo!.license);
    assert.equal(rows[0].source_url, hummanaya.photo!.source);
    // A place with no open photo has none.
    const { rows: none } = await pool.query(`select image from public.destinations where id = 'hiriketiya'`);
    assert.equal(none[0].image, '');

    // The second run: everything is up to date, and nothing is downloaded again.
    downloads = [];
    const second = await importPlaces(client, file, { ...quick, media });
    assert.deepEqual(downloads, []);
    assert.equal(second.filter((o) => o.action === 'create' || o.action === 'update').length, 0);
    assert.equal(second.filter((o) => o.action === 'unchanged').length, created.length);
    assert.deepEqual(await counts(), after);
    assert.equal(store.objects.size, withPhoto.length);
  });

  test('an admin’s edit is never overwritten, a published row counts as edited, and a deleted one isn’t re-created', async () => {
    await importPlaces(client, file, { ...quick, media });
    // As the admin would: each save moves updated_at on.
    await pool.query(`update public.attractions set short_description = 'Edited in the admin.' where id = 'goyambokka-beach'`);
    await pool.query(`update public.destinations set published = true where id = 'tangalle'`);
    await pool.query(`delete from public.attractions where id = 'kalametiya'`);

    // The file has moved on for all three, and for one nobody touched.
    const next = structuredClone(file);
    for (const a of next.attractions) if (['goyambokka-beach', 'kalametiya', 'ussangoda'].includes(a.id)) a.short_description += ' Updated.';
    next.destinations.find((d) => d.id === 'tangalle')!.short_description += ' Updated.';

    const outcomes = await importPlaces(client, next, { ...quick, media });
    const of = (id: string) => outcomes.find((o) => o.id === id)!;
    assert.equal(of('goyambokka-beach').action, 'skip');
    assert.match(of('goyambokka-beach').reason!, /edited in the admin/);
    assert.equal(of('tangalle').action, 'skip');
    assert.equal(of('kalametiya').action, 'skip');
    assert.match(of('kalametiya').reason!, /deleted/);
    assert.equal(of('ussangoda').action, 'update');

    const text = async (table: string, id: string) => (await pool.query(`select short_description, published from public.${table} where id = $1`, [id])).rows[0];
    assert.equal((await text('attractions', 'goyambokka-beach')).short_description, 'Edited in the admin.');
    assert.equal((await text('destinations', 'tangalle')).published, true);
    assert.equal((await pool.query(`select 1 from public.attractions where id = 'kalametiya'`)).rowCount, 0);
    const ussangoda = await text('attractions', 'ussangoda');
    assert.match(ussangoda.short_description, /Updated\.$/);
    assert.equal(ussangoda.published, false, 'an update never publishes');
  });

  test('an attraction whose destination is missing is skipped; a failed photo leaves its row out until a re-run', async () => {
    const orphan = structuredClone(file);
    orphan.destinations = [];
    const outcomes = await importPlaces(client, orphan, { ...quick, media });
    const hummanaya = outcomes.find((o) => o.id === 'hummanaya-blowhole')!;
    assert.equal(hummanaya.action, 'skip');
    assert.match(hummanaya.reason!, /its destination "hiriketiya"/);
    // Mirissa's are there: it's in the seed.
    assert.equal(outcomes.find((o) => o.id === 'parrot-rock')!.action, 'create');

    failDownloads = true;
    const failed = await importPlaces(client, file, { ...quick, media });
    const tangalle = failed.find((o) => o.id === 'tangalle')!;
    assert.equal(tangalle.action, 'failed');
    assert.equal((await pool.query(`select 1 from public.destinations where id = 'tangalle'`)).rowCount, 0);
    // Hiriketiya has no photo, so it was made anyway.
    assert.equal(failed.find((o) => o.id === 'hiriketiya')!.action, 'create');

    failDownloads = false;
    const retried = await importPlaces(client, file, { ...quick, media });
    assert.equal(retried.find((o) => o.id === 'tangalle')!.action, 'create');
    assert.equal(retried.find((o) => o.id === 'hiriketiya')!.action, 'unchanged');
  });

  test('without R2 it refuses to write, unless told to skip the photos', async () => {
    await assert.rejects(importPlaces(client, file, { ...quick, media: null }), /R2 is not configured/);
    const outcomes = await importPlaces(client, file, { ...quick, media: null, skipPhotos: true });
    assert.deepEqual(downloads, []);
    assert.ok(outcomes.filter((o) => o.action === 'create').every((o) => o.photo === 'skipped' || o.photo === 'none'));
    const { rows } = await pool.query(`select image from public.attractions where id = 'hummanaya-blowhole'`);
    assert.equal(rows[0].image, null);
  });

  test('the command: --dry-run against the test database prints the plan and writes nothing', async () => {
    const before = await counts();
    const output = execFileSync(
      process.execPath,
      [resolve(REPO_ROOT, 'node_modules/tsx/dist/cli.mjs'), resolve(REPO_ROOT, 'scripts/content-import.ts'), '--dry-run'],
      { cwd: REPO_ROOT, env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, encoding: 'utf8' }
    );
    assert.ok(output.includes(`database: ${new URL(TEST_DATABASE_URL).pathname.slice(1)} on localhost`), output);
    assert.match(output, /dry run: nothing is written/);
    assert.match(output, /destinations\/hiriketiya: create \(photo: none\)/);
    assert.match(output, /attractions\/jungle-beach: skip, already exists/);
    assert.match(output, /32 would be created \(as drafts\)/);
    assert.deepEqual(await counts(), before);
  });
});
