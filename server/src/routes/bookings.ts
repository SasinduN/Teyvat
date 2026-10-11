/**
 * Booking requests (the friend import; docs/BOOKING_API.md,
 * docs/BOOKING_SECURITY.md). Every route is a JSON 404 unless bookings are on
 * (`BOOKINGS_ENABLED`, `createApp({ bookings })`).
 *
 * A guest is a browser: `POST /api/bookings/session` sets a random 256-bit
 * token in an HttpOnly `__Host-` cookie, and the database keeps only its
 * SHA-256. A guest sees and changes only its own requests, for 30 days; a
 * reference alone grants nothing. Staff use the admin session as everywhere
 * else.
 *
 * Writes are behind `sameOrigin` (app.ts) and limited per IP: 20 sessions,
 * 5 new requests and 20 edits or cancellations each 15 minutes. New requests
 * carry an `Idempotency-Key`, so a retry after a lost response returns the
 * same request instead of a second one. Edits and status changes carry the
 * version they read; a stale one is a 409.
 *
 * Nothing here logs a request's contents.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Router, type Request } from 'express';
import type { PoolClient } from 'pg';

import {
  BOOKING_STATUSES,
  bookingDataSchema,
  bookingSchema,
  canTransition,
  checkCapacity,
  tripInstant,
  vehicleSchema,
  type BookingCatalog,
  type BookingInput,
  type BookingDetails,
  type BookingLocation,
  type BookingRecord,
  type BookingStatus,
  type BookingVehicle
} from '../../../shared/booking';
import { rideSchema, rideRequestDataSchema } from '../../../shared/ride';
import type { BookingRow } from '../../../shared/database.types';
import { z } from '../../../shared/zod';
import { readCookie, SESSION_COOKIE } from '../auth/cookies';
import { findSession } from '../auth/sessions';
import { requireAdmin, sessionOf } from '../auth/middleware';
import { dispatchBookingNotifications } from '../bookings/notifications';
import { pool } from '../db';
import { notifyConfig } from '../env';
import { ApiError, asyncRoute, clientIp, sendError } from '../http';

export const BOOKING_COOKIE = '__Host-teyvat_booking';
const GUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** Per IP, per 15 minutes. */
const LIMITS = { session: 20, create: 5, change: 20 } as const;
type LimitedAction = keyof typeof LIMITS;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** The guest's token hash, or 401. */
function guest(req: Request): string {
  const token = readCookie(req, BOOKING_COOKIE);
  if (!token || !TOKEN.test(token)) throw new ApiError('unauthorized', 'Start a booking session to continue.');
  return sha256(token);
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) fields[issue.path.join('.')] ??= issue.message;
    throw new ApiError('bad_request', Object.values(fields)[0] ?? 'Check your request.', fields);
  }
  return result.data;
}

/** Counts one `action` from `ip` (atomically) and says whether it is over the limit. */
async function overLimit(db: PoolClient | typeof pool, ip: string, action: LimitedAction): Promise<boolean> {
  const { rows } = await db.query<{ attempts: number }>(
    `insert into public.booking_attempts (ip, action) values ($1, $2)
       on conflict (ip, action) do update set
         attempts = case when booking_attempts.window_started < now() - interval '15 minutes' then 1
                         else booking_attempts.attempts + 1 end,
         window_started = case when booking_attempts.window_started < now() - interval '15 minutes' then now()
                               else booking_attempts.window_started end
     returning attempts`,
    [ip, action]
  );
  return rows[0].attempts > LIMITS[action];
}

async function limit(req: Request, action: LimitedAction): Promise<void> {
  if (await overLimit(pool, clientIp(req), action)) {
    throw new ApiError('too_many_requests', 'Too many booking requests. Try again in 15 minutes.');
  }
}

const uuid = z.string().uuid();
const VEHICLE_SQL = `select id, name, type, passenger_capacity as "passengerCapacity",
  luggage_capacity as "luggageCapacity", accepting_requests as "acceptingRequests"
  from public.booking_vehicles`;
/** A tour's route as booking locations: a published destination's own name and place, else the stop's. */
const TOUR_STOPS_SQL = `select coalesce(d.name, s.name) as label, coalesce(d.latitude, s.lat) as lat,
  coalesce(d.longitude, s.lng) as lng,
  case when d.published then d.id else null end as "destinationId", '' as address,
  case when d.published then 'destination' else 'manual' end as source, null as accuracy
  from public.tour_stops s left join public.destinations d on d.id = s.destination_id
  where s.tour_id = $1 order by s.position`;

