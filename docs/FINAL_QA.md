## Ella image regression follow-up — 2026-10-13

FOUND BY STATIC ANALYSIS: `publicPhoto` previously corrected Ella only when its stored primary URL matched the known legacy seed. Any non-seed/admin URL passed through, so an unrelated coastal image could return. Both the homepage Discover card and Explore map details read the same API destination record. The exact production row was not inspected.

IMPLEMENTED: `shared/public-photos.ts` now canonicalizes stable destination ID `ella` to the existing locally optimized, source-identified Nine Arch Bridge WebP for every stored URL. Missing mapping yields the neutral placeholder. `TravelImage` retains identity-safe retry/fallback and logs terminal errors in development. `server/test/public-photos.test.ts` covers stale/coastal/admin URLs, asset existence and alt, Ella/Mirissa separation, and the two components' shared data source. Other destination assets unchanged.

VERIFIED: `npm.cmd test public-photos` passes 11/11, including new ID/mapping uniqueness, mismatch override, local asset/alt and shared-component-source assertions. `npm.cmd run build` and `git diff --check` pass. The full suite was started and safely stopped after multiple DB-guarded files refused to run because TEST_DATABASE_URL is unset; the guard was not bypassed. A rendered browser check was not rerun for this follow-up, so the unit source/data assertions should not be mistaken for a new screenshot verification.


## 2026-10-13 — PR #42 browser CI follow-up

Fixed two stale browser-test assumptions exposed by CI: the frozen homepage screenshot fixture now replaces first-party `/assets/` image paths as well as external URLs, keeping the baseline comparison independent of the intentional photo-source corrections; the WhatsApp navigation test now reads the destination card heading rather than assuming the photo alt equals the destination name. No application behavior changed.

VERIFIED: source-level root causes confirmed from failed GitHub Actions log. Targeted changes pass `git diff --check`; fresh guarded DB browser run is delegated to GitHub CI because this workspace has no configured `TEST_DATABASE_URL`.
## 2026-10-13 — Repair local ride initialization
PR preparation: migration 0018 carries the owner-confirmed Car/SUV limits (5 passengers, 3 bags, accepting requests) into deployment; it updates only these category capacities/availability, preserving booking records. Production deployment remains pending PR merge.

BUG-075: legacy imported booking_attempts had an IP-only key and no action column; migration 0014 used CREATE TABLE IF NOT EXISTS and could not upgrade it. Added transactional, idempotent migration 0016 to preserve counters/windows across all three actions and restore the composite key/check. Applied only to guarded localhost development DB. Owner requested Car and SUV; migration 0017 adds SUV disabled until genuine capacities are provided. No existing ride requests, contact fields, routes or notification behavior changed.

VERIFIED: real Chrome on 5173 loads all ride fields without the loading/error screen; actual guest-session and request-history endpoints both HTTP 200 (no fixtures). 18 focused booking-client/ride-validation tests pass. Owner confirmed both Car and SUV: maximum 5 passengers and 3 bags. Applied via explicitly local-only configuration script; both accept requests. Real Chrome confirms capacities and enabled Request Ride button. Build/typecheck PASS (existing nonfatal dependency/chunk warnings); migration rerun preserves counters and all three action upserts pass with test writes rolled back. No ride submitted or production migration performed.

# 2026-10-13 — Destination accuracy and typography verification

Active application: Teyvat-latest-20261012. Built Express preview: http://127.0.0.1:8103/. These results supersede earlier claims for this change; historical QA remains below.

## VERIFIED

