# Booking database

## Manual ride extension (2026-10-12)

Migration `0015_manual_rides.sql` makes `bookings.destination_id` nullable with a check requiring `details.kind='ride'` and a labeled drop-off for null IDs. Existing destination foreign keys remain. Rides reuse the pending status, guest ownership, contact storage and history; server-resolved authenticated IDs are stored in details. No tour/contact fields are deleted. Local development and isolated test migrations ran; production migration is not verified. Apply migrations before deploying the new request endpoint.

Migration `db/migrations/0014_bookings.sql` (his `0011_bookings.sql`,
renumbered: `0011` is `image_credits` here). Additive: it creates five tables
and changes nothing else. It runs with the other migrations on deploy, so
**merging the bookings PR runs it on production**: take a backup first.

| Table | What |
| --- | --- |
| `booking_vehicles` | Categories: name, type, real passenger and luggage capacities, whether they take requests (only with a capacity). One "Car" is seeded, off, with no capacity. |
| `bookings` | One request: a random reference, the guest token's SHA-256 and its expiry, the retry key and a hash of the body, the tour, destination and category (foreign keys, `restrict`), passengers, departure and return, the details as JSON, the status, a version. |
| `booking_history` | Created, edited and status changes, with the status, the actor (`guest` or a staff user's id) and the time. |
| `booking_attempts` | Rate limits: per IP and action (`session`, `create`, `change`), a count and its window. Never joined to a request. |
| `booking_notifications` | The email outbox: one row per request and status, its delivery state and retries. |

A destination, tour or category a request uses can't be deleted (the admin
gets a 409); history and outbox rows go with their request.

**Retention** (`server/src/auth/sweep.ts`, hourly): rate-limit rows after 24
hours; ended requests (completed, declined, cancelled) 12 months after their
last change, with their history and emails. Pending and confirmed ones stay
until staff close them. This goes in the privacy policy
(`docs/LAUNCH-CHECKLIST.md`).

**Undo**, before any real request matters (it deletes them all; back up first):

```sql
begin;
drop table if exists public.booking_notifications, public.booking_history,
  public.booking_attempts, public.bookings, public.booking_vehicles;
delete from public.schema_migrations where filename = '0014_bookings.sql';
commit;
```

Then revert the bookings PR, or the next deploy creates the tables again.
Leaving `BOOKINGS_ENABLED` unset, the tables simply stay empty: the gentler
way to keep the feature off.