/**
 * The request checked against the database, under share locks: a published
 * destination and tour (the tour's last stop must be the destination), a
 * category that takes requests and has room. A catalogue point's name and
 * place come from the database; a typed one keeps no coordinates.
 */
async function validated(client: PoolClient, raw: BookingDetails): Promise<BookingDetails> {
  const input = raw.kind === 'ride' ? raw : parse(bookingSchema, raw);
  if (raw.kind === 'ride') parse(rideSchema, {
    pickup: raw.pickup, dropoff: raw.dropoff, tripType: raw.tripType,
    departureDate: raw.departureDate, departureTime: raw.departureTime,
    returnDate: raw.returnDate, returnTime: raw.returnTime, passengers: raw.passengers, vehicleId: raw.vehicleId
  });
  if (input.destinationId || raw.kind !== 'ride') {
    const dest = await client.query('select id from public.destinations where id = $1 and published for share', [input.destinationId]);
    if (!dest.rowCount) throw new ApiError('bad_request', 'Select a published destination.', { destinationId: 'Invalid destination.' });
  }
  if (input.tourId) {
    const tour = await client.query('select id from public.tours where id = $1 and published for share', [input.tourId]);
    if (!tour.rowCount) throw new ApiError('bad_request', 'The selected tour is unavailable.');
    const last = await client.query<{ destination_id: string | null }>(
      'select destination_id from public.tour_stops where tour_id = $1 order by position desc limit 1',
      [input.tourId]
    );
    const finalId = last.rows[0]?.destination_id;
    if (finalId && finalId !== input.destinationId) {
      throw new ApiError('bad_request', 'The destination must match the selected tour itinerary.');
    }
  }
  const vehicle = await client.query<BookingVehicle>(`${VEHICLE_SQL} where id = $1 for share`, [input.vehicleId]);
  if (!vehicle.rows[0]) throw new ApiError('bad_request', 'Select a supported vehicle.');
  const capacity = checkCapacity(vehicle.rows[0], input.passengers);
  if (capacity) throw new ApiError('bad_request', capacity, { passengers: capacity });

  for (const point of [input.pickup, raw.dropoff, ...input.stops, input.returnPickup, input.returnDropoff]) {
    if (!point) continue;
    if (point.source === 'destination' && point.destinationId) {
      const d = await client.query<{ name: string; latitude: number; longitude: number }>(
        'select name, latitude, longitude from public.destinations where id = $1 and published for share',
        [point.destinationId]
      );
      if (!d.rows[0]) throw new ApiError('bad_request', 'A selected stop is no longer available.');
      Object.assign(point, { label: d.rows[0].name, lat: d.rows[0].latitude, lng: d.rows[0].longitude, accuracy: null });
    } else if (point.source === 'manual') {
      Object.assign(point, { lat: null, lng: null, accuracy: null });
    }
  }
  if (raw.kind === 'ride') parse(rideSchema, {
    pickup: raw.pickup, dropoff: raw.dropoff, tripType: raw.tripType,
    departureDate: raw.departureDate, departureTime: raw.departureTime,
    returnDate: raw.returnDate, returnTime: raw.returnTime, passengers: raw.passengers, vehicleId: raw.vehicleId
  });
  return input;
}

/** One request with its names, vehicle, route, history and notifications; a guest's only if it is theirs. */
async function record(client: PoolClient, id: string, guestHash?: string, lock = false): Promise<BookingRecord> {
  const result = await client.query<BookingRow & { tour_name: string | null; destination_name: string }>(
    `select b.*, t.title as tour_name, coalesce(d.name, b.details->'dropoff'->>'label') as destination_name
       from public.bookings b
       left join public.tours t on t.id = b.tour_id
       left join public.destinations d on d.id = b.destination_id
      where b.id = $1 ${guestHash ? 'and b.guest_hash = $2 and b.guest_expires_at > now()' : ''}
      ${lock ? 'for update of b' : ''}`,
    guestHash ? [id, guestHash] : [id]
  );
  const b = result.rows[0];
  if (!b) throw new ApiError('not_found', 'Booking not found.');
  const vehicle = await client.query<BookingVehicle>(`${VEHICLE_SQL} where id = $1 for share`, [b.vehicle_id]);
  const history = await client.query('select status, action, created_at as at from public.booking_history where booking_id = $1 order by id', [id]);
  const notifications = await client.query('select status, event from public.booking_notifications where booking_id = $1 order by created_at', [id]);
  const stops = b.tour_id ? (await client.query<BookingLocation>(TOUR_STOPS_SQL, [b.tour_id])).rows : [];
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    details: b.details,
    tourName: b.tour_name,
    destinationName: b.destination_name,
    vehicle: vehicle.rows[0],
    tourStops: stops,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    version: b.version,
    history: history.rows,
    notifications: notifications.rows
  };
}

