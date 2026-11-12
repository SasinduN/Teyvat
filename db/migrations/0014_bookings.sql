-- =============================================================================
-- booking requests
-- =============================================================================
-- The friend import's bookings (docs/reviews/friend-import.md; his
-- 0011_bookings.sql, renumbered: 0011 is image_credits here). Requests,
-- not reservations: each one starts `pending` and staff confirm it by hand.
-- The site only offers them while BOOKINGS_ENABLED is true; with it off the
-- tables sit empty.
--
--   booking_vehicles       categories with their real capacities, set by staff;
--                          the one seeded "Car" is off until staff enter one
--   bookings               one request: a guest token's SHA-256 (never the
--                          token), its retry key, the trip, contact details
--   booking_history        status changes and edits, with who made them
--   booking_attempts       rate limits per IP and action, kept 24 hours
--   booking_notifications  the email outbox, retried by the hourly sweep
--
-- Retention (server/src/auth/sweep.ts, for the privacy policy): requests
-- that ended (completed, declined, cancelled) go 12 months after their last
-- change, with their history and outbox; pending and confirmed ones stay
-- until staff close them.
--
-- Undo (only before any real request matters; it deletes them all):
--   begin;
--   drop table if exists public.booking_notifications, public.booking_history,
--     public.booking_attempts, public.bookings, public.booking_vehicles;
--   delete from public.schema_migrations where filename = '0014_bookings.sql';
--   commit;
-- Nothing else depends on these tables. Take a backup first.
--
-- Idempotent: re-running it is a no-op.
-- =============================================================================

begin;

create table if not exists public.booking_vehicles (
  id                 text primary key check (id ~ '^[a-z0-9-]+$' and length(id) <= 100),
  name               text not null check (length(btrim(name)) between 1 and 80),
  type               text not null check (type in ('Car', 'SUV', 'Van', 'Minibus')),
  passenger_capacity integer check (passenger_capacity between 1 and 100),
  luggage_capacity   integer check (luggage_capacity between 0 and 100),
  accepting_requests boolean not null default false,
  -- A category can't take requests until staff have entered its real capacity.
  check (not accepting_requests or passenger_capacity is not null)
);

-- The owner approved cars; their capacity, prices and availability aren't known yet.
insert into public.booking_vehicles (id, name, type) values ('car', 'Car', 'Car')
  on conflict (id) do nothing;

create table if not exists public.bookings (
  id               uuid primary key,
  reference        text not null unique,
  guest_hash       text not null check (length(guest_hash) = 64),
  guest_expires_at timestamptz not null,
  idempotency_key  uuid not null,
  request_hash     text not null,
  tour_id          text references public.tours (id) on delete restrict,
  destination_id   text not null references public.destinations (id) on delete restrict,
  vehicle_id       text not null references public.booking_vehicles (id) on delete restrict,
  passengers       integer not null check (passengers between 1 and 100),
  departure_at     timestamptz not null,
  return_at        timestamptz,
  details          jsonb not null check (jsonb_typeof(details) = 'object'),
  status           text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  version          integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (guest_hash, idempotency_key),
  check (return_at is null or return_at > departure_at)
);
create index if not exists bookings_guest_idx on public.bookings (guest_hash, created_at desc);
create index if not exists bookings_status_idx on public.bookings (status, created_at desc);

create table if not exists public.booking_history (
  id         bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  status     text not null check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  action     text not null check (action in ('created', 'edited', 'status_changed')),
  actor      text not null,
  created_at timestamptz not null default now()
);
create index if not exists booking_history_booking_idx on public.booking_history (booking_id, id);

create table if not exists public.booking_attempts (
  ip             inet not null,
  action         text not null check (action in ('session', 'create', 'change')),
  attempts       integer not null default 1,
  window_started timestamptz not null default now(),
  primary key (ip, action)
);

create table if not exists public.booking_notifications (
  id              uuid primary key,
  booking_id      uuid not null references public.bookings (id) on delete cascade,
  event           text not null,
  status          text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (booking_id, event)
);

commit;
