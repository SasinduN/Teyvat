# CLAUDE.md

Teyvat: the Travel Eye Sri Lanka public site (`/`) and its admin panel
(`/admin`). Vite + React 19 client, plus an Express API in `server/` backed by
Railway Postgres, with images on Cloudflare R2. Both are served from one
origin. The move off Supabase is finished (phases 1–7). Setup and commands are
in `README.md`; the schema is in `docs/SCHEMA.md`.

- **Restore:** `docs/RESTORE.md`.
- **What's left before go-live:** `docs/LAUNCH-CHECKLIST.md` (decisions only
  people can make).

This repo is public. Never put secrets, connection strings, or passwords in
this file or anywhere else in git.

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| 1 | Railway Postgres, migration runner, `site_settings` | done (`11d77e2`) |
| 2a | Express API, shared types, `GET /api/content` | done (`d50988d`) |
| 2b | Public site reads `/api/content`: hero slides, pillars, site settings, spotlight from `featured` | done |
| 3 | Auth on our own `users` / `sessions` tables (replaces Supabase Auth) | done |
| 4 | Admin CRUD endpoints (replaces Supabase queries in `src/admin`) | done |
| 5 | Image uploads to Cloudflare R2 (replaces Supabase Storage) | done |
| 6 | Inquiries endpoints: public submit and admin inbox | done |
| 7a | Clean-up: README/SCHEMA rewrite, CI, security headers, error boundaries, restore guide | done |
| 7b | Launch decisions: `docs/LAUNCH-CHECKLIST.md` | owner's checklist |
| 8a | Real pages and links: routes, layout, page types, code splitting (`docs/plans/phase-8-pages.md`) | done |
| 8b | Server side of phase 8: head tags, 404 status, 301s, sitemap, robots | done (#8) |
| R | Redesign: #12 redone in PRs 0–5 (`docs/plans/redesign-redo.md`) | done (#17, #19, #22, #23, #24, #26) |
| R+ | #12 parity: glass, buttons, header, Explore and planner markup (`docs/reviews/pr12-parity.md`) | in review (#28) |
| R++ | `llms.txt` (#29); dialogs keep the scrollbar's space (#30) | done |
| F | The friend import (`docs/reviews/friend-import.md`): A design, B photos, C bookings behind a flag | A done (#33); B done (#34); C in review (#35), merged only after a production backup (it runs 0014) |

Update the Status column when a phase lands.

### Notes

- **Images:**
  - Every form uses `ImagePicker` / `ImageListPicker`
    (`src/admin/components/ImagePicker.tsx`): upload, library or URL.
  - Nothing is deleted from R2 automatically; only a library delete removes
    an object.
  - Image URLs must be on the allow-list in `shared/image-hosts.ts` (Unsplash
    + the R2 origin). The same list builds the CSP's `img-src`. The
    Wikimedia photos from 0010 were copied into R2 (`npm run
    images:import`); 0013 puts any leftover back on its seed photo.
  - Photos come from the rows, never from code: no per-row overrides in
    `src/lib/mappers.ts` or the head tags. Credits are `image_credits`
    (keyed by URL), shown on `/photo-credits`, edited in *Admin → Photo
    credits*.
- **CSP** (`server/src/security-headers.ts`):
  - `script-src 'self'`: no inline scripts, no `eval`.
  - Anything the admin loads imports Zod from `shared/zod.ts` (jitless);
    importing `'zod'` directly brings back an `eval` probe the CSP reports.
  - A new external host (fonts, tiles, scripts) needs adding to the CSP;
    `server/test/browser-csp.test.ts` fails until it is.
- **Glass and buttons** (#12 parity, `docs/reviews/pr12-parity.md`):
  - Glass is `src/styles/glass.css`: `.glass` plus `--inverse`, `--strong`,
    `--subtle`, `--round`, `--3d` (edge light and the same-origin grain
    `/images/glass-noise.svg`) and `--card`. It's solid where
    `backdrop-filter` is missing or reduced transparency is on.
  - Write `-webkit-backdrop-filter` (and any `-webkit-` twin) *before* the
    standard property. The build (Lightning CSS) keeps only the last of the
    pair, and Chrome and Firefox ignore the prefixed one: in the other order
    no glass blurred outside Safari. `browser-glass` checks it.
  - Buttons are `.te-button` with `--primary`, `--secondary`, `--outline` or
    `--icon` (`index.css`): flat, softly rounded (icons round). Primary is
    the green with white text everywhere, photos included (mint with dark
    text in the dark theme); secondary is a sky tint on the page and a light
    edge on photos and dark sections. No gold Tailwind fills for buttons.
  - The header (`.te-nav`) is the page's own colour, 96% with a 24 px blur
    (#32: what scrolls under it is never readable), solid with reduced
    transparency. Only over the home photo at the top is it clear. Page
    headers (`PageHero`) start below it.
  - Cards: `src/styles/cards.css` (`.te-content-card`, badges, and the
    photo-first `.destination-card` of `/destinations` and the home page)
    and `home-destinations.css`. Tokens only, no hex.
  - Text on photos: the overlays are dark under the copy only
    (`--copy-edge`, and `--photo-top-shade` under the home page's clear header). When
    a light tint can't hold AA, darken the photo under the text, not the
    whole panel. `browser-contrast` measures it (sticky elements pinned).
- **Dialogs** (enquiry, search, hidden gem, photo story, the phone menu)
  use `useModalFocus`: focus trapped, Escape closes, the page behind inert
  and not scrolling. `html { scrollbar-gutter: stable }` keeps the
  scrollbar's space while scrolling is locked, so nothing shifts (#30).
- **Themes** (redesign PR 5): every colour is a token in
  `src/styles/tokens.css`, with dark values under `:root[data-theme="dark"]`.
  `public/theme-init.js` (a classic script, above the stylesheets) sets the
  theme before the first paint: the saved choice (`site:theme`, from the
  Navbar's toggle), else light (the system's setting doesn't count). Browser
  tests that need dark save the choice (`saveTheme`, `server/test/chrome.ts`). The maps swap to CARTO's `dark_all`
  tiles in place (`src/lib/mapTiles.ts`). `browser-contrast` measures AA on
  every page type in both themes, photos painted white (the worst case);
  `browser-hero-contrast` the photo headers. Text on a gold fill is
  `--on-accent`; `--brand-secondary` is a fill under white text, never text.
- **Error boundaries:** each public section is wrapped in `Section`
  (`src/pages/Section.tsx`, renders nothing on error), and each page in a
  boundary in `PublicLayout.tsx`; admin pages fall back to `PageCrash`.
- **Enquiries:**
  - The public insert's column list is `INQUIRY_INSERT_COLUMNS`
    (`shared/inquiry-schema.ts`); never read `status`, `admin_notes`, `spam`
    or `closed_at` from a request.
  - The honeypot in `InquiryModal` must stay its form's first child (Tailwind
    v4's `space-y-*` puts a margin on every child but the last).
  - `server/test/browser-inquiry.test.ts` compares its render against
    `d106be5` (the focus-trap PR).
- **Newsletter** (`server/src/routes/newsletter.ts`): the Footer form stores
  addresses; nothing sends them yet. Unsubscribing is a POST from the
  `/unsubscribe?token=` page (never a GET) and deletes the row. Its honeypot
  must stay the form's first child, as in `InquiryModal`.
- **Database TLS** (`shared/pg-connection.ts`): libpq's `sslmode` meanings.
  `require` encrypts without verifying, for Railway's public proxy; the
  deployed app uses the internal URL with no `sslmode`.
- **Site settings links** are NULL or `https://…` (migration 0004). An unset
  link renders without an `href`. `Footer.tsx` changed only for the Photo
  Credits link and the newsletter form (the #11 fix-forward).
- **Tests:** `npm test` runs `scripts/run-tests.mjs`: each file in its own
  process, 60 s per test, and every hook passes `HOOK_TIMEOUT`.
- **Tour routes** live in `tour_stops` (0007 replaced `tours.route`). A
  destination on a route can't be deleted (409). `resetContent()` re-adds
  `tours.route` and replays 0002 then 0007; keep 0007 re-runnable. Each
  reset adds and drops a column, and dropped columns count towards
  Postgres's 1600-column limit, so a long-used local test database
  eventually fails with "tables can have at most 1600 columns": recreate it.
  `scripts/route-stops.ts` mirrors its conversion for `verify:roundtrip`.

- **Bookings** (`server/src/routes/bookings.ts`, `shared/booking.ts`,
  `docs/BOOKING_*.md`): requests, not reservations; behind
  `BOOKINGS_ENABLED`. Off, every booking route is a JSON 404, `/booking` a
  404 page, and nothing links there (`navLinks(features)`, `useFeatures()`
  from `/api/content`). Migration 0014 runs either way. The guest cookie is
  `__Host-`, the database keeps its SHA-256 only; never log a request. GPS
  only on the button press; no geocoding service.

- **WhatsApp button** (`src/components/WhatsAppButton.tsx`,
  `shared/whatsapp.ts`):
  - Hidden while `site_settings.whatsapp_number` is NULL. A plain `wa.me`
    link: no widget, no script, no CSP change.
  - Its message links to the page the visitor is on (a tour, destination or
    experience), set by the page with `usePageSubject`.
  - It fades out over the map's zoom buttons and anything marked
    `data-keep-clear`, and hides while the enquiry or search modal is open.
- **Old links:** `/?tour=<id>` and `/?destination=<id>` must keep reaching
  the pages; they are in WhatsApp chats. `HomeRoute` (`src/App.tsx`)
  redirects them in the browser; phase 8b adds the server's 301. Keep both.
  It also sends the home page's old sections (`/#planner`, `/#journal`…)
  to their pages (`LEGACY_HOME_SECTIONS`, `shared/site-paths.ts`).
- **Pages and links** (phase 8):
  - Routes are in `src/App.tsx`; every public URL is built with `paths`
    (`shared/site-paths.ts`), and every link is a real `<a href>` (`Link`,
    or `SiteLink` for the nav, which scrolls instead when the target is on
    the current page).
  - `BrowserRouter`, not the data router: that one adds about 20 KB
    (gzipped) to every page, for scroll restoration we do in
    `src/lib/ScrollRestorer.tsx`.
  - Each page is a lazy chunk. Map code is only in the Explore and tour
    pages' chunks, and Leaflet (JS and its unpkg stylesheet) loads through
    `loadLeaflet()` (`src/lib/leaflet.ts`) when a map is about to render.
  - The Explore map frames the whole island first, and each filter's
    markers after, padded clear of every overlay (measured: the Map Guide,
    Quick Jump, the zoom buttons, the credit); a resize refits until the
    visitor moves the map. Markers that would overlap are nudged apart at
    each zoom. `browser-map-framing` checks it at three sizes, both themes.
    `npm run bundle:report` prints what each page type loads.
  - Navigations run in a transition: the URL changes a moment before the
    page. `<body data-route>` names the page actually on screen; tests wait
    on it.
  - `server/test/browser-home-baseline.test.ts` compares the home page's
    changed sections against each one's baseline commit (`SECTIONS`),
    pixel for pixel.
- **Head tags and statuses** (phase 8b, `server/src/pages/`):
  - Every page is the `index.html` shell, but Express gives each its own
    status (404 for unknown paths and unpublished slugs) and `<head>`
    (title, description, canonical, Open Graph, Twitter), between the
    `<!--page-meta-->` markers. A new page type needs its path added there.
  - Every injected value goes through `escapeHtml` (`shared/html.ts`).
  - Titles come from `shared/page-meta.ts`, and the brand from
    `shared/brand.ts`, for the client too.
  - `GET /llms.txt` (llmstxt.org) is Markdown built per request from the
    published rows and `paths`, like the sitemap, and only when
    `SITE_INDEXABLE` is true. Row text goes through `markdownText`.

### Where things live

- Seed content: `scripts/fixtures/*.ts`. It feeds `npm run seed:generate` and
  `npm run verify:roundtrip`. Nothing under `src/` may import it; the app reads
  everything from `GET /api/content`.

## Backlog

Agreed, not started. Each one gets its own plan first.

- **Responsive images:** `srcset` for the R2 photos, with 1920 px versions
  only for full-width heroes. Skip Jaffna and Udawalawe (the friend import's
  1920 px files are upscaled). Until then R2 keeps its 1280 px copies
  (`docs/reviews/friend-import.md`, section 5).

## Standing rules

- **Plan first, then stop.** Write the plan and wait for approval before
  writing any code.
- **Public design changes need evidence and a second approval.** Any change
  to markup, `className`, styles or layout of the public site (or the
  admin):
  - is called out in its plan first;
  - comes with before/after screenshots of every page it touches, at
    1280 px and 375 px, in light and dark once the dark theme exists
    (`npm run screenshots -- --base origin/main`, saved in
    `docs/screenshots/<branch>/`, which is git-ignored: screenshots are
    never committed). The PR description lists the pages that changed
    (from `summary.md`) and the author drags those before/after pairs into
    the PR on GitHub. A PR with no visual change says so, with the count of
    identical pairs, and no images;
  - is approved by the other teammate (never the author) before merging.

  A pixel test (`browser-home-baseline`, `browser-inquiry`) is re-baselined
  only for sections the PR changes on purpose, in that PR, and listed in
  its description. Tests are never deleted or weakened to get a change
  through. Merge with a merge commit, not a squash: the baselines are
  commits. The redesign's order and rules: `docs/plans/redesign-redo.md`.
- **One PR open at a time.** Merge it before starting the next. Nobody
  merges their own PR, and nobody merges on red CI.
- **Never run the Railway CLI.** It is linked at the home directory to a
  different project (`alluring-warmth`), not Teyvat.
- **`main` takes changes through pull requests.** Push a branch, open a PR,
  and wait for CI (`.github/workflows/ci.yml`, job `checks`). Merging deploys:
  Railway builds from `main` and *Wait for CI* holds it until CI passes.
- **Railway API service variables:**
  - `DATABASE_URL = ${{Postgres.DATABASE_URL}}`
  - `NODE_ENV=production`
  - `NPM_CONFIG_PRODUCTION=false`. Without it, `npm ci` skips vite and
    typescript and the build fails.
  - Do not set `PORT`. Railway injects it.
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
    `R2_PUBLIC_BASE_URL`: image uploads. All five or none; missing ones turn
    uploads off without stopping the site.
  - `RESEND_API_KEY`, `NOTIFY_EMAIL_TO` (and optionally `NOTIFY_EMAIL_FROM`):
    new-enquiry emails. Off without the first two.
  - `PUBLIC_SITE_URL`: the public `https://` origin. Every absolute URL the
    server writes comes from it (canonical, `og:url`, share images, the
    sitemap, `llms.txt`, the email's link). Unset: each request's own host.
  - `SITE_INDEXABLE`: `true` opens the site to search engines. Unset or
    anything else keeps them out (robots.txt `Disallow: /`, `noindex` on
    every page, no sitemap, no `llms.txt`). Launch checklist item 21.
  - `BOOKINGS_ENABLED`: `true` turns booking requests on. Unset or anything
    else keeps them off (the page and API are 404s). Launch checklist item 24.
- **Never log request data.** `errorHandler` logs errors through
  `describeForLog` (no Postgres `detail`, no request bodies). Enquiry names,
  emails and messages must never reach the logs.
- **The local API runs on port 8081**, because Apache holds 8080. Vite proxies
  `/api` there.
- **Local runs never use production.** `DATABASE_URL` is the local database
  (`localhost:5433/teyvat_dev`); the server and `migrate` refuse any other
  host unless `NODE_ENV=production` (`shared/database-target.ts`). Production
  from a laptop only through `PROD_DATABASE_URL` with `--prod`, in
  `admin:create`, `images:audit`, `images:import` and `media:rebase`, after
  the host is typed back.
- **The brand is undecided.** The code says "Travel Eye". Don't rename it, and
  don't add new brand strings.
- **`db/migrations/0002_seed.sql` is an upsert.** Never run it by hand against
  production. It overwrites admin edits.
- **Rotate the Postgres password before go-live.** It is on the launch
  checklist (`docs/LAUNCH-CHECKLIST.md`), with everything else before launch.

## Checks

CI runs all of these on every pull request and every push to `main`.

- `npm run typecheck`
- `npm run build`
- `npm test` (the browser tests need the build first)
- `npm run verify:roundtrip` must pass. It proves the rows the database stores
  map back to exactly the values the approved components render.
- The pixel tests (`browser-home-baseline`, `browser-inquiry`) pass against
  their baseline commits; a PR that changes a section's design moves that
  section's baseline, with screenshots and the other teammate's approval.