- Final production client/server build and typecheck exited 0. Existing nonfatal Zod annotation and large-chunk warnings remain. Final audit-tool typecheck exited 0.
- Focused regressions: 36 tests / 6 files PASS (public-photos, colour-tokens, map-tiles, map-markers, booking-client, ride-validation). No tests skipped in that run. No lint script configured.
- Actual pixels inspected for existing and downloaded credited photographs; Commons source descriptions/coordinates and licenses read. All 20 main destination subjects are correct. Gal Oya’s different-reservoir image corrected to identified park imagery. Existing valid assets preserved; 108 responsive WebP candidate URLs return HTTP 200 with image/webp. Asset fingerprints match actual bytes.
- Chrome built-site audit: 126 heading observations across 9 route targets, 7 widths (320/375/390/768/1024/1440/1920), and light/dark. No observed page overflow or clipped H1. Actual loaded Playfair Display faces verified; inner H1 weight 700. Ride H1 scales 32–52px, tracking -0.025em, leading 1.12.
- Actual Explore selection: 22 desktop observations (all 20 plus Mirissa → Ella) and 20 measured visible mobile thumbnails at 375px. Source assignment, descriptive alt and visible-image decoding PASS. CSS-hidden lazy counterparts are not falsely treated as failed visible photos. All 33 distinct published image URLs, including the labeled unavailable illustration, return 200 and decode under the built server image policy.
- Actual beach category membership, Mirissa Leaflet marker selection, source-keyed reset after injected image failure, refresh returning Ella, destination route switches, and unchanged light tile style through actual theme toggle PASS. Final assertion run exited 0. Captured map screenshot shows light tiles in the dark site and Nine Arch Bridge in Ella.
- Four ride layout checks at 200% ROOT TEXT enlargement (375/1440px, light/dark) show no page overflow or clipped heading. This is not browser-toolbar 200% zoom.
- Ride form screenshots inspected at light mobile/dark desktop/dark mobile; actual Ella/map screenshot and the asset contact sheet inspected. Clear heading hierarchy, shared container alignment, readable themes and unchanged compact ride fields observed. Form screenshots use the fixture described below.
- Additional real Chrome regressions PASS: hero next/previous returning to a cached photo; Home and Destinations hover reveal with stable 420px card height and decoded photos; emulated mobile touch reveal; destination-card navigation; navbar Book Your Ride navigation. Evidence: card-hero-regressions.json.
- Git diff --check exits 0; only normal CRLF-to-LF notices for two existing files.

## BLOCKED / NOT TESTED

- Full suite executed: 14/41 files PASS; remaining database-dependent files refuse execution because TEST_DATABASE_URL is unset. No guarded-test or production database substitution. No full-suite green claim.
- Live ride initialization has a local schema blocker (BUG-075): booking_attempts contains ip, attempts, window_started but lacks action required by the unchanged rate limiter. PostgreSQL 42703 and real Something went wrong / Loading ride options screenshots observed. Catalogue and account GETs return 200. Backend, schema, credentials and migrations were not changed.
- Form-layout QA uses browser-only successful guest session and empty history responses, with actual local catalogue/account reads. No request was submitted and no live persistence success is claimed. Actual catalogue has no enabled ride vehicle, so the form correctly reports requests unavailable and disables submission. Staff configuration is retained.
- Belilena remains missing licensed, confidently identified photography; its unverified seed now uses the honest unavailable illustration. Owner verification/upload required.
- Actual browser-toolbar 200% zoom, physical devices, Safari/Firefox, screen readers, complete photo-background contrast/WCAG acceptance, live WhatsApp messaging, provider guarantees, production CMS content and deployment NOT TESTED.

## Evidence and audit corrections

Evidence: docs/qa-results/image-typography/browser-audit.json, asset-http.json, test-summary.json, content-before.json/content-after.json, downloads.json, contact-sheet.jpg, explore-final.png, booking-*.png and live-error-booking-*.png. The browser report explicitly names its booking fixture; prior audit errors are retained.

Preliminary harness problems were corrected without relaxing application requirements: filter labels include counts; category membership differs from a marker’s primary icon; coordinate changes during map animation are distinct from tile style; a hidden callback input is not proof that the main form loaded; hidden lazy thumbnails must be inspected at mobile width. A stale preview process held an old HTML template during rebuild; a fresh current-template preview was verified before final assertions. Interrupted/failed attempts are not represented as passes.

Implementation/source inventory: DESTINATION_IMAGE_AUDIT.md and TYPOGRAPHY_AUDIT.md. Changelog and BUG-072–075 updated; existing BUG-033/034 continuity and Belilena history retained.

## 2026-10-13 — Light basemap in both website themes

VERIFIED on fix/keep-map-light-20261013: production build/typecheck PASS; map-tiles 3/3 and colour-tokens 2/2 PASS; browser-theme 10/10 PASS in Chrome, zero skipped/cancelled; git diff --check PASS. Browser uses the existing guarded loopback-only PostgreSQL 18 test database, not the application database. Actual dark→light→dark site toggles preserve light tile sources, identical computed tile tint and the same map container. Existing page-theme persistence, first-paint and storage-blocked checks also pass. Unit provider checks cover both keyed CARTO Voyager and keyless OSM in both themes. Existing nonfatal Zod annotation and large-chunk build warnings remain. No lint script exists. Full suite, physical devices, Safari/Firefox and production rollout NOT TESTED. Map controls/markers retain site theme styling; only basemap/tile tint is fixed light.

## 2026-10-12 — Fresh PR upload validation

Exact new branch fix/flat-whatsapp-button-20261012: production build/typecheck PASS; colour-tokens 2/2 PASS; git diff --check PASS. Existing nonfatal Zod annotation and large-chunk warnings remain. Browser checks below are prior recorded Teyvat-current verification, not freshly executed in this clone. Isolated test database on port 55459 is not running; the default configured test database previously rejected authentication. No database guards or credentials changed. Live local WhatsApp number remains unset, so the button stays hidden until an owner supplies it. Vehicle requests remain disabled until real capacity is configured; these database settings are not part of this PR. No deployment or real message delivery verified.

