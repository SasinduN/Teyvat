# Bookings: how they were brought in

From the friend import (`docs/reviews/friend-import.md`, sections 1 and 2).
His plan was a `/booking` request form, its API and an admin page on the
existing site, reusing its catalogue (destinations, tours and their stops),
admin sessions, `sameOrigin`, Resend and the hourly sweep, with no prices,
payments or customer accounts. That stands. What changed on the way in:

1. **Behind a flag**, `BOOKINGS_ENABLED`, off by default. Off, the page and
   API are 404s, nothing links to them, and Admin → Bookings says so.
2. **Migration renumbered** to `0014_bookings.sql`; the rate-limit table is
   keyed by IP and action. Undo in `docs/BOOKING_DATABASE.md`.
3. **Security**: the cookie is always `__Host-` and `Secure`; sessions and
   changes are rate limited too; a test reads the logs
   (`docs/BOOKING_SECURITY.md`).
4. **The GPS button** says what it does before it's pressed.
5. **On main's design**: the form uses `.te-button` and the theme tokens
   (`src/styles/booking.css`); the admin page uses the admin's components.
   The map overview no longer needs a CARTO key.
6. **Tests**: his validation, client and API tests (reformatted), plus both
   flag states over HTTP (`bookings.test.ts`, `pages.test.ts`) and in Chrome
   (`browser-bookings.test.ts`).

Before turning it on: a backup (the deploy runs 0014), real vehicle
capacities in Admin → Bookings, the privacy policy's retention line, and a
verified Resend sender if emails should reach travellers
(`docs/LAUNCH-CHECKLIST.md`).
