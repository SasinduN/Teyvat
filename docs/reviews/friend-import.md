# The friend import: 11 October 2026

A teammate's local changes since #12, described in his
`POST_PR12_CHANGES_REPORT.md` (55 tracked differences against #12's final
source commit `d799ce0`, plus untracked additions). This lists every item in
that report as **brought in**, **fixed** (brought in, changed to fit `main`)
or **skipped**, with the reason, and which PR carries it.

## How this was made

- His folder was read only. Nothing under `node_modules`, `dist` or `.git`
  was copied, and no `.env*` file but `.env.example`. Also left out: his
  `backups/` (archives of the project), a `*.env` file in the project root
  (a credentials file), and the `*.log` and audit-output files his
  `.gitignore` already excludes.
- His tracked and untracked sources were copied over a branch made from
  `d799ce0` and committed locally as "friend import (unreviewed)". That
  branch is never pushed. `git diff --ignore-cr-at-eol d799ce0` on it
  reproduces his report exactly: 54 changed files, 1,209 insertions, 349
  deletions, plus the `docs/CI_PR11.md` deletion.
- `main` had moved on a long way since `d799ce0` (redesign PRs 0–5, #12
  parity, the dark theme, `tokens.css` in place of `palette.css`, the glass
  classes rewritten, photos from the database). So nothing was merged as a
  file: each change was re-made on today's `main`, in its structure, and
  checked against its tests.
- Three PRs, in order: **A** design, **B** photos, **C** bookings (behind a
  flag).

## 1. Public booking workflow (PR C)

All of it behind `BOOKINGS_ENABLED`, off by default: off, `/booking` and
every booking API route are 404s, no link points there, and Admin → Bookings
says "Bookings are switched off". Tested in both states, over HTTP and in
Chrome.

| Item | Outcome |
|---|---|
| `/booking` page: pickup (typed, a destination, GPS), stops, trip type, dates, passengers, vehicle, contact, review step, My requests | Fixed: reformatted onto `main`'s buttons and tokens (`booking.css` had `--travel-*` aliases `main` doesn't have); the GPS button now says what it does before it's pressed |
| `LocationField`, `VehicleSelector`, `booking-client.ts` | Brought in, reformatted |
| `booking-geolocation.ts` | Fixed: the unused reverse-geocoding hook (`resolvePickup`) removed; no service was ever wired to it |
| Shared validation (`shared/booking.ts`): Sri Lanka dates and times, published catalogue, capacity | Brought in, reformatted; the always-false `geocodingConfigured`/`routingConfigured` flags dropped |
| Guest access: private cookie, 30 days per record, a reference alone grants nothing | Fixed: always `__Host-teyvat_booking` with `Secure` (his had another name and no `Secure` outside production) |
| Idempotency keys, rate limit, version checks | Fixed: rate limits added for sessions (20) and edits or cancellations (20), beside his 5 new requests, per IP per 15 min |
| **Book a Trip** in the navigation | Brought in, only when on (`navLinks(features)`) |
| **Book This Tour** on tour pages, "Inquire About This Tour" | Brought in, only when on; off, the enquiry button keeps "Book / Inquire This Tour" |
| Booking page head in `server/src/pages/pages.ts`, `noindex` | Fixed: a 404 when off; title and description in `shared/page-meta.ts` |
| The CARTO key gate on the booking map | Fixed: removed; the map works keyless (OpenStreetMap), as elsewhere |

## 2. Admin bookings and database (PR C)

| Item | Outcome |
|---|---|
| `/admin/bookings`: list, filter, details, history, status changes | Fixed: rebuilt with the admin's own components (his was raw elements with `booking.css`); "Bookings are switched off" when off |
| Vehicle categories with real capacities | Brought in |
| `db/migrations/0011_bookings.sql` | Fixed: renumbered `0014_bookings.sql` (0011 is `image_credits`); `booking_attempts` keyed by IP and action; an index on history; undo written in the migration and `docs/BOOKING_DATABASE.md`. Not run against production |
| Sweep: rate-limit rows, ended bookings after 12 months, email retries | Brought in, with counts in the sweep's result; in the README's privacy facts and launch checklist item 24 |
| Notification outbox and retries | Brought in, reformatted |
| `shared/database.types.ts` rows | Brought in |
| `server/src/app.ts` wiring | Fixed: `createApp({ bookings })`, defaulting to `BOOKINGS_ENABLED` |

## 3. Shared design and theme (PR A)

