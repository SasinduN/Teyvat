# Booking API

Booking requests, from the friend import (`docs/reviews/friend-import.md`).
Requests, not reservations: each one starts `pending` and staff confirm it by
hand. Code: `server/src/routes/bookings.ts`, shapes and rules in
`shared/booking.ts`.

**Switched off by default.** Every route below is a JSON 404 unless
`BOOKINGS_ENABLED=true` (`createApp({ bookings })` in tests). `/api/content`
says which (`features.bookings`); the client hides the "Book a Trip" link and
"Book This Tour" button, `/booking` is a 404 page, and Admin → Bookings says
they're off.

All responses are `Cache-Control: no-store`. Errors are the usual
`{ error: { code, message, fields? } }`. No route accepts a status or a price
from the guest, or any property the schema doesn't name.

| Method and path | Who | What |
| --- | --- | --- |
| `POST /api/bookings/session` | anyone, same origin | Sets the guest cookie (or keeps it). No record. 20 per IP per 15 min. |
| `GET /api/bookings/catalog` | anyone | Published destinations and tours (each tour's stops resolved), the vehicle categories, whether emails are on. |
| `POST /api/bookings` | guest, same origin | A full `BookingInput` and an `Idempotency-Key` (UUID) header. 201 with the new request; the same key and body again: 200 with the same request; the same key with another body: 409. 5 per IP per 15 min, refused ones included. |
| `GET /api/bookings` | guest | Their own requests (not expired), newest 100. |
| `GET /api/bookings/:id` | guest | One of their own; another guest's is a 404. |
| `PATCH /api/bookings/:id` | guest, same origin | `{ version, details }`: a pending request, at the version read. All the checks again. |
| `POST /api/bookings/:id/cancel` | guest, same origin | `{ version, status: "cancelled" }`, before departure. Edits and cancellations: 20 per IP per 15 min. |
| `GET /api/admin/bookings?status=&offset=` | staff | 50 a page, filtered by status, with `nextOffset`. |
| `GET /api/admin/bookings/:id` | staff | One request, with its history. |
| `PATCH /api/admin/bookings/:id` | staff, same origin | `{ version, status }` along the lifecycle. Confirming needs a future departure and a category with room; completing needs the trip to be over. |
| `GET /api/admin/booking-vehicles` | staff | The categories. |
| `PUT /api/admin/booking-vehicles/:id` | staff, same origin | A category; taking requests needs a real passenger capacity. |

**A request** (`BookingInput`): an optional `tourId`, `pickup`, a published
`destinationId`, up to 10 ordered `stops`, `tripType` (`one_way`, or
`round_trip` with a return after the departure), `departureDate` and
`departureTime` and the return's, optional different return pickup and
drop-off, `vehicleId`, a whole number of `passengers`, contact name, email and
phone, `notes`, and `termsAccepted: true`. Dates and times are Sri Lanka time
(UTC+05:30) whatever the browser's timezone.

**A place**: `label`, `address`, `source` (`manual`, `destination` or `gps`),
a destination's `destinationId`, and for GPS `lat`, `lng` and `accuracy`. The
server replaces a destination's name and coordinates with the database's and
drops coordinates from a typed place. A tour's last stop must be the
destination.

**Lifecycle**: pending → confirmed, declined or cancelled; confirmed →
cancelled or completed. Ended requests never reopen. Every change checks the
version under a row lock; a stale one is a 409.

**Guests** are browsers: the cookie (`docs/BOOKING_SECURITY.md`) lasts 30
days, and so does a request's access. There are no customer accounts; from
another device a guest contacts staff with the reference, which on its own
grants nothing.
