# Ride booking redesign — 2026-10-12

The user explicitly authorized replacing the public booking structure with a compact transport request page. `/booking` now says **Book Your Ride**. Navigation and footer use that label. `/booking?tour=<id>` retains the existing guided-tour form, itinerary, contacts and edit flow through `TourBookingPage`.

The ride form has seven inputs: pickup, drop-off, trip type, pickup date, pickup time, passengers and configured vehicle category. Round trips conditionally render return date/time; switching to one way clears them. City, hotel, airport and full-address entry work without a tour or catalog destination. Existing destination suggestions and click-only GPS remain. Coordinates are explicitly unverified addresses; denied GPS falls back to typing.

The live summary appears once details are entered: route, trip type, dates, passengers and vehicle. No distance, duration, availability or price is calculated. Fare is confirmed after review. Desktop shows a compact summary beside the form; mobile puts it below. Scoped styles use the existing Green & Pearl/Sky Blue tokens and dark theme. Labels, native radios, modal focus handling, visible focus outlines, 48px controls, announced errors/loading and pending receipts support keyboard use.

## Contact and identity

Guests use the separate callback dialog selected by the user after **Request Ride**. A valid callback phone number is required before any request is stored; the primary ride form contains no contact section. Signed-in requests use the real account resolved from the HttpOnly server session. The API rejects frontend identity, tour and price injection. The existing account system has staff accounts, not a new customer registration flow. Phone numbers are supplied for callback and are not verified by OTP.

## Backend

`POST /api/bookings/rides` accepts `{details, callbackPhone?}` with an `Idempotency-Key` UUID. `details` follows `shared/ride.ts`. `GET /api/bookings/rides/account` exposes only whether the current session is signed in and its email. Existing guest session, browser ownership, transaction/advisory lock, rate limits, capacity checks, pending status/history and admin review are reused. Ride records have `details.kind="ride"`, a drop-off object and server-derived customer ID when authenticated. The old tour endpoint/schema remains unchanged.

Migration `0015_manual_rides.sql` permits a null destination foreign key only for a ride with a labeled drop-off. Existing foreign keys and tour/contact fields remain. Run migrations before enabling the updated application. Production migration has not been run.

## Limitations

- Only configured service categories appear. The seeded Car remains unavailable until staff enter real capacity and enable requests. No live fleet availability or pricing exists.
- Guest status ownership remains the existing browser cookie for 30 days. No cross-device customer portal or ride editing UI was added.
- Round trips return from drop-off to the original pickup. More complex itineraries use the preserved tour flow.
- Reverse geocoding is unavailable. Manual places cannot be verified as distinct physical addresses beyond normalized text/catalog IDs/exact coordinates.
- Local email delivery is unconfigured. Staff receive the callback phone in admin; configured notifications omit empty guest email recipients. Saving a request does not prove staff have contacted the customer.

See `FINAL_QA.md` for executed checks and evidence limits.