## 2026-10-12 - Flat WhatsApp final verification

VERIFIED: final npm.cmd run build PASS (includes typecheck, client and server bundles); standalone typecheck PASS; git diff --check PASS. Existing nonfatal Zod annotation and large-chunk warnings remain. No lint script is configured.

Final guarded local PostgreSQL / Chrome run: 3/3 files PASS, 16 tests, zero skipped/cancelled: browser-floating-booking 6/6, browser-whatsapp 8/8, colour-tokens 2/2. Checked 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920px, both light/dark themes. All 18 appearance observations verify exact green/white, circular 56px target, zero border/shadow/filter/text-shadow/animation, absent pseudo effects and shadow-free parent; independent chat hit target and keyboard outline verified. Shared edges, 12px booking/chat separation, viewport containment and no horizontal overflow pass. Hover has no shadow or scale; reduced motion disables chat transitions. Public routes, actual mobile menu, forms, footer/modal fixtures, destination/experience/tour card sweeps, map controls and slideshow controls pass existing protection tests. Booking navigation and secure configured WhatsApp URL/message contracts pass. Test fixture number exists only in the disposable test database; no app configuration or real number changed.

18 screenshots saved under docs/qa-results/whatsapp-flat/ (ignored artifacts). light-320.png and dark-1440.png visually inspected: flat white-icon green circles with booking above and consistent right edge, no glow/clipping. Native cursor code retained; no custom cursor or cursor hiding exists in the scoped component.

Initial run: 5/6 floating tests passed; focus appearance failed because public-shell focus CSS restored a 6px shadow. Added scoped chat focus override, rebuilt and reran all three files successfully; this failure is not hidden.

NOT TESTED: live WhatsApp conversation delivery/account status, physical devices, Safari/Firefox, full application suite and remote CI for this uncommitted change. Browser tests verify the semantic link destination and page-aware message without contacting WhatsApp. Existing unrelated shadows and booking behavior preserved.
# PR integration verification - 2026-10-12

This is the exact upload branch based on GitHub main, with the prepared content-cleanup commit and the shared floating-stack follow-up. Parent-workspace 600 rendered observations remain scoped to that workspace and are not presented as fresh PR-branch verification. Current-main feature flag, theme tokens, modal focus and booking/backend/security changes are retained.

Executed: final production build/typecheck PASS (existing Zod annotation and >500kB chunk warnings); source diff whitespace check PASS. Final exact-branch browser checks: 6/6 CTA tests PASS on the final rerun; 8/8 WhatsApp tests PASS on the latest WhatsApp run, zero skipped/cancelled. Synthetic fixture mapper round-trip PASS for nine collections; this does not verify a live production database. Checks cover hero controls/playback/links, nine responsive widths, AA theme contrast, keyboard booking navigation, reduced motion, whole-card focus transfer, 27 catalogue scrolling cases, form/cookie/menu hiding, feature disabled and no configured chat. No lint script configured. Tests use a new dedicated loopback `_test` database in the existing isolated PostgreSQL cluster; all database guards remain intact. No production database, deployment or real messages used.

Integration attempts retained: initial browser invocation refused missing TEST_DATABASE_URL. First configured run passed 2/6 CTA and 5/8 WhatsApp checks, exposing motion-entry card clearance/global-form protection gaps and old immediate-restoration assumptions. Cards are now protected before fade-in and with 40px approach/48px restore clearance for 30px entry motion. All forms, including body-mounted forms, join collision protection. Tests measure the fixed stack (excluding allowed 1px hover lift), wait for theme color transitions, and check unobstructed card access where prior tests expected chat to overlay cards below the hero. Later hero attempts were blocked by an external Wikimedia image request and then duplicate URLs in an initial local-photo test fixture. Final fixture uses shipped photo files with unique carousel URLs only in the guarded test database; production image data/settings remain unchanged. A new focus-transfer test also needed to reset the WhatsApp number after the no-number test. Failed attempts are retained here and are not counted as acceptance.

Remaining: physical-device safe areas/virtual keyboards, Safari/Firefox, screen-reader session, production deployment, full-suite acceptance and external WhatsApp launch/delivery NOT TESTED for this branch. Exact source/design and responsive states: FLOATING_CTA_ALIGNMENT_FIX.md / RESPONSIVE_AUDIT.md. Historical verification follows.

# Content cleanup and floating ride CTA QA — 2026-10-12