| Item | Outcome |
|---|---|
| Palette (Green, Pearl, Sky) | Fixed: his values put into `src/styles/tokens.css` under `main`'s token names (his `--travel-*` and `--color-*` aliases weren't needed). Two values changed for AA: the secondary text is `#5A6F64` (his `#60766B` is 4.3:1 on the mist green), and the photo-overlay green (`--inverse-surface`) is his forest night `#12382D`, not his `#194D3B`, which thinned the photo gradients below AA over a white photo |
| Typography and spacing scale | Brought in as tokens (`--heading-*`, `--section-space`, `--grid-gap`, `--radius-*`, 1240 px container, 5 rem header) |
| Buttons: flat, `0.75rem` radius, 44 px, green primary everywhere, sky secondary | Brought in; icon buttons stay round, as in his CSS |
| Light by default when nothing is saved; a saved choice still wins | Brought in: `public/theme-init.js`, `browser-theme`. Tests that need dark now save the choice (`saveTheme` in `server/test/chrome.ts`) instead of relying on the system setting |
| Header follows the page: the page's own colours, clear only over the home photo at the top | Fixed: nearly opaque glass (96%) with #32's strong blur, solid with reduced transparency or no `backdrop-filter`. His was fully opaque with no blur, which drops #32's fix and fails `browser-glass` |
| Phone menu in the page's colours | Brought in |
| Logo: icon `aria-hidden`, home link named by the logo's text plus "homepage" | Brought in; the logo's gold and "Sri Lanka" take darker tokens on the light header for AA |
| Footer: `h4` → `h2`, less padding, legal text brighter, unset social links labelled | Brought in |
| Page headers below the header, smaller | Brought in |
| Hero: next slide fetched 4.5 s after the first is ready | Brought in |
| Booking surfaces on the shared theme | Brought in (PR C) |
| `src/lib/theme.ts`, `src/main.tsx` changes | Skipped: `main` replaced both (`public/theme-init.js`; styles imported from `index.css`) |
| `glass3d.css` changes | Skipped: `main` folded glass3d into `glass.css` (`.glass--3d`); his only changes there were header and card rules, re-made in `index.css` and `cards.css` |

## 4. Photo-first destination cards (PR A)

| Item | Outcome |
|---|---|
| Gallery card on `/destinations`: photo, rating, region, name; description and link revealed on hover, focus or the info button; Escape; inert when hidden; reduced motion; forced colours | Brought in as `DestinationRevealCard` (`PageCards.tsx`) |
| `HomeDestinationCard` on the home page, 1/2/4 columns | Fixed: the same component with a `--home` modifier, not a copy (his two were line-for-line twins) |
| `cards.css`, `home-destinations.css` | Fixed: every hex replaced by a token; the home section follows the theme (his was pearl in dark mode too). The card scrim is deeper under the text, for AA over a white photo |
| Content-card look (`te-content-card`, badges, meta) on tours, experiences, featured experiences | Brought in; photo gradients stay as on `main` (AA) |
| `TravelImage` / `DestinationSpotlight` image changes | Skipped: `main` uses plain `<img>` with the rows' photos; `TravelImage` and its local photo map override the database |
| Spotlight card restyle (`--photo` card, glass caption) | Fixed: kept `main`'s dark glass caption (his lighter one fails AA over a white photo) with his type classes |

## 5. Images, favicon and security headers

