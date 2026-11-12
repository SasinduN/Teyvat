# Teyvat — Travel Eye Sri Lanka

An inbound-tourism site for travellers visiting Sri Lanka, and the admin panel
that runs it.

- **Public site** (`/`): the approved marketing design, rendered from the
  database.
- **Admin panel** (`/admin`): sign-in, editing for all nine content
  collections and the site settings, a media library on Cloudflare R2, and the
  enquiry inbox.

One Express service serves both, plus the API (`/api/*`), from a single
origin, backed by PostgreSQL on Railway.

**Book Your Ride** (off unless `BOOKINGS_ENABLED=true`): `/booking` validates
pickup/drop-off, travel times, passengers and vehicle capacity, then opens a
prefilled WhatsApp chat using *Admin → Settings → WhatsApp number*. The visitor
reviews the draft and taps Send in WhatsApp. No ride enquiry is posted to admin.
Without a configured number, WhatsApp enquiries are unavailable; there is no
admin fallback. `/booking?tour=…` retains the existing tour request and admin
review flow. No prices, payments or live availability. See [`BOOKING_API`](docs/BOOKING_API.md),
[`BOOKING_DATABASE`](docs/BOOKING_DATABASE.md) and
[`BOOKING_SECURITY`](docs/BOOKING_SECURITY.md).

**Stack:** Vite 7 · React 19 · TypeScript 5.9 (strict) · Tailwind CSS v4 ·
Framer Motion · Leaflet · React Router 7 · TanStack Query · React Hook Form +
Zod · Express 5 · PostgreSQL · Cloudflare R2 · Resend.

**More docs:**

