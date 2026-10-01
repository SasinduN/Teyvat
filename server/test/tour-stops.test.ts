// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Tour route stops (0007) and the airport travel time:
 *
 *   - the migration's conversion of the seeded routes, its refusal of a stop
 *     it can't place, and the table's CHECKs;
 *   - `GET /api/content`: stops in order, resolved on the server;
 *   - the admin API: reading, replacing and validating stops, and refusing to
 *     delete a destination a route uses.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { SiteContentPayload } from '../../shared/api';
import type { TourStopInput } from '../../shared/tour-stops';
import { DESTINATIONS } from '../../scripts/fixtures/destinations';
import { TOURS } from '../../scripts/fixtures/tours';
import { stopsFromRoute } from '../../scripts/route-stops';
import { toTourPackage } from '../../src/lib/mappers';
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
  sessionTokenFrom,
  withSession,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

type Row = Record<string, unknown> & { id: string; updated_at: string };

let app: RunningApp;
let token: string;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  app = await listen(createApp());

  await resetAuthTables();
  await createUser();
  token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  assert.ok(token);
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetContent();
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

function admin(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${app.baseUrl}/api/admin${path}`, {
    method,
    headers: {
      ...withSession(token),
      Origin: app.baseUrl,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function content(): Promise<SiteContentPayload> {
  const res = await fetch(`${app.baseUrl}/api/content`);
  assert.equal(res.status, 200);
  return (await res.json()) as SiteContentPayload;
}

async function getTour(id: string): Promise<Row & { stops: TourStopInput[] }> {
  const res = await admin('GET', `/content/tours/${id}`);
  assert.equal(res.status, 200);
  return (await res.json()) as Row & { stops: TourStopInput[] };
}

function putTour(row: Row, changes: Record<string, unknown>): Promise<Response> {
  const { id: _id, created_at: _c, updated_at: _u, sort_order: _s, ...values } = row;
  return admin('PUT', `/content/tours/${row.id}`, {
    values: { ...values, ...changes },
    expectedUpdatedAt: row.updated_at
  });
}

async function fields(res: Response): Promise<Record<string, string>> {
  const body = (await res.json()) as { error: { fields?: Record<string, string> } };
  return body.error.fields ?? {};
}

async function storedStops(tourId: string): Promise<TourStopInput[]> {
  const { rows } = await pool.query(
    `select destination_id, name, lat, lng from public.tour_stops where tour_id = $1 order by position`,
    [tourId]
  );
  return rows.map((r) =>
    r.destination_id
      ? { kind: 'destination', destination_id: r.destination_id, name: r.name }
      : { kind: 'custom', name: r.name, lat: r.lat, lng: r.lng }
  );
}

/* ------------------------------------------------------------- migration */

describe('migration 0007', () => {
  test('turns every seeded route into the stops scripts/route-stops.ts derives', async () => {
    for (const tour of TOURS) {
      assert.deepEqual(
        await storedStops(tour.id),
        stopsFromRoute(tour.id, tour.route, DESTINATIONS),
        tour.id
      );
    }
    // The four unmatched stops, as decided.
    assert.deepEqual(await storedStops('wild-sri-lanka'), [
      { kind: 'custom', name: 'Wilpattu', lat: 8.3063, lng: 80.1484 },
      { kind: 'destination', destination_id: 'sigiriya', name: null },
      { kind: 'custom', name: 'Minneriya', lat: 8.0326, lng: 80.8236 },
      { kind: 'destination', destination_id: 'yala', name: 'Yala' }
    ]);
    const island = await storedStops('island-in-7-days');
    assert.deepEqual(island.slice(-2), [
      { kind: 'destination', destination_id: 'mirissa', name: null },
      { kind: 'destination', destination_id: 'galle', name: 'Galle' }
    ]);
    assert.deepEqual((await storedStops('southern-escape'))[1], {
      kind: 'custom',
      name: 'Unawatuna',
      lat: 6.0183,
      lng: 80.2525
    });
  });

  test('drops tours.route', async () => {
    const { rowCount } = await pool.query(
      `select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'tours' and column_name = 'route'`
    );
    assert.equal(rowCount, 0);
  });

  test('a stop it cannot place stops the migration, naming it', async () => {
    const sql = readFileSync(resolve(REPO_ROOT, 'db/migrations/0007_tour_stops.sql'), 'utf8')
      .replace(/^begin;\s*$/m, '')
      .replace(/^commit;\s*$/m, '');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`alter table public.tours add column route text[] not null default '{}'`);
      await client.query(`update public.tours set route = array['Kandy', 'Atlantis'] where id = 'cultural-sri-lanka'`);
      await assert.rejects(client.query(sql), (error: Error) => {
        assert.match(error.message, /cultural-sri-lanka: Atlantis/);
        return true;
      });
    } finally {
      await client.query('rollback');
      client.release();
    }
    // Rolled back: nothing changed.
    assert.equal((await storedStops('cultural-sri-lanka')).length, 4);
  });

  test('the CHECKs refuse a half-custom stop, coordinates on a linked stop, and places outside Sri Lanka', async () => {
    const insert = (columns: string, values: string) =>
      pool.query(`insert into public.tour_stops (tour_id, position, ${columns}) values ('wild-sri-lanka', 99, ${values})`);
    const refused = { code: '23514' };
    await assert.rejects(insert('name, lat', `'Half', 7.5`), refused);
    await assert.rejects(insert('destination_id, lat, lng', `'kandy', 7.29, 80.63`), refused);
    await assert.rejects(insert('name, lat, lng', `'Maldives', 4.17, 73.51`), refused);
    await assert.rejects(insert('name, lat, lng', `'Swapped', 80.63, 7.29`), refused);
  });
});

/* ---------------------------------------------------------- public API */

describe('GET /api/content', () => {
  test('each tour carries its stops in order, and the chips read their names', async () => {
    const { tours } = await content();
    const island = tours.find((t) => t.id === 'island-in-7-days')!;
    assert.deepEqual(
      island.stops.map((s) => s.position),
      island.stops.map((_, i) => i)
    );
    assert.deepEqual(toTourPackage(island).route, ['Colombo', 'Kandy', 'Ella', 'Yala', 'Mirissa', 'Galle']);

    const wild = tours.find((t) => t.id === 'wild-sri-lanka')!;
    assert.deepEqual(wild.stops[0], { position: 0, name: 'Wilpattu', lat: 8.3063, lng: 80.1484, destinationId: null });
    assert.deepEqual(wild.stops[3], { position: 3, name: 'Yala', lat: 6.3725, lng: 81.5168, destinationId: 'yala' });
  });

  test('a linked stop takes its destination’s current coordinates', async () => {
    await pool.query(`update public.destinations set latitude = 7.3, longitude = 80.64 where id = 'kandy'`);
    const { tours } = await content();
    const kandy = tours.find((t) => t.id === 'cultural-sri-lanka')!.stops[3];
    assert.deepEqual([kandy.name, kandy.lat, kandy.lng], ['Kandy', 7.3, 80.64]);
  });

  test('a stop at an unpublished destination still shows, without its slug', async () => {
    await pool.query(`update public.destinations set published = false where id = 'ella'`);
    const { tours } = await content();
    const ella = tours.find((t) => t.id === 'island-in-7-days')!.stops[2];
    assert.equal(ella.name, 'Ella');
    assert.equal(ella.destinationId, null);
  });

  test('travel_time_from_airport is NULL by default and passes through when set', async () => {
    let { destinations } = await content();
    assert.equal(destinations.find((d) => d.id === 'ella')!.travel_time_from_airport, null);
    await pool.query(`update public.destinations set travel_time_from_airport = '~4 h' where id = 'ella'`);
    ({ destinations } = await content());
    assert.equal(destinations.find((d) => d.id === 'ella')!.travel_time_from_airport, '~4 h');
  });
});

/* ------------------------------------------------------------ admin API */

describe('admin: tour stops', () => {
  test('GET returns the stops in the form’s shape; the list does not', async () => {
    const tour = await getTour('wild-sri-lanka');
    assert.deepEqual(tour.stops, stopsFromRoute('wild-sri-lanka', ['Wilpattu', 'Sigiriya', 'Minneriya', 'Yala'], DESTINATIONS));
  });

  test('PUT replaces the stops, in order', async () => {
    const tour = await getTour('cultural-sri-lanka');
    const stops = [
      { kind: 'destination', destination_id: 'kandy', name: '' },
      { kind: 'custom', name: 'Ritigala', lat: '8.1063', lng: '80.6488' },
      { kind: 'destination', destination_id: 'polonnaruwa', name: 'Polonnaruwa ruins' }
    ];
    const res = await putTour(tour, { stops });
    assert.equal(res.status, 200);
    const expected = [
      { kind: 'destination', destination_id: 'kandy', name: null },
      { kind: 'custom', name: 'Ritigala', lat: 8.1063, lng: 80.6488 },
      { kind: 'destination', destination_id: 'polonnaruwa', name: 'Polonnaruwa ruins' }
    ];
    assert.deepEqual(((await res.json()) as { stops: unknown }).stops, expected);
    assert.deepEqual(await storedStops('cultural-sri-lanka'), expected);

    const { tours } = await content();
    assert.deepEqual(
      toTourPackage(tours.find((t) => t.id === 'cultural-sri-lanka')!).route,
      ['Kandy', 'Ritigala', 'Polonnaruwa ruins']
    );
  });

  test('field-level errors for each row, and nothing changes', async () => {
    const tour = await getTour('cultural-sri-lanka');
    let res = await putTour(tour, {
      stops: [
        { kind: 'custom', name: 'Nowhere', lat: '12', lng: '80' },
        { kind: 'custom', name: '', lat: '7', lng: '' },
        { kind: 'destination', destination_id: '' }
      ]
    });
    assert.equal(res.status, 400);
    const errors = await fields(res);
    assert.equal(errors['stops.0.lat'], 'Latitude must be between 5.5 and 10 (Sri Lanka).');
    assert.equal(errors['stops.1.name'], 'A custom stop needs a name.');
    assert.equal(errors['stops.1.lng'], 'Longitude is required.');
    assert.equal(errors['stops.2.destination_id'], 'Choose a destination.');

    res = await putTour(tour, { stops: [{ kind: 'destination', destination_id: 'atlantis', name: null }] });
    assert.equal(res.status, 400);
    assert.equal((await fields(res))['stops.0.destination_id'], 'That destination no longer exists. Choose another.');

    res = await putTour(tour, { stops: [] });
    assert.equal(res.status, 400);
    assert.equal((await fields(res)).stops, 'Add at least one stop.');

    assert.equal((await storedStops('cultural-sri-lanka')).length, 4);
  });

  test('POST creates a tour with its stops', async () => {
    const source = await getTour('cultural-sri-lanka');
    const { id: _id, created_at: _c, updated_at: _u, sort_order: _s, ...values } = source;
    const res = await admin('POST', '/content/tours', {
      ...values,
      id: 'kandy-weekend',
      title: 'Kandy Weekend',
      stops: [{ kind: 'destination', destination_id: 'kandy', name: null }]
    });
    assert.equal(res.status, 201);
    assert.deepEqual(await storedStops('kandy-weekend'), [
      { kind: 'destination', destination_id: 'kandy', name: null }
    ]);
  });

  test('deleting a destination a route uses is 409, naming the tours', async () => {
    const res = await admin('DELETE', '/content/destinations/kandy');
    assert.equal(res.status, 409);
    const body = (await res.json()) as { error: { message: string } };
    assert.match(body.error.message, /“Island in 7 Days”, “Cultural Sri Lanka”/);
    const { rowCount } = await pool.query(`select 1 from public.destinations where id = 'kandy'`);
    assert.equal(rowCount, 1);
  });

  test('travel time: saved, and refused over 30 characters', async () => {
    const res0 = await admin('GET', '/content/destinations/ella');
    const ella = (await res0.json()) as Row;
    const { id: _id, created_at: _c, updated_at: _u, sort_order: _s, ...values } = ella;
    const put = (travel: string) =>
      admin('PUT', '/content/destinations/ella', {
        values: { ...values, travel_time_from_airport: travel },
        expectedUpdatedAt: ella.updated_at
      });

    let res = await put('x'.repeat(31));
    assert.equal(res.status, 400);
    assert.equal((await fields(res)).travel_time_from_airport, 'Keep it under 30 characters.');

    res = await put(' ~4 h ');
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as Row).travel_time_from_airport, '~4 h');
  });
});
