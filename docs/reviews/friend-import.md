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

| Item | Outcome |
|---|---|
| `/booking` page, location fields, vehicle selector, GPS pickup, stops, trip type, contact details, review step | Brought in behind `BOOKINGS_ENABLED` (PR C) |
| Shared validation (`shared/booking.ts`): Asia/Colombo dates, published catalogue, vehicle capacity | Brought in |
| Guest access: private cookie, 30 days per record, reference alone grants nothing | Brought in; cookie checked in the security review below |
| Idempotency keys, atomic rate limit, version checks | Brought in; rate limits extended (see PR C) |
| **Book a Trip** in the navigation | Brought in, shown only when bookings are on |
| **Book This Tour** on tour pages (and "Inquire About This Tour" for the enquiry button) | Brought in, shown only when bookings are on |
| Booking metadata in `server/src/pages/pages.ts`, `noindex` | Brought in; `/booking` is a 404 when bookings are off |

## 2. Admin bookings and database (PR C)

| Item | Outcome |
|---|---|
| `/admin/bookings`: list, filter, details, history, status changes | Brought in; shows "Bookings are switched off" when off |
| Vehicle categories with real capacities | Brought in |
| `db/migrations/0011_bookings.sql` | Fixed: renumbered (0011 is `image_credits` on `main`); undo documented |
| Sweep: old rate-limit rows, terminal bookings after 12 months, notification dispatch | Brought in |
| Notification outbox with retries | Brought in |

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
| Booking surfaces on the shared theme | PR C |
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
| `public/assets/*.webp` | Skipped (PR B): not committed. See PR B for each photo |
| `public/assets/PHOTO_CREDITS.md` | PR B |
| `shared/optimized-photos.json`, `scripts/optimize-photos.py` | PR B |
| `public/favicon.svg` and its `<link>` | Brought in (PR A) |
| CSP `img-src data:` (Leaflet's blank tile) | Skipped, as asked |

## 6. Environment and documentation

| Item | Outcome |
|---|---|
| `.env.example`, `.gitignore` | PR C: his additions merged, every `main` variable kept, no values |
| Booking docs (`BOOKING_API`, `BOOKING_DATABASE`, `BOOKING_SECURITY`, `BOOKING_IMPLEMENTATION_PLAN`) | PR C |
| `BOOKING_TEST_REPORT.md`, `GEOLOCATION_SETUP.md` | PR C: folded into the four above |
| `docs/codex/`, audit and QA docs (`*_AUDIT.md`, `FINAL_QA.md`, `BUG_REPORT.md`, `CHANGELOG.md`, `DESIGN_SYSTEM.md`, redesign notes…) | Skipped, as asked |
| `README.md` booking paragraph | PR C, with the flag |
| `docs/CI_PR11.md` deletion | Skipped, as asked |

## 7. Tests and tooling

| Item | Outcome |
|---|---|
| Booking validation, client and API tests | PR C |
| `browser-pages`: home link by class and name | Brought in (PR A) |
| `browser-pages`: `#contact` scroll margin, `/explore` map | Skipped: `main` already has these as they should be |
| `browser-pages`: "Inquire About This Tour" | PR C |
| `browser-whatsapp`: `#discover` selector | Fixed (PR A): `main` already used `#discover`; the card now needs its info button first |
| `browser-csp`: keyless OSM tiles | Skipped: `main` already tests both |
| `security.test.ts`, `browser-csp` `data:` | Skipped with the CSP change |
| `quality-pass.test.ts` | Skipped: not on `main` (the theme default is tested in `browser-theme`) |
| `pages.test.ts`: `/booking` 200, sitemap count | PR C, both flag states |
| `helpers.ts`: truncate booking tables | PR C |
| `scripts/audit-*.py` | Skipped: local audit scripts, not part of the checks |