Saved locally. Final floating booking CTA and WhatsApp Chrome run: 12/12 tests PASS, zero skipped or cancelled. Verified hero controls, all eight requested viewport widths, route visibility, light/dark contrast, keyboard navigation, reduced motion, scrolling and collision handling. The earlier combined run also passed seven booking, ten hero-contrast and five scroll-to-top checks; its three failures were subsequently resolved and checked in the focused final run. Baseline before changes: TypeScript check and all eight existing WhatsApp Chrome tests PASS, zero skipped. Final production client/server build and TypeScript check PASS, with existing dependency annotation/>500kB chunk warnings. Existing database safety guards remain enabled; only the isolated local test database is used. No lint script is available. Evidence is under ignored `docs/qa-results/content-cleanup/`.

Initial new browser run: 2/4 tests passed; Previous timed out and a booking-form assertion ran before asynchronous catalog loading. The latter test now waits for the form. Second run: 3/4 passed; Previous still failed. Focused diagnostic confirmed a real pre-existing readiness reset race: first image decoded at naturalWidth 1280 while the hero remained busy waiting for its already-fired load event. Fix retains matching decoded readiness during source resets (BUG-058). The 320px screenshot also showed clipped header controls (BUG-059); compact unlayered spacing preserves their 44px targets. Failed attempt/diagnostic evidence is retained locally and is not counted as acceptance.

A browser startup retry encountered an existing Windows DevToolsActivePort file-lock error (BUG-061); the successful final run supersedes that cancelled attempt. Production deployment and a full-suite run remain outside this save checkpoint.

Performance evidence: the combined cleanup/CTA changes take main JavaScript gzip from 161.89 to 162.90kB and CSS gzip from 19.35 to 19.65kB, measured in the prior ride and current build logs. No new dependency, external script or repeating attention timer. This is bundle evidence, not a Lighthouse/Core Web Vitals assessment.

NOT TESTED: real customer WhatsApp messaging, production deployment, physical-device safe-area/notch behavior, a screen-reader session and production business-claim accuracy. Desktop/mobile Chrome emulation, computed safe-area rules, contrast and keyboard checks are used; exhaustive accessibility certification is not claimed. Previous ride/backend limitations below remain applicable.

# Ride booking QA — 2026-10-12

Status: focused checks PASS. No full-suite or production acceptance claim.

The authorized implementation is described in `RIDE_BOOKING_REDESIGN.md`. Tests use an isolated loopback PostgreSQL 18 database named `teyvat_rides_test`; database safety guards remain enabled. Development migration 0015 ran on the existing local development database. No production database or email provider was used.

VERIFIED: final production client/server build and TypeScript checks. All 107 tests across booking-validation, booking-client, ride-validation, bookings, pages and security pass (zero skipped). This includes 26 booking API tests with six new ride cases and 17 ride schema tests. Coverage includes manual locations, persisted one-way/round-trip requests, missing/invalid/past dates, passenger/capacity validation, canonical catalog places, server session identity, guest callback requirements, injection rejection, idempotency, cookie isolation, pending persistence, original tour requests, page responses/share metadata and production security headers.

VERIFIED in Chrome: all seven focused booking tests pass (zero skipped). Tested 320, 375, 768, 1024 and 1440px: no horizontal overflow, summary below the form under 768px and beside it at larger widths. Saved screenshots and visually reviewed 320/1440px; dark summary uses its dark token. Native radio arrow navigation, dialog initial focus, Escape dismissal and focus return pass. Seven essential inputs, live route summary, conditional/cleared returns, identical-location and capacity errors, separate callback validation and actual pending submission pass. A simulated lost response after a real successful POST is recovered using the same idempotency key; rapid duplicate submissions plus retry leave exactly one database row. GPS is never called on load; click success and permission-denial manual fallback pass. Existing feature-flag navigation, tour preselection, authentication and admin booking/vehicle rendering pass.

Evidence (local, ignored artifacts): `docs/qa-results/rides/build-final.log`, `regression-final.log`, `browser-final.log` and five `ride-<width>.png` screenshots. Test vehicle capacity is enabled only in the isolated test database. Live development vehicles are unchanged.

Build warnings: existing dependency annotation and chunk-size warnings. No lint script exists in package.json. An initial new browser test type error was corrected and the build rerun successfully. The first sandbox browser run stalled and was canceled; the permitted outside-sandbox retry passed. Those attempts are not reported as passes.

NOT TESTED: production migration/deployment, real GPS permissions on a physical mobile device, keyed map provider requests, actual email delivery, actual customer callbacks, fleet availability, a screen reader session and exhaustive Tab traversal of every site element. Keyboard radio/modal behavior and programmatic labels/errors/status/focus indicators were checked; this is not an accessibility certification. No full-suite pass is claimed.