- [`docs/SCHEMA.md`](docs/SCHEMA.md): every table.
- [`docs/RESTORE.md`](docs/RESTORE.md): recovering the database.
- [`docs/runbooks/restore-from-backup.md`](docs/runbooks/restore-from-backup.md): a `db:backup` dump, and putting it back.
- [`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md): what's left before
  go-live.
- [`CLAUDE.md`](CLAUDE.md): working rules for this repo.

---

## Getting started

### 1. What you need

- **Node 22** (`engines` in `package.json`).
- **PostgreSQL 16 or later**, running locally.
- **Chrome**, for the browser tests. They're skipped, with a message, if it
  isn't found; point `CHROME_PATH` at it if it's somewhere unusual.

### 2. Clone and install

```bash
git clone https://github.com/SasinduN/Teyvat.git
cd Teyvat
npm ci
```

> For a clean local setup, make sure the checked-out repo sits at the project root itself. If the folder contains a nested `Teyvat-main` directory, move the files up one level before running the app or database scripts.

### 3. Environment

```bash
cp .env.example .env
```

Locally you need just two variables. The rest (R2, Resend, CARTO) are
optional, and the site runs without them.

| Variable | Locally |
| --- | --- |
| `DATABASE_URL` | your **local** development database: `postgresql://postgres:<pw>@localhost:5433/teyvat_dev` |
| `TEST_DATABASE_URL` | your local **test** database: `postgresql://postgres:<pw>@localhost:5433/teyvat_test` |
| `PROD_DATABASE_URL` | optional, only for the scripts that reach production with `--prod` (below) |
| `VITE_CARTO_KEY` | optional: CARTO's tile key. Without it the map uses attributed OpenStreetMap tiles in both themes |

`DATABASE_URL` is always the local database, and that's enforced: the server
and `npm run migrate` refuse to start with a host that isn't this machine
(`localhost`, `127.0.0.1`, `::1`) unless `NODE_ENV=production`, which only
Railway sets. Production is reached from a laptop only through
`PROD_DATABASE_URL`, by the scripts that need it, with `--prod` (below).

`TEST_DATABASE_URL` is guarded, because the tests empty tables. The tests
refuse to start unless it:

- points at `localhost`,
- names a database ending in `_test`,
- **states its port**.

There's no fallback to a default host or port.

### 4. Local database

The app needs PostgreSQL (18, as in CI and production) on this machine. This
guide uses port **5433**, so it can't collide with another PostgreSQL on the
default 5432.

1. Install PostgreSQL 18 and set its port to 5433 (the installer asks, or
   `port = 5433` in `postgresql.conf`, then restart the service).
2. Create the two databases:

   ```bash
   createdb -h localhost -p 5433 -U postgres teyvat_dev
   createdb -h localhost -p 5433 -U postgres teyvat_test
   ```

3. In `.env`:

   ```
   DATABASE_URL=postgresql://postgres:<password>@localhost:5433/teyvat_dev
   TEST_DATABASE_URL=postgresql://postgres:<password>@localhost:5433/teyvat_test
   ```

4. Apply the migrations, which include the seed content:

   ```bash
   npm run migrate
   ```

5. Add the local-only data, so the WhatsApp button shows:

   ```bash
   npm run seed:dev
   ```

   This sets the WhatsApp number to `94771236478`, which is **fake and only for
   testing**: it belongs to nobody, so don't message it. It's never in a migration, so
   it can't reach production, where the number is the one saved in *Admin → Settings*.
   The tests and `npm run screenshots` use it too; no test opens it.

The test database is migrated by the tests themselves. `npm run dev:server`
and `npm run dev` then run the site on this data.

### 5. An admin login

```bash
npm run admin:create -- --email you@example.lk --name "Your Name"
```

The password is typed twice at a hidden prompt, 12 characters at least. It's
never accepted as an argument, so it never lands in shell history.

### 6. Test

```bash
npm test               # every test file, each in its own process
npm test -- media      # only files whose names contain "media"
```

### 7. Run

Development needs two processes, the API and Vite:

```bash
npm run dev:server     # API on http://localhost:8081
npm run dev            # site on http://localhost:5173, admin at /admin
```

Vite proxies `/api` to port 8081 (`vite.config.ts`); 8081 because a local
Apache often holds 8080. To run exactly what deploys, one process:

```bash
npm run build && npm start     # everything on http://localhost:8081
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `dev:server` | Vite (client) / the API with reload |
| `npm run build` | Typecheck, build the client, bundle the server |
| `npm start` | Run the built server: `/api/*` and `dist/` |
| `npm run typecheck` | `tsc --noEmit` over client, server, shared and scripts |
| `npm test` | All tests (API, database, and headless Chrome), with time limits |
| `npm run verify:roundtrip` | Proves the database round-trip renders the approved content unchanged |
| `npm run bundle:report` | After a build: the gzipped JS and CSS each page type loads |
| `npm run screenshots` | Before/after screenshots of a design change at 1280 px and 375 px (`-- --base origin/main`, `--pages /,/about`, `--dark`), into `docs/screenshots/<branch>/` (git-ignored), with a `summary.md` of which pairs differ. Every page type, the phone menu, the enquiry form and the map with a place picked. `--base b46de13` compares against #12's design. In Git Bash, prefix it with `MSYS_NO_PATHCONV=1` when passing `--pages` `--live-photos <site URL>` uses that site's public R2 photos. `--header-floating` takes only the twelve pairs for the header, its dropdowns and the floating buttons. |
| `npm run migrate` | Apply pending migrations (`-- --dry-run` to list them) |
| `npm run db:backup` | A full `pg_dump` (custom format) to `backups/<date>-<time>.dump`, git-ignored; prints its size and table count. Read-only (`--prod`). Restoring: [`docs/runbooks/restore-from-backup.md`](docs/runbooks/restore-from-backup.md) |
| `npm run seed:generate` | Regenerate `0002_seed.sql` from `scripts/fixtures/*.ts` |
| `npm run seed:dev` | Local database only: the fake WhatsApp number, if none is saved |
| `npm run admin:create` | Create an admin, or `--reset-password` for an existing one (`--prod`) |
| `npm run images:audit` | Read-only: stored image URLs the CSP would block (`--prod`) |
| `npm run media:rebase` | Move stored image URLs to a new R2 base (`--from`, `--to`, `--dry-run`, `--prod`) |
| `npm run images:import` | Copy the Wikimedia photos the content uses into R2 and repoint rows and credits (`--dry-run`, `--prod`) |
| `npm run content:import` | Researched destinations and attractions (`scripts/content/places.json`) into the database as drafts, photos to R2 with credits; never overwrites an admin's edit (`--dry-run`, `--prod`, `--skip-photos`) |

These four use the local database. **`--prod`** runs one against production
instead: it reads `PROD_DATABASE_URL` (the Postgres service's
`DATABASE_PUBLIC_URL` with `?sslmode=require`), prints the host and
database, and goes on only once you type the host back. It runs only in an
interactive terminal. Nothing else reaches production from a laptop;
production is migrated by its own deploy.

---

## How it works

### The public site and its design

The public components are in `src/components/`. They read their content through hooks under the names they used for their old
hard-coded constants, so their markup never changed:

```ts
const DESTINATIONS = useDestinations();
```

`src/hooks/useSiteContent.ts` makes one `GET /api/content` request (published
rows only, in `sort_order`), and the mappers in `src/lib/mappers.ts` turn rows
into the exact shapes the components expect.

`npm run verify:roundtrip` proves that conversion is lossless against the
original content in `scripts/fixtures/` (which nothing under `src/` may
import).

A design change is called out in its plan, comes with before/after
screenshots at 1280 px and 375 px (`npm run screenshots -- --base
origin/main`; not committed, attached to the PR on GitHub), and is approved
by Sasindu, the project's design approver, before it merges.
The pixel tests (`browser-home-baseline`, `browser-inquiry`) move their
baselines only for the sections a PR changes on purpose. See CLAUDE.md and
`docs/plans/redesign-redo.md`.

Each section of a page has its own error boundary (`src/pages/Section.tsx`).
A section that throws disappears and the rest of the page stays; only if the
whole page fails does the "Something went wrong" screen show, in that page's
place (`src/pages/PublicLayout.tsx`).

### Data flow

```
Postgres ─published rows─▶ GET /api/content ─▶ mappers ─▶ useSiteContent ─▶ components
InquiryModal ─▶ POST /api/inquiries (visitor fields only) ─▶ inquiries ◀─ /api/admin/inquiries ◀─ inbox
/admin/login ─▶ POST /api/auth/login ─▶ session cookie ─▶ GET /api/auth/me ─▶ AuthContext
/admin/*     ─▶ /api/admin/* (requireAdmin + same-origin) ─▶ Postgres / R2
```

`GET /api/content` is sent `Cache-Control: no-cache`, so an admin's save shows
on the next page load.

### The admin panel

Forms and list views are generated from field descriptors in
`shared/content-schema.ts`, with icons and labels added in
`src/admin/collections.ts`. The same descriptors build the Zod schema that both
the form and the API run, and they are also the API's column allow-list: SQL
column names never come from a request.

| Route | Result |
| --- | --- |
| `GET /api/admin/content/:table` | every row, drafts included, in `sort_order` |
| `GET /api/admin/content/:table/count` | `{ count }` |
| `GET` / `PUT` / `DELETE /api/admin/content/:table/:id` | one row; `PUT` takes `{ values, expectedUpdatedAt }` |
| `POST /api/admin/content/:table` | 201; added at the end of the list |
| `PATCH /api/admin/content/:table/:id/published` | `{ published }` |
| `PUT /api/admin/content/:table/order` | `{ ids }`: all of them, one transaction |
| `GET` / `PUT /api/admin/site-settings` | the single settings row |
| `/api/admin/media` | upload, library, usage, delete (see Images) |
| `/api/admin/inquiries` | inbox, counts, CSV export (see Enquiries) |

Rules the API enforces:

- **Validation errors** are 400 with a message per field (`error.fields`).
- **Slugs** can't change after creation; `count` and `order` are reserved.
- **Concurrent edits:** saving a version that someone else has already
  replaced gets 409.
- **Reorder** is all or nothing.
- **Hero:** the last published hero slide can't be unpublished or deleted.
- **Destinations:** only the first 6 featured destinations show in the
  spotlight, and the list marks the rest "Featured · not shown".
- **Site settings links** are `https://` or empty.

A page that throws shows an error card in place of the page, and the sidebar
keeps working.

### Images and the media library

Every image field offers three ways in: **upload**, pick from the **library**,
or paste a **URL**. A pasted URL must be from Unsplash or our R2 bucket (see
the CSP below).

- **Before upload, in the browser:**
  - rotated by its EXIF orientation;
  - scaled to at most 2000 px wide (and within iOS Safari's canvas limit);
  - re-encoded as WebP (JPEG where WebP isn't available), which also strips
    EXIF, including GPS location.

  HEIC the browser can't read gets an "export as JPEG" message. A photo too
  large to process is refused with a message, never uploaded blank.
- **On the server:**
  - the file type comes from the bytes: JPEG, PNG, WebP and AVIF only;
  - SVG is refused, because it can carry scripts;
  - the limit is 10 MB;
  - objects are stored as `<folder>/<timestamp>-<random>.<ext>` with a
    one-year immutable cache.
- **Nothing is deleted automatically.** A replaced image shows as **Unused**
  in the library until an admin deletes it there. Deleting one still in use
  lists the rows using it and asks again.
- **Without R2 configured** the site runs, uploads say "not configured", and
  the library and URLs keep working.
- **Photo credits** (`public.image_credits`, *Admin → Photo credits*): the
  photographer and licence of a photo, keyed by its URL. `/photo-credits`,
  linked from the Footer, lists the credits of every photo a published row
  uses. CC BY-SA photos (the Wikimedia ones) must have one.
- **`npm run images:import`** copies each Wikimedia photo in use into R2 (as
  a library upload), then rewrites every image field still holding that URL,
  and moves its credit, in one transaction per photo. Downloads go one at a
  time, two seconds apart, with a User-Agent naming the project, and honour
  `Retry-After`. Run `-- --dry-run` first; it's safe to re-run. Since
  migration 0013 the CSP no longer allows Wikimedia, and any row still on a
  0010 Wikimedia photo is back on its seed photo.
- **`npm run content:import`** writes `scripts/content/places.json` (sources:
  `docs/reviews/places-sources.md`) as unpublished drafts, each photo downloaded from Commons the
  same polite way, put in R2 and credited. It records what it wrote in `content_imports` and
  updates a row only while nobody has saved it since, so an edit in the admin is never
  overwritten and a row deleted there isn't created again. Run `-- --dry-run` first; it's safe to
  re-run. For a local database with no R2, `-- --skip-photos`.

### Newsletter

- **Sign-up:** the Footer's form posts to `POST /api/newsletter`, with a
  honeypot and a limit of 10 requests per 15 minutes per IP. The answer is the
  same for a new address, a repeat and a bot, so it can't be used to test who
  is subscribed. A consent line under the button links to the privacy policy.
- **Unsubscribe:** every subscriber has a random `unsubscribe_token`.
  `newsletterUnsubscribeUrl(origin, token)` (`shared/site-paths.ts`) builds
  the link every newsletter email must carry. It opens `/unsubscribe`, whose
  button posts `POST /api/newsletter/unsubscribe` and **deletes** the address.
  The page itself changes nothing, so a mail scanner following the link
  can't unsubscribe anyone.
- **Nothing sends newsletters yet.** Addresses are only stored (launch
  checklist).

### Enquiries

- **Public form:** `POST /api/inquiries` inserts the visitor's fields only, so
  status, notes and the spam flag are always the server's. A hidden honeypot
  marks bots as spam, and spam is kept for 30 days in case a real person was
  caught. There's a rate limit of 5 per 15 minutes and 20 per day per IP.
- **Inbox** (*Admin → Enquiries*):
  - statuses: new, contacted, closed, plus a Spam filter;
  - notes, saved with the same 409 rule as content;
  - permanent delete;
  - CSV export. Cells starting with `=`, `+`, `-`, `@`, a tab or CR get a
    leading `'`, so Excel can't run a stranger's formula. Plain phone numbers
    are written as `="+94 77 123 4567"`, so Excel shows them as text.
- **Getting noticed:** the sidebar and the tab title show the number of new
  enquiries. With `RESEND_API_KEY` and `NOTIFY_EMAIL_TO` set, a short email
  also goes out: at most one every 15 minutes, with no enquiry details in it.
  Until a sending domain is verified, Resend only delivers to the Resend
  account's own address.

**Privacy (for the privacy policy page):**

- The wishlist stays in the visitor's browser (localStorage). The server never sees it,
  unless they choose to send it as an enquiry.

- **Collected:** what the visitor types into the form, and when.
- **Visible to:** signed-in admins only.
- **Kept:** closed enquiries are deleted 12 months after closing, spam after
  30 days, and open ones until someone closes or deletes them. An admin can
  delete any enquiry at any time.
- **IP addresses** are kept only by the rate limit, apart from the enquiry,
  for 24 hours.
- **Logs:** they never contain names, emails or messages. Errors are logged
  by code only.

**Booking requests** (when `BOOKINGS_ENABLED`; `docs/BOOKING_DATABASE.md`):
contact details and the places sent (GPS coordinates only if the traveller
pressed the button), seen by admins and, for 30 days, by the browser that
sent them. Requests that ended (completed, declined, cancelled) are deleted
12 months after their last change; open ones stay until staff close them. The
rate limits keep IP addresses for 24 hours. Status emails go through Resend.

---

## Security

### Sign-in and sessions

- **Every user is an admin.** There's no sign-up page; accounts come from
  `npm run admin:create`.
- **Passwords:** argon2id.
- **Sessions:** the cookie is `__Host-teyvat_session` (`HttpOnly`, `Secure`,
  `SameSite=Strict`) and carries a random token; the database stores only its
  SHA-256. A session lasts 7 days from sign-in. There's sign-out and
  sign-out-everywhere.
- **Same-origin check:** every state-changing `/api` request must carry our
  own `Origin` (or `Sec-Fetch-Site: same-origin`), or it gets 403.
- **Unknown email and wrong password** get the same 401, with the same argon2
  work, so the response doesn't reveal which it was.
- **Sign-in limits** over 15 minutes: 5 failures per (email, IP), 20 per IP,
  50 per email. Past a limit: 429 with `Retry-After`. Once 3 or fewer
  remain, the 401 carries `attemptsLeft`: the (email, IP) pair's count only,
  the same for an unknown email. The login page shows it, and counts down a
  429's `Retry-After` with the button disabled.

The per-IP limits rely on `req.ip` being the visitor, not Railway's proxy
(`app.set('trust proxy', 1)`). To check it after a proxy change:

1. Make one wrong sign-in from a laptop.
2. Make one from a phone on mobile data.
3. Run
   `select ip from public.login_attempts order by attempted_at desc limit 5;`.

It must show two different public addresses.

### Headers

`server/src/security-headers.ts` sets these on every response the built server
sends. They don't apply under `npm run dev`, where Vite serves the page.

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | below |
| `Strict-Transport-Security` | `max-age=86400` over HTTPS; raised at launch |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

**The Content-Security-Policy, and why each source is allowed:**

| Directive | Sources | Why |
| --- | --- | --- |
| `script-src` | `'self'` | our own bundles only: no inline scripts, no `eval` |
| `style-src` | `'self' 'unsafe-inline'` | our CSS, and the `<style>` the admin's toasts inject |
| `font-src` | `'self'` | our DM Sans files (`src/styles/fonts.css`) |
| `img-src` | `'self' https://images.unsplash.com` | the seeded photos |
| | the `R2_PUBLIC_BASE_URL` origin | uploads; read at boot, so a new domain needs no code change |
| | `https://basemaps.cartocdn.com` | the map tiles (exactly that host; a `*.` wildcard wouldn't match it) |
| `connect-src` | `'self'` | the browser only calls our own `/api` |
| `frame-ancestors` | `'none'` | nobody may frame the site |
| `base-uri` / `form-action` / `object-src` | `'self'` / `'self'` / `'none'` | |

The image hosts live in `shared/image-hosts.ts`, which also drives the admin's
image-URL validation, so an admin can't save an image the browser would
refuse. `npm run images:audit` lists any stored image the CSP would block.

Zod runs in `jitless` mode (`shared/zod.ts`). Otherwise it probes for `eval`
on every admin page, which `script-src 'self'` reports as a violation.

`server/test/browser-csp.test.ts` loads the built site in headless Chrome,
walks the public page and the signed-in admin, and fails on any CSP
violation.

---

## Database

Migrations are in `db/migrations/`. They're applied in order by
`npm run migrate`, which records each one in `public.schema_migrations`, so
re-running it is safe. Deploys run it on every start. Every table is described
in [`docs/SCHEMA.md`](docs/SCHEMA.md).

> [!WARNING]
> **Never run `0002_seed.sql` by hand against production.** Every statement is
> an upsert keyed on the slug, so it silently overwrites every admin edit to
> those rows: copy, order, drafts and images. The runner applies it once and
> never again. The danger is only in pasting it into a SQL console.

**Backups and restore:** see [`docs/RESTORE.md`](docs/RESTORE.md) (Railway
point-in-time recovery).

**TLS** (`shared/pg-connection.ts`) follows libpq's `sslmode` meanings:

| `sslmode` | TLS | Verifies the certificate |
| --- | --- | --- |
| none, `disable` | no | |
| `allow`, `prefer`, `require` | yes | no |
| `verify-ca`, `verify-full` | yes | yes |
| `no-verify` | yes | no |

- The deployed service uses the internal `${{Postgres.DATABASE_URL}}`, with
  no `sslmode`: its traffic never leaves Railway's private network. It logs a
  warning at start-up if given anything else.
- The scripts that reach production from a laptop with `--prod`
  (`admin:create`, `images:audit`, `images:import`, `content:import`, `media:rebase`) read
  `PROD_DATABASE_URL`: the Postgres service's `DATABASE_PUBLIC_URL` with
  `?sslmode=require`. That is encrypted but not authenticated, because
  Railway's proxy certificate is self-signed.

---

## Deployment (Railway)

`main` deploys automatically: Railway builds from GitHub.

- **Build:** `npm run build`.
- **Start:** `npm run migrate && node server/dist/index.js`. A failed
  migration stops the deploy before any traffic arrives.
- **Health check:** `/api/health`. Only the database can fail it; the `media`
  field is informational.

**Map tiles.** The map uses CARTO's Voyager basemap
(`src/lib/mapTiles.ts`), which needs `VITE_CARTO_KEY`.

- **The key is public.** Vite builds it into the page, so it's protected by
  restriction, not secrecy. **Restrict it by domain in the CARTO dashboard,
  and add the real domain to it at launch** (launch checklist). Add
  `localhost` too if local development should show real tiles.
- **Credit is required.** The map shows "© OpenStreetMap contributors ©
  CARTO", as the OpenStreetMap licence and CARTO's terms require; don't hide
  it.

**Variables on the API service:**

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (the internal reference) |
| `NODE_ENV` | `production` |
| `NPM_CONFIG_PRODUCTION` | `false` (otherwise `npm ci` skips the build tools) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` | image uploads: all five or none |
| `RESEND_API_KEY`, `NOTIFY_EMAIL_TO` (+ optional `NOTIFY_EMAIL_FROM`) | new-enquiry emails |
| `PUBLIC_SITE_URL` | the public `https://` origin, for canonical links, share previews, the sitemap, `llms.txt` and the email's link (unset: each request's host) |
| `SITE_INDEXABLE` | `true` opens the site to search engines (and serves `/sitemap.xml` and `/llms.txt`); anything else keeps them out (launch checklist item 21) |
| `BOOKINGS_ENABLED` | `true` turns booking requests on (`/booking`, its API, the links, *Admin → Bookings*); anything else keeps them off (launch checklist item 24) |
| `VITE_CARTO_KEY` | the map's tile key. Read when the client is **built**, so a change needs a redeploy |

Don't set `PORT`; Railway injects it.

**CI:** `.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. typecheck;
2. build;
3. verify:roundtrip;
4. the full test suite, against a PostgreSQL service container, with Chrome
   for the browser tests.

A change that touches only Markdown (`README.md`, `CLAUDE.md`, `docs/`, but not
`docs/screenshots/`) skips those four steps; the `checks` job still runs and passes,
so merging isn't blocked. A newer push to a pull request cancels its older run.

`main` takes changes through pull requests, which must pass CI, and Railway's
*Wait for CI* holds each deploy until it has passed.

## Licence

Proprietary: all rights reserved. See [LICENSE](LICENSE); no use without written permission.