| Item | Outcome |
|---|---|
| `public/assets/*.webp` (39 files, 10 photos) | Skipped (PR B): not committed. Every one is a resized copy of a photo `main` already has in R2; see below |
| `public/assets/PHOTO_CREDITS.md` | Skipped (PR B): all ten credits are already in `image_credits` (migration 0011, moved to the R2 URLs by `images:import`), word for word: author, licence, licence link and source page |
| `shared/optimized-photos.json` | Skipped (PR B): it maps the Wikimedia URLs to his local files for `TravelImage`'s `srcset`. `main` reads each photo's one URL from its row; nothing would read the map |
| `scripts/optimize-photos.py` | Skipped (PR B): it writes those local files and the map. The R2 flow is upload (media library, or `images:import`), then the row's URL; it needs neither |
| `public/favicon.svg` and its `<link>` | Brought in (PR A) |
| CSP `img-src data:` (Leaflet's blank tile) | Skipped, as asked |

### The ten photos (PR B)

His `optimized-photos.json` names, for each file, the Wikimedia URL it was
made from. Each is one of the photos migration 0010 put on the site, which
`npm run images:import` copied into R2 (1280 px, as Wikimedia served them)
and repointed the rows at, and which 0011 credits. So **none is new**, and
nothing was uploaded.

| Photo | His files | On `main` | Licence |
|---|---|---|---|
| Ella: Nine Arches Bridge (MichaelJames2468) | 480–1920 | R2 copy, credited | CC BY-SA 4.0 |
| Sigiriya Rock fortress (Chamixth) | 480–1920 | R2 copy, credited | CC BY-SA 4.0 |
| Galle Fort Lighthouse (Rovin Shanila) | 480–1920 | R2 copy, credited | CC BY-SA 4.0 |
| Yala: Sri Lankan leopard (Sathsara Panchali) | 480–1920 | R2 copy, credited | CC BY-SA 4.0 |
| Anuradhapura: Ruwanwelisaya (Philip Nalangan) | 480–1920 | R2 copy, credited | CC BY-SA 4.0 |
| Polonnaruwa: Gal Viharaya (Dumidu Madhushan Senanayake) | 480–1920 | R2 copy, credited | CC BY-SA 4.0 |
| Udawalawe elephants (Sanduweragoda) | 480–1920 | R2 copy, credited | CC BY-SA 4.0 |
| Weligama beach (PIERRE ANDRE LECLERCQ) | 480–1920 | R2 copy, credited | CC BY-SA 4.0 |
| Rice and curry (Lankan Foodie) | 480–1280 | R2 copy, credited | CC BY-SA 4.0 |
| Jaffna: Nallur, front (Aathavan jaffna) | 480–1920 | R2 copy, credited | CC BY-SA 3.0 |

**Licences:** all ten are CC BY-SA, so reusable on the site with the credit
(`/photo-credits` shows it) and share-alike for any adaptation; none is
unclear. The share-alike part matters only if a cropped or edited version
is published separately: it must carry the same licence.

**Better?** Only in size. His 1920 px files are larger than R2's 1280 px
copies, which would be sharper on a wide screen where a photo fills the
width (the home hero's Ella slide). But two are upscaled rather than
sharper (Jaffna's 1920 is 82 KB, Udawalawe's 180 KB; his own notes call
Udawalawe and Weligama soft), the rest are 0.5–1.5 MB each, and the site
loads one URL per photo, so cards would download the big file too. The
owner's decision: keep R2's 1280 px copies and upload none of these.
Responsive images (`srcset`, 1920 px only for full-width heroes, not
Jaffna or Udawalawe) are in CLAUDE.md's backlog. His 1280 px files are the
same pictures as R2's, re-encoded as WebP: smaller, not better.

**Not checked from here:** that production's rows still point at the R2
copies. Reading the production database, even through the public site, was
outside this session's permissions; `npm run images:audit` (launch
checklist item 16) checks the live rows.

## 6. Environment and documentation

| Item | Outcome |
|---|---|
| `.env.example` | Brought in (PR C): `NODE_ENV` and `PORT` (commented, with their defaults), the note that Resend also sends booking emails, `BOOKINGS_ENABLED`, `CHROME_PATH`. Every `main` variable and comment kept; no values. His reference to a local credentials file left out |
| `.gitignore` | Brought in (PR C): `*.env` and `*.env.*` too, `/.env.example` still tracked |
| Booking docs (`BOOKING_API`, `BOOKING_DATABASE`, `BOOKING_SECURITY`, `BOOKING_IMPLEMENTATION_PLAN`) | Fixed (PR C): rewritten for the flag, the renumbering and the security changes |
| `BOOKING_TEST_REPORT.md`, `GEOLOCATION_SETUP.md` | Skipped: their facts are in the four above (GPS in `BOOKING_SECURITY`); the test report described his machine's runs |
| `docs/codex/`, audit and QA docs (`*_AUDIT.md`, `FINAL_QA.md`, `BUG_REPORT.md`, `CHANGELOG.md`, `DESIGN_SYSTEM.md`, redesign notes…) | Skipped, as asked |
| `README.md` booking paragraph | PR C, with the flag |
| `docs/CI_PR11.md` deletion | Skipped, as asked |

## 7. Tests and tooling

| Item | Outcome |
|---|---|
| Booking validation, client and API tests | Brought in (PR C), reformatted; plus the flag off, the cookie's attributes, the new rate limits, logs, the sweep, and Chrome in both states (`browser-bookings`) |
| `browser-pages`: home link by class and name | Brought in (PR A) |
| `browser-pages`: `#contact` scroll margin, `/explore` map | Skipped: `main` already has these as they should be |
| `browser-pages`: "Inquire About This Tour" | Fixed (PR C): unchanged with bookings off (the default); `browser-bookings` checks the label with them on |
| `browser-whatsapp`: `#discover` selector | Fixed (PR A): `main` already used `#discover`; the card now needs its info button first |
| `browser-csp`: keyless OSM tiles | Skipped: `main` already tests both |
| `security.test.ts`, `browser-csp` `data:` | Skipped with the CSP change |
| `quality-pass.test.ts` | Skipped: not on `main` (the theme default is tested in `browser-theme`) |
| `pages.test.ts`: `/booking` 200, sitemap count | Fixed (PR C): 404 off, 200 `noindex` on, never in the sitemap; the sitemap count was already right on `main` |
| `helpers.ts`: truncate booking tables | Brought in (PR C); `test-db.ts` also clears `BOOKINGS_ENABLED` so a local `.env` can't change the tests |
| `scripts/audit-*.py` | Skipped: local audit scripts, not part of the checks |