/** The history line, and an email to send when notifications are on (not for edits). */
async function event(client: PoolClient, id: string, status: BookingStatus, action: string, actor: string, version: number): Promise<void> {
  await client.query('insert into public.booking_history (booking_id, status, action, actor) values ($1, $2, $3, $4)', [id, status, action, actor]);
  if (notifyConfig && action !== 'edited') {
    await client.query(
      'insert into public.booking_notifications (id, booking_id, event) values ($1, $2, $3) on conflict do nothing',
      [randomUUID(), id, `${version}:${status}`]
    );
  }
}

const instants = (d: BookingInput) => [
  new Date(tripInstant(d.departureDate, d.departureTime)),
  d.returnDate && d.returnTime ? new Date(tripInstant(d.returnDate, d.returnTime)) : null
];

export const bookingsRouter = Router();
const BOOKING_PATHS = ['/bookings', '/admin/bookings', '/admin/booking-vehicles'];

// Off: as if the routes didn't exist.
bookingsRouter.use(BOOKING_PATHS, (req, res, next) => {
  if (req.app.locals.bookings !== true) {
    sendError(res, 'not_found', 'No such endpoint.');
    return;
  }
  res.set('Cache-Control', 'no-store');
  next();
});

bookingsRouter.post(
  '/bookings/session',
  asyncRoute(async (req, res) => {
    await limit(req, 'session');
    const existing = readCookie(req, BOOKING_COOKIE);
    const token = existing && TOKEN.test(existing) ? existing : randomBytes(32).toString('base64url');
    res.cookie(BOOKING_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: GUEST_TTL_MS });
    res.json({ ok: true });
  })
);

bookingsRouter.get(
  '/bookings/rides/account',
  asyncRoute(async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    const account = token ? await findSession(token) : null;
    res.json({ signedIn: Boolean(account), email: account?.user.email ?? null });
  })
);

bookingsRouter.get(
  '/bookings/catalog',
  asyncRoute(async (_req, res) => {
    const destinations = (await pool.query('select id, name, latitude, longitude from public.destinations where published order by name')).rows;
    const tours = (await pool.query<{ id: string; title: string }>('select id, title from public.tours where published order by sort_order, id')).rows;
    const withStops = [];
    for (const t of tours) withStops.push({ ...t, stops: (await pool.query<BookingLocation>(TOUR_STOPS_SQL, [t.id])).rows });
    const vehicles = (await pool.query<BookingVehicle>(`${VEHICLE_SQL} order by name`)).rows;
    const catalog: BookingCatalog = { destinations, tours: withStops, vehicles, notificationsConfigured: Boolean(notifyConfig) };
    res.json(catalog);
  })
);

