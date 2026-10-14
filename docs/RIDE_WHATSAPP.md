# Book Your Ride WhatsApp enquiries — 2026-10-14

The owner requested ride enquiries through WhatsApp instead of the admin panel. Current main provides a shared WhatsApp number in site settings and wa.me chat links; it does not contain an automatic WhatsApp Business API sender.

## Behavior and scope

The ordinary `/booking` ride form keeps pickup/drop-off, manual/GPS selection, dates/times, return fields, passengers, vehicle-capacity checks and live summary. Submit validates those values and opens WhatsApp in a new tab with a draft addressed to `site_settings.whatsapp_number`. The visitor must review it and tap Send. A prepared-draft link allows reopening if the browser blocks the popup; editing any ride field clears that stale draft. There is no sent/delivery/confirmed claim.

The draft includes pickup/drop-off labels, addresses when present, map links for available coordinates, trip type, departure and return details in Sri Lanka time, reversed return route, passenger count, vehicle name and a request to confirm fare/availability.

Only the catalogue is fetched by the ride form. No account/guest-session/history calls, ride POST, callback dialog, admin receipt or request-history UI. Missing or invalid configured number disables the handoff and explains unavailability. No hardcoded business number and no admin fallback. The production settings row is used after deployment; local absence does not require an API key or any overwrite of production settings.

Public ride-flow markup changes were explicitly called out before editing. `/booking?tour=…`, tour submission, backend endpoints, admin records/settings and existing request history remain unchanged. No migration, dependency or server/configuration change.

## Verification

VERIFIED: production build/typecheck; 32 focused tests in three files. Draft encoding includes Unicode, addresses and GPS; one-way/round-trip details, missing/invalid numbers, invalid dates/routes, capacity and disabled/mismatched vehicles are covered. Existing Zod annotation warnings remain nonfatal. Dependency install reports existing audit findings; dependency files unchanged.

VERIFIED: all 8 real Chrome browser-bookings tests PASS against an isolated temporary localhost PostgreSQL 18 database with the explicit-port/*_test guards intact. Keyboard submission opens the configured synthetic recipient with complete round-trip details; fallback URL is the same draft; field edits clear stale drafts; no admin booking count change and only GET /api/bookings/catalog requests from the ride form (no guest/account/history/POST). Missing configuration disables submission. Existing feature flags, tour flow, admin list, GPS permission/manual fallback and live summary are covered. Five widths (320/375/768/1024/1440) have no horizontal overflow and retain the responsive summary; dark-summary test passes. The 375/1440 screenshots were visually inspected.

Initial browser runs failed on test harness details: the CDP Enter event lacked text/focus activation, then a raw URL comparison disagreed with the browser's canonical apostrophe encoding. Corrected focused Enter simulation and normalized URL comparison; the final complete browser file rerun passed. Whitespace and nine-collection fixture mapper roundtrip also pass; roundtrip is not live database/render proof.

Full GitHub CI pending. Chrome tests intercept window.open and record booking fetches, so they never contact WhatsApp or send anyone a message. External WhatsApp send/delivery, physical devices and production are NOT TESTED.
