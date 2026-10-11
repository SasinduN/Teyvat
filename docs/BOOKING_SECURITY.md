# Booking security

The security review of the friend import's bookings, and what changed.

- **Guest cookie**: `__Host-teyvat_booking`, `HttpOnly`, `Secure`,
  `SameSite=Strict`, `Path=/`, no `Domain`, 30 days. 256 random bits; the
  database keeps only the SHA-256. Always `__Host-` and `Secure`, like the
  staff session (his used another name and no `Secure` outside production;
  browsers treat `http://localhost` as secure, so it works locally).
- **Same origin**: every write goes through `sameOrigin` (`app.ts`, all of
  `/api`); tested for a new request and for a session.
- **Rate limits**, per IP and 15 minutes: 20 sessions, 5 new requests
  (refused ones count), 20 edits or cancellations. His had only the second.
- **Who sees what**: a guest only their own requests, unexpired; another
  guest's is a 404, no cookie a 401. Staff routes use the admin session.
- **Input**: strict schemas (`shared/booking.ts`) on both sides; the server
  re-checks published destinations and tours, the tour's last stop and the
  category's capacity under share locks. Status and price never come from
  the guest. All SQL is parameterised; React escapes all text.
- **Retries and races**: an `Idempotency-Key`, a hash of the body and an
  advisory lock make a retry return the same request; versions make a stale
  edit or status change a 409.
- **No personal data in URLs or logs**: URLs carry only ids (`/booking?tour=`,
  a request's UUID). Nothing logs a request: errors go through
  `describeForLog`, and the email outbox logs only that a send failed. A test
  submits, refuses and crashes a request and checks the logs for its name,
  email, notes, pickup and IP.
- **Emails** (Resend, already used for enquiries): the reference and status
  only, no places; to the traveller and `NOTIFY_EMAIL_TO`.
- **GPS**: only when the visitor presses "Use my current location", which
  says beforehand what happens (read once, kept on the page unless sent,
  never tracked). One `getCurrentPosition`, no cached reading, 15 s limit; no
  `watchPosition`. The coordinates stay labelled as coordinates. Tested in
  Chrome: no call on load, one on the press.
- **External services**: none new. There is no geocoding or routing service
  (his optional reverse-lookup hook is removed: nothing used it). The
  optional "Show the places on a map" uses the site's existing map tiles
  (CARTO, or OpenStreetMap without a key), already in the CSP. The CSP is
  unchanged.
- **Retention**: see `docs/BOOKING_DATABASE.md`.

Not done, and not claimed: customer accounts, payments, prices, live fleet
availability, road routes.
