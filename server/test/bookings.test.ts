// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Booking requests over HTTP (the friend import; docs/BOOKING_API.md), with
 * bookings on, and with them off: then every booking route is a 404.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, mock, test } from 'node:test';

import { blankLocation, type BookingInput, type BookingRecord } from '../../shared/booking';
import { createApp } from '../src/app';
import { BRAND } from '../../shared/brand';
import { dispatchBookingNotifications } from '../src/bookings/notifications';
import { pool } from '../src/db';
import { BOOKING_COOKIE } from '../src/routes/bookings';
import {
  assertConnectedToTestDatabase,
  browserHeaders,
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

const valid = (): BookingInput => ({
  tourId: null,
  pickup: blankLocation('Test pickup address'),
  destinationId: 'sigiriya',
  stops: [],
  tripType: 'one_way',
  departureDate: '2099-10-20',
  departureTime: '09:00',
  returnDate: null,
  returnTime: null,
  returnPickup: null,
  returnDropoff: null,
  vehicleId: 'test-car',
  passengers: 2,
  contactName: 'Test guest',
  contactEmail: 'guest@example.test',
  contactPhone: '+94 770000000',
  notes: '',
  termsAccepted: true
});

let app: RunningApp;
let off: RunningApp;
let adminToken: string;
let guestCookie: string;
let ipCounter = 0;
/** A fresh client IP per test, so one test's rate limits never reach the next. */
let ip: string;

const count = async (table: string) => (await pool.query(`select count(*)::int as n from public.${table}`)).rows[0].n as number;

async function newGuest(target = app, from = ip): Promise<Response> {
  return fetch(`${target.baseUrl}/api/bookings/session`, { method: 'POST', headers: browserHeaders(target, from) });
}
const cookieOf = (res: Response) => res.headers.getSetCookie()[0].split(';')[0];

function submit(input: unknown = valid(), key = randomUUID(), cookie = guestCookie): Promise<Response> {
  return fetch(`${app.baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { ...browserHeaders(app, ip), Cookie: cookie, 'Idempotency-Key': key },
    body: JSON.stringify(input)
  });
}

const rideDetails = () => ({ pickup: blankLocation('Matara'), dropoff: blankLocation('Galle'), tripType: 'one_way', departureDate: '2099-10-20', departureTime: '09:00', returnDate: null, returnTime: null, passengers: 2, vehicleId: 'test-car' });
function submitRide(body: unknown = { details: rideDetails(), callbackPhone: '+94 771234567' }, key = randomUUID(), cookie = guestCookie) {
  return fetch(`${app.baseUrl}/api/bookings/rides`, { method: 'POST', headers: { ...browserHeaders(app, ip), Cookie: cookie, 'Idempotency-Key': key }, body: JSON.stringify(body) });
}

describe('point-to-point rides', () => {
  test('round-trip requests persist return dates and reject missing return details', async () => {
    const details = { ...rideDetails(), tripType: 'round_trip', returnDate: '2099-10-21', returnTime: '10:30' };
    const response = await submitRide({ details, callbackPhone: '+94 771234567' });
    assert.equal(response.status, 201);
    const ride: BookingRecord = await response.json();
    assert.equal(ride.details.returnDate, '2099-10-21'); assert.equal(ride.details.returnTime, '10:30');
    assert.ok((await pool.query('select return_at from public.bookings where id=$1', [ride.id])).rows[0].return_at);
    assert.equal((await submitRide({ details: { ...details, returnDate: null }, callbackPhone: '+94 771234567' })).status, 400);
  });
  test('manual drop-off creates a pending ride and preserves admin contact/follow-up', async () => {
    const response = await submitRide(); assert.equal(response.status, 201);
    const ride: BookingRecord = await response.json();
    assert.equal(ride.status, 'pending'); assert.equal(ride.destinationName, 'Galle'); assert.equal(ride.details.kind, 'ride');
    assert.equal(ride.details.contactPhone, '+94 771234567'); assert.equal(ride.details.contactEmail, '');
    assert.equal((await pool.query('select destination_id from public.bookings where id = $1', [ride.id])).rows[0].destination_id, null);
    const admin = await fetch(`${app.baseUrl}/api/admin/bookings/${ride.id}`, { headers: withSession(adminToken) });
    assert.equal(admin.status, 200); assert.equal((await admin.json()).destinationName, 'Galle');
  });
  test('guests cannot submit without a reachable callback mechanism or spoof account identity', async () => {
    assert.equal((await submitRide({ details: rideDetails() })).status, 400);
    assert.equal((await submitRide({ details: rideDetails(), callbackPhone: '.....' })).status, 400);
    assert.equal((await submitRide({ details: rideDetails(), customerUserId: randomUUID(), callbackPhone: '+94 771234567' })).status, 400);
    assert.equal(await count('bookings'), 0);
  });
  test('authenticated identity comes from the server session, not ride inputs', async () => {
    const cookie = `${guestCookie}; ${withSession(adminToken).Cookie}`;
    const account = await fetch(`${app.baseUrl}/api/bookings/rides/account`, { headers: { Cookie: cookie } });
    assert.equal((await account.json()).signedIn, true);
    const response = await submitRide({ details: rideDetails() }, randomUUID(), cookie); assert.equal(response.status, 201);
    const ride: BookingRecord = await response.json();
    assert.equal(ride.details.contactEmail, 'admin@example.test'); assert.ok(ride.details.customerUserId);
    assert.equal(ride.details.contactPhone, '');
  });
  test('rides retain idempotency, reject changed retries, and remain private to their browser', async () => {
    const key = randomUUID(); const body = { details: rideDetails(), callbackPhone: '+94 771234567' };
    const first: BookingRecord = await (await submitRide(body, key)).json();
    const replay = await submitRide(body, key); assert.equal(replay.status, 200); assert.equal((await replay.json()).id, first.id);
    assert.equal((await submitRide({ ...body, details: { ...body.details, passengers: 3 } }, key)).status, 409);
    const otherCookie = cookieOf(await newGuest());
    assert.equal((await fetch(`${app.baseUrl}/api/bookings/${first.id}`, { headers: { Cookie: otherCookie } })).status, 404);
    assert.equal(await count('bookings'), 1);
  });
  test('capacity and canonical catalogue location checks apply to rides too', async () => {
    assert.equal((await submitRide({ details: { ...rideDetails(), passengers: 4 }, callbackPhone: '+94 771234567' })).status, 400);
    const { rows } = await pool.query('select id, name, latitude, longitude from public.destinations where id = $1', ['galle']);
    const d = rows[0];
    const dropoff = { ...blankLocation('Fake catalogue label'), source: 'destination', destinationId: d.id, lat: 0, lng: 0 };
    const result = await submitRide({ details: { ...rideDetails(), dropoff }, callbackPhone: '+94 771234567' });
    assert.equal(result.status, 201); const record: BookingRecord = await result.json();
    assert.equal(record.details.dropoff?.label, d.name); assert.equal(record.details.dropoff?.lat, d.latitude);
    assert.equal((await submitRide({ details: { ...rideDetails(), pickup: blankLocation(d.name), dropoff }, callbackPhone: '+94 771234567' })).status, 400);
  });
});

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  await resetContent();
  await resetAuthTables();
  await createUser();
  app = await listen(createApp({ media: null, notifier: { newInquiry() {} }, bookings: true }));
  off = await listen(createApp({ media: null, notifier: { newInquiry() {} }, bookings: false }));
  adminToken = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  assert.ok(adminToken);
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await pool.query('truncate public.booking_notifications, public.booking_history, public.bookings, public.booking_attempts');
  await pool.query(
    `insert into public.booking_vehicles (id, name, type, passenger_capacity, accepting_requests)
     values ('test-car', 'Test-only car', 'Car', 3, true)
     on conflict (id) do update set passenger_capacity = 3, accepting_requests = true`
  );
  ip = `203.0.113.${(ipCounter += 1)}`;
  const res = await newGuest();
  assert.equal(res.status, 200);
  guestCookie = cookieOf(res);
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await off?.close();
  await pool.end();
}, HOOK_TIMEOUT);

describe('bookings switched off (the default)', () => {
  test('every booking route is a JSON 404, for guests and staff', async () => {
    const admin = { ...browserHeaders(off), ...withSession(adminToken) };
    const calls: [string, string, Record<string, string>][] = [
      ['POST', '/api/bookings/session', browserHeaders(off)],
      ['GET', '/api/bookings/catalog', {}],
      ['POST', '/api/bookings', { ...browserHeaders(off), 'Idempotency-Key': randomUUID() }],
      ['GET', '/api/bookings', {}],
      ['GET', `/api/bookings/${randomUUID()}`, {}],
      ['PATCH', `/api/bookings/${randomUUID()}`, browserHeaders(off)],
      ['POST', `/api/bookings/${randomUUID()}/cancel`, browserHeaders(off)],
      ['GET', '/api/admin/bookings', admin],
      ['PATCH', `/api/admin/bookings/${randomUUID()}`, admin],
      ['GET', '/api/admin/booking-vehicles', admin],
      ['PUT', '/api/admin/booking-vehicles/car', admin]
    ];
    for (const [method, path, headers] of calls) {
      const res = await fetch(`${off.baseUrl}${path}`, { method, headers, body: method === 'GET' ? undefined : '{}' });
      assert.equal(res.status, 404, `${method} ${path}`);
      assert.equal((await res.json()).error.code, 'not_found', `${method} ${path}`);
      assert.equal(res.headers.getSetCookie().length, 0, `${method} ${path}: no cookie`);
    }
    assert.equal(await count('booking_attempts'), 1, "only this test's own guest session (on) was counted");
  });

  test('/api/content says so', async () => {
    assert.deepEqual((await (await fetch(`${off.baseUrl}/api/content`)).json()).features, { bookings: false });
    assert.deepEqual((await (await fetch(`${app.baseUrl}/api/content`)).json()).features, { bookings: true });
  });
});

describe('bookings switched on', () => {
  test('the guest cookie: __Host-, HttpOnly, Secure, SameSite=Strict, Path=/, no Domain, 30 days', async () => {
    const cookie = (await newGuest()).headers.getSetCookie()[0];
    assert.ok(cookie.startsWith(`${BOOKING_COOKIE}=`) && BOOKING_COOKIE.startsWith('__Host-'), cookie);
    for (const part of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=2592000']) assert.ok(cookie.includes(part), `${part} in ${cookie}`);
    assert.doesNotMatch(cookie, /Domain=/i);
    assert.match(cookieOf(await newGuest()), new RegExp(`^${BOOKING_COOKIE}=[A-Za-z0-9_-]{43}$`));
  });

  test('a one-way request is stored pending, with a reference, and no token or hash in the reply', async () => {
    const res = await submit();
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const b = await res.json();
    assert.equal(b.status, 'pending');
    assert.match(b.reference, /^TE-[A-F0-9]{20}$/);
    assert.equal(b.guest_hash, undefined);
    assert.equal(b.history[0].status, 'pending');
    const stored = await pool.query('select status, guest_hash from public.bookings where id = $1', [b.id]);
    assert.equal(stored.rows[0].status, 'pending');
    assert.equal(stored.rows[0].guest_hash.length, 64);
    assert.ok(!stored.rows[0].guest_hash.includes(guestCookie.split('=')[1]), 'the hash, not the token');
  });

  test('a round trip keeps its stops in order and its return', async () => {
    const res = await submit({
      ...valid(),
      tripType: 'round_trip',
      returnDate: '2099-10-21',
      returnTime: '10:00',
      stops: [blankLocation('First test stop'), blankLocation('Second test stop')]
    });
    assert.equal(res.status, 201);
    const b = await res.json();
    assert.deepEqual(b.details.stops.map((s: { label: string }) => s.label), ['First test stop', 'Second test stop']);
    assert.equal(b.details.returnTime, '10:00');
  });

  test('an unknown destination and too many passengers are refused, and nothing is stored', async () => {
    assert.equal((await submit({ ...valid(), destinationId: 'missing-destination' })).status, 400);
    assert.equal((await submit({ ...valid(), passengers: 4 })).status, 400);
    assert.equal(await count('bookings'), 0);
  });

  test('typed coordinates are dropped; a destination stop takes the database name and place', async () => {
    const res = await submit({
      ...valid(),
      stops: [
        { ...blankLocation('Somewhere typed'), lat: null, lng: null },
        { ...blankLocation('Wrong name'), source: 'destination', destinationId: 'ella', lat: 0, lng: 0 }
      ]
    });
    assert.equal(res.status, 201);
    const [typed, ella] = (await res.json()).details.stops;
    assert.equal(typed.lat, null);
    const row = (await pool.query('select name, latitude from public.destinations where id = $1', ['ella'])).rows[0];
    assert.equal(ella.label, row.name);
    assert.equal(ella.lat, row.latitude);
  });

  test('two submissions with one retry key, at once, make one request; a different body with that key is a 409', async () => {
    const key = randomUUID();
    const replies = await Promise.all([submit(valid(), key), submit(valid(), key)]);
    assert.deepEqual(replies.map((r) => r.status).sort(), [200, 201]);
    const [a, b] = await Promise.all(replies.map((r) => r.json()));
    assert.equal(a.id, b.id);
    assert.equal(await count('bookings'), 1);
    assert.equal((await submit({ ...valid(), notes: 'changed' }, key)).status, 409);
  });

  test("a guest sees only their own; no cookie is a 401; a guest can't use the staff routes", async () => {
    const b: BookingRecord = await (await submit()).json();
    assert.equal((await fetch(`${app.baseUrl}/api/bookings/${b.id}`)).status, 401);
    const other = cookieOf(await newGuest());
    assert.equal((await fetch(`${app.baseUrl}/api/bookings/${b.id}`, { headers: { Cookie: other } })).status, 404);
    assert.deepEqual((await (await fetch(`${app.baseUrl}/api/bookings`, { headers: { Cookie: other } })).json()).bookings, []);
    assert.equal((await fetch(`${app.baseUrl}/api/admin/bookings`, { headers: { Cookie: guestCookie } })).status, 401);
    const spoof = await fetch(`${app.baseUrl}/api/admin/bookings/${b.id}`, {
      method: 'PATCH',
      headers: { ...browserHeaders(app), Cookie: guestCookie },
      body: JSON.stringify({ version: 1, status: 'confirmed' })
    });
    assert.equal(spoof.status, 401);
  });

  test('a guest edits a pending request once per version, then cancels it; a cancelled one is final', async () => {
    const b: BookingRecord = await (await submit()).json();
    const path = `${app.baseUrl}/api/bookings/${b.id}`;
    const headers = { ...browserHeaders(app, ip), Cookie: guestCookie };
    const edit = await fetch(path, { method: 'PATCH', headers, body: JSON.stringify({ version: 1, details: { ...valid(), notes: 'Updated' } }) });
    assert.equal(edit.status, 200);
    assert.equal((await fetch(path, { method: 'PATCH', headers, body: JSON.stringify({ version: 1, details: valid() }) })).status, 409, 'stale');
    const cancelled = await fetch(`${path}/cancel`, { method: 'POST', headers, body: JSON.stringify({ version: 2, status: 'cancelled' }) });
    assert.equal(cancelled.status, 200);
    assert.equal((await cancelled.json()).status, 'cancelled');
    assert.equal((await fetch(path, { method: 'PATCH', headers, body: JSON.stringify({ version: 3, details: valid() }) })).status, 409);
  });

  test("staff confirm; a guest can't set a status or a price", async () => {
    assert.equal((await submit({ ...valid(), status: 'confirmed' })).status, 400);
    assert.equal((await submit({ ...valid(), price: 1 })).status, 400);
    const b: BookingRecord = await (await submit()).json();
    const res = await fetch(`${app.baseUrl}/api/admin/bookings/${b.id}`, {
      method: 'PATCH',
      headers: { ...browserHeaders(app), ...withSession(adminToken) },
      body: JSON.stringify({ version: 1, status: 'confirmed' })
    });
    assert.equal(res.status, 200);
    const confirmed = await res.json();
    assert.equal(confirmed.status, 'confirmed');
    assert.equal(confirmed.history.at(-1).status, 'confirmed');
  });

  test('a cross-origin write is refused (sameOrigin)', async () => {
    const res = await fetch(`${app.baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guestCookie, 'Idempotency-Key': randomUUID(), Origin: 'https://evil.example' },
      body: JSON.stringify(valid())
    });
    assert.equal(res.status, 403);
    assert.equal((await fetch(`${app.baseUrl}/api/bookings/session`, { method: 'POST', headers: { Origin: 'https://evil.example' } })).status, 403);
  });

  test('rate limits: 5 new requests per IP in 15 minutes, refused ones included', async () => {
    for (let i = 0; i < 4; i++) assert.equal((await submit()).status, 201);
    assert.equal((await submit({ ...valid(), destinationId: 'missing-destination' })).status, 400, 'refused, but counted');
    const limited = await submit();
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '900');
    assert.equal(await count('bookings'), 4);
  });

  test('rate limits: 20 sessions, and 20 edits or cancellations, per IP in 15 minutes', async () => {
    for (let i = 0; i < 19; i++) assert.equal((await newGuest()).status, 200, `session ${i + 2}`);
    assert.equal((await newGuest()).status, 429);

    const b: BookingRecord = await (await submit()).json();
    const headers = { ...browserHeaders(app, ip), Cookie: guestCookie };
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`${app.baseUrl}/api/bookings/${b.id}`, { method: 'PATCH', headers, body: JSON.stringify({ version: 99, details: valid() }) });
      assert.equal(res.status, 409, `edit ${i + 1}`);
    }
    const limited = await fetch(`${app.baseUrl}/api/bookings/${b.id}/cancel`, { method: 'POST', headers, body: JSON.stringify({ version: 1, status: 'cancelled' }) });
    assert.equal(limited.status, 429);
  });

  test('the catalogue: published destinations and tours, and the vehicles; staff must enter a capacity first', async () => {
    await pool.query("update public.destinations set published = false where id = 'galle'");
    let c;
    try {
      c = await (await fetch(`${app.baseUrl}/api/bookings/catalog`)).json();
    } finally {
      await pool.query("update public.destinations set published = true where id = 'galle'");
    }
    assert.ok(c.destinations.some((d: { id: string }) => d.id === 'sigiriya'));
    assert.ok(!c.destinations.some((d: { id: string }) => d.id === 'galle'), 'not an unpublished one');
    const bad = await fetch(`${app.baseUrl}/api/admin/booking-vehicles/car`, {
      method: 'PUT',
      headers: { ...browserHeaders(app), ...withSession(adminToken) },
      body: JSON.stringify({ id: 'car', name: 'Car', type: 'Car', passengerCapacity: null, luggageCapacity: null, acceptingRequests: true })
    });
    assert.equal(bad.status, 400);
  });

  test('a database failure is a generic 500, never a success', async () => {
    const m = mock.method(pool, 'connect', async () => {
      throw new Error('mock connection unavailable');
    });
    try {
      const res = await submit();
      assert.equal(res.status, 500);
      assert.equal((await res.json()).error.code, 'internal');
    } finally {
      m.mock.restore();
    }
  });

  test('a tour picks its own itinerary, and its last destination must be the destination', async () => {
    const c = await (await fetch(`${app.baseUrl}/api/bookings/catalog`)).json();
    const tour = c.tours.find((t: { stops: { destinationId: string | null }[] }) => t.stops.at(-1)?.destinationId);
    assert.ok(tour);
    const destinationId = tour.stops.at(-1).destinationId;
    const b: BookingRecord = await (await submit({ ...valid(), tourId: tour.id, destinationId })).json();
    assert.equal(b.tourName, tour.title);
    assert.equal(b.tourStops.length, tour.stops.length);
    const other = c.destinations.find((d: { id: string }) => d.id !== destinationId);
    assert.equal((await submit({ ...valid(), tourId: tour.id, destinationId: other.id })).status, 400);
  });

  test('the email outbox: a failure is recorded and retried; the email has no places in it', async () => {
    const b: BookingRecord = await (await submit()).json();
    const eventId = randomUUID();
    await pool.query('insert into public.booking_notifications (id, booking_id, event) values ($1, $2, $3)', [eventId, b.id, '1:pending']);
    const config = { resendApiKey: 'test-only-key', to: 'staff@example.test', from: 'test@example.test', siteUrl: null };
    let calls = 0;
    await dispatchBookingNotifications(config, async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.ok(!body.text.includes(b.details.pickup.label));
      assert.equal(body.subject, `${BRAND.name} booking pending`, 'the brand from shared/brand.ts');
      assert.equal(body.from, `${BRAND.name} <test@example.test>`, "the brand's name before the address");
      assert.equal((init?.headers as Record<string, string>)['Idempotency-Key'], eventId);
      return new Response('', { status: 503 });
    });
    assert.equal(calls, 1);
    assert.equal((await pool.query('select status from public.booking_notifications where id = $1', [eventId])).rows[0].status, 'failed');
    await pool.query('update public.booking_notifications set next_attempt_at = now() where id = $1', [eventId]);
    await dispatchBookingNotifications(config, async () => new Response('{}', { status: 200 }));
    assert.equal((await pool.query('select status from public.booking_notifications where id = $1', [eventId])).rows[0].status, 'sent');

    // A name saved in Admin → Settings: the next email's subject and sender name; the address stays.
    await pool.query("update public.site_settings set brand_name = 'Lagoon & Hills Journeys' where id");
    try {
      await pool.query('insert into public.booking_notifications (id, booking_id, event) values ($1, $2, $3)', [randomUUID(), b.id, '2:confirmed']);
      const sent: { subject: string; from: string }[] = [];
      await dispatchBookingNotifications({ ...config, from: 'Old Name <test@example.test>' }, async (_url, init) => {
        sent.push(JSON.parse(String(init?.body)));
        return new Response('{}', { status: 200 });
      });
      assert.equal(sent[0]?.subject, 'Lagoon & Hills Journeys booking confirmed');
      assert.equal(sent[0]?.from, '"Lagoon & Hills Journeys" <test@example.test>');
    } finally {
      await pool.query('update public.site_settings set brand_name = null where id');
    }
  });

  test('nothing about a request reaches the logs, even when it fails', async () => {
    const lines: string[] = [];
    const capture = (...args: unknown[]) => void lines.push(args.map(String).join(' '));
    const mocks = (['log', 'error', 'warn', 'info'] as const).map((k) => mock.method(console, k, capture));
    try {
      const secret = { ...valid(), contactName: 'Zz Unique Name', contactEmail: 'zz-unique@example.test', notes: 'zz unique note' };
      await submit(secret);
      await submit({ ...secret, passengers: 4 });
      const m = mock.method(pool, 'connect', async () => {
        throw new Error('mock connection unavailable');
      });
      try {
        await submit(secret);
      } finally {
        m.mock.restore();
      }
    } finally {
      for (const m of mocks) m.mock.restore();
    }
    const all = lines.join('\n');
    for (const value of ['Zz Unique Name', 'zz-unique@example.test', 'zz unique note', 'Test pickup address', ip]) {
      assert.ok(!all.includes(value), `${value} in the logs`);
    }
  });

  test('the sweep: rate counts after 24 hours, ended requests after 12 months; open ones stay', async () => {
    const { runSweep } = await import('../src/auth/sweep');
    const old: BookingRecord = await (await submit()).json();
    const open: BookingRecord = await (await submit()).json();
    await pool.query("update public.bookings set status = 'cancelled', updated_at = now() - interval '13 months' where id = $1", [old.id]);
    await pool.query("update public.bookings set updated_at = now() - interval '2 years' where id = $1", [open.id]);
    await pool.query("update public.booking_attempts set window_started = now() - interval '25 hours'");
    const result = await runSweep();
    assert.equal(result.endedBookings, 1);
    assert.ok(result.bookingAttempts >= 1);
    assert.deepEqual((await pool.query('select id from public.bookings')).rows.map((r) => r.id), [open.id]);
    assert.equal(await count('booking_history'), 1, "the ended request's history went with it");
  });
});