bookingsRouter.post(
  ['/bookings', '/bookings/rides'],
  asyncRoute(async (req, res) => {
    const guestHash = guest(req);
    const key = parse(uuid, req.get('Idempotency-Key'));
    let input: BookingDetails;
    if (req.path === '/bookings/rides') {
      const body = parse(rideRequestDataSchema, req.body);
      const token = readCookie(req, SESSION_COOKIE);
      const account = token ? await findSession(token) : null;
      if (!account && !body.callbackPhone) throw new ApiError('bad_request', 'Add a callback number so our team can respond.', { callbackPhone: 'Enter a callback phone number.' });
      input = {
        ...body.details, kind: 'ride', destinationId: body.details.dropoff.destinationId ?? '',
        tourId: null, stops: [], returnPickup: null, returnDropoff: null,
        contactName: account ? account.user.fullName?.trim() || account.user.email : 'Guest rider',
        contactEmail: account?.user.email ?? '', contactPhone: account ? '' : body.callbackPhone!,
        ...(account ? { customerUserId: account.user.id } : {}), notes: '', termsAccepted: true
      };
    } else input = parse(bookingDataSchema, req.body);
    const requestHash = sha256(JSON.stringify(input));
    const client = await pool.connect();
    let open = false;
    let counted = false;
    try {
      await client.query('begin');
      open = true;
      // Two tabs retrying the same key wait for each other.
      await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [guestHash + key]);
      const previous = await client.query<{ id: string; request_hash: string }>(
        'select id, request_hash from public.bookings where guest_hash = $1 and idempotency_key = $2 and guest_expires_at > now()',
        [guestHash, key]
      );
      if (previous.rows[0]) {
        if (previous.rows[0].request_hash !== requestHash) throw new ApiError('conflict', 'This retry key already belongs to a different request.');
        const replay = await record(client, previous.rows[0].id, guestHash);
        await client.query('commit');
        open = false;
        res.json(replay);
        return;
      }
      if (await overLimit(client, clientIp(req), 'create')) {
        await client.query('commit');
        open = false;
        res.set('Retry-After', '900');
        throw new ApiError('too_many_requests', 'Too many booking requests. Try again in 15 minutes.');
      }
      // The count stays even when the checks below refuse the request.
      await client.query('savepoint booking_work');
      counted = true;
      const details = await validated(client, input);
      const id = randomUUID();
      const reference = `TE-${randomBytes(10).toString('hex').toUpperCase()}`;
      const [departure, back] = instants(details);
      await client.query(
        `insert into public.bookings (id, reference, guest_hash, guest_expires_at, idempotency_key, request_hash,
           tour_id, destination_id, vehicle_id, passengers, departure_at, return_at, details)
         values ($1, $2, $3, now() + interval '30 days', $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, reference, guestHash, key, requestHash, details.tourId, details.destinationId || null, details.vehicleId,
          details.passengers, departure, back, JSON.stringify(details)]
      );
      await event(client, id, 'pending', 'created', details.customerUserId ?? 'guest', 1);
      const created = await record(client, id, guestHash);
      await client.query('commit');
      open = false;
      res.status(201).json(created);
      void dispatchBookingNotifications();
    } catch (error) {
      if (open) {
        if (counted && error instanceof ApiError) {
          await client.query('rollback to savepoint booking_work');
          await client.query('commit');
        } else {
          await client.query('rollback');
        }
      }
      throw error;
    } finally {
      client.release();
    }
  })
);

bookingsRouter.get(
  '/bookings',
  asyncRoute(async (req, res) => {
    const guestHash = guest(req);
    const client = await pool.connect();
    try {
      const ids = await client.query<{ id: string }>(
        'select id from public.bookings where guest_hash = $1 and guest_expires_at > now() order by created_at desc limit 100',
        [guestHash]
      );
      const bookings = [];
      for (const { id } of ids.rows) bookings.push(await record(client, id, guestHash));
      res.json({ bookings });
    } finally {
      client.release();
    }
  })
);

bookingsRouter.get(
  '/bookings/:id',
  asyncRoute(async (req, res) => {
    const id = parse(uuid, req.params.id);
    const guestHash = guest(req);
    const client = await pool.connect();
    try {
      res.json(await record(client, id, guestHash));
    } finally {
      client.release();
    }
  })
);

bookingsRouter.patch(
  '/bookings/:id',
  asyncRoute(async (req, res) => {
    const id = parse(uuid, req.params.id);
    const guestHash = guest(req);
    await limit(req, 'change');
    const body = parse(z.object({ version: z.number().int().positive(), details: bookingSchema }).strict(), req.body);
    const client = await pool.connect();
    try {
      await client.query('begin');
      const current = await record(client, id, guestHash, true);
      if (current.status !== 'pending' || current.version !== body.version) {
        throw new ApiError('conflict', 'Only current pending requests can be edited. Refresh the booking.');
      }
      const d = await validated(client, body.details);
      const [departure, back] = instants(d);
      await client.query(
        `update public.bookings set details = $2, tour_id = $3, destination_id = $4, vehicle_id = $5, passengers = $6,
           departure_at = $7, return_at = $8, version = version + 1, updated_at = now() where id = $1`,
        [id, JSON.stringify(d), d.tourId, d.destinationId, d.vehicleId, d.passengers, departure, back]
      );
      await event(client, id, 'pending', 'edited', 'guest', current.version + 1);
      const updated = await record(client, id, guestHash);
      await client.query('commit');
      res.json(updated);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  })
);

/** A status change: a guest may only cancel their own, before departure; staff follow the lifecycle. */
async function transition(req: Request, admin: boolean): Promise<BookingRecord> {
  const id = parse(uuid, req.params.id);
  const guestHash = admin ? undefined : guest(req);
  const body = parse(z.object({ version: z.number().int().positive(), status: z.enum(BOOKING_STATUSES) }).strict(), req.body);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const b = await record(client, id, guestHash, true);
    if (b.version !== body.version || !canTransition(b.status, body.status)) {
      throw new ApiError('conflict', 'This status change is not permitted. Refresh the booking.');
    }
    const departure = tripInstant(b.details.departureDate, b.details.departureTime);
    if (!admin && (body.status !== 'cancelled' || departure <= Date.now())) {
      throw new ApiError('conflict', 'Contact us to change a trip that has started.');
    }
    if (body.status === 'completed') {
      const end = tripInstant(b.details.returnDate ?? b.details.departureDate, b.details.returnTime ?? b.details.departureTime);
      if (end > Date.now()) throw new ApiError('conflict', 'A future trip cannot be completed.');
    }
    if (body.status === 'confirmed') {
      if (departure <= Date.now()) throw new ApiError('conflict', 'Departure is in the past.');
      const capacity = checkCapacity(b.vehicle, b.details.passengers);
      if (capacity) throw new ApiError('conflict', capacity);
    }
    await client.query('update public.bookings set status = $2, version = version + 1, updated_at = now() where id = $1', [id, body.status]);
    await event(client, id, body.status, 'status_changed', admin ? sessionOf(req).user.id : 'guest', b.version + 1);
    const updated = await record(client, id, guestHash);
    await client.query('commit');
    return updated;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

bookingsRouter.post(
  '/bookings/:id/cancel',
  asyncRoute(async (req, res) => {
    if (req.body?.status !== 'cancelled') throw new ApiError('bad_request', 'Cancellation status is required.');
    guest(req);
    await limit(req, 'change');
    res.json(await transition(req, false));
    void dispatchBookingNotifications();
  })
);

/* ----------------------------------------------------------------- staff */

bookingsRouter.use(['/admin/bookings', '/admin/booking-vehicles'], requireAdmin);

bookingsRouter.get(
  '/admin/bookings',
  asyncRoute(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    if (status && !(BOOKING_STATUSES as readonly string[]).includes(status)) throw new ApiError('bad_request', 'Unknown status.');
    const offset = parse(z.coerce.number().int().min(0).max(100_000), req.query.offset ?? 0);
    const client = await pool.connect();
    try {
      const ids = await client.query<{ id: string }>(
        "select id from public.bookings where ($1 = '' or status = $1) order by created_at desc limit 50 offset $2",
        [status, offset]
      );
      const bookings = [];
      for (const { id } of ids.rows) bookings.push(await record(client, id));
      res.json({ bookings, offset, nextOffset: ids.rows.length === 50 ? offset + 50 : null });
    } finally {
      client.release();
    }
  })
);

bookingsRouter.get(
  '/admin/bookings/:id',
  asyncRoute(async (req, res) => {
    const client = await pool.connect();
    try {
      res.json(await record(client, parse(uuid, req.params.id)));
    } finally {
      client.release();
    }
  })
);

bookingsRouter.patch(
  '/admin/bookings/:id',
  asyncRoute(async (req, res) => {
    res.json(await transition(req, true));
    void dispatchBookingNotifications();
  })
);

bookingsRouter.get(
  '/admin/booking-vehicles',
  asyncRoute(async (_req, res) => {
    res.json({ vehicles: (await pool.query(`${VEHICLE_SQL} order by name`)).rows });
  })
);

bookingsRouter.put(
  '/admin/booking-vehicles/:id',
  asyncRoute(async (req, res) => {
    const v = parse(vehicleSchema, req.body);
    if (v.id !== req.params.id) throw new ApiError('bad_request', 'Vehicle ID mismatch.');
    await pool.query(
      `insert into public.booking_vehicles (id, name, type, passenger_capacity, luggage_capacity, accepting_requests)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update set name = $2, type = $3, passenger_capacity = $4, luggage_capacity = $5, accepting_requests = $6`,
      [v.id, v.name, v.type, v.passengerCapacity, v.luggageCapacity, v.acceptingRequests]
    );
    res.json(v);
  })
);
