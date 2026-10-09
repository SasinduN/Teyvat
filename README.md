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

**Stack:** Vite 7 · React 19 · TypeScript 5.9 (strict) · Tailwind CSS v4 ·
Framer Motion · Leaflet · React Router 7 · TanStack Query · React Hook Form +
Zod · Express 5 · PostgreSQL · Cloudflare R2 · Resend.

**More docs:**

- [`docs/SCHEMA.md`](docs/SCHEMA.md): every table.
- [`docs/RESTORE.md`](docs/RESTORE.md): recovering the database.
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
| `DATABASE_URL` | your **local** development database, e.g. `postgresql://postgres:<pw>@localhost:5432/teyvat_dev` |
| `TEST_DATABASE_URL` | your local **test** database, e.g. `postgresql://postgres:<pw>@localhost:5432/teyvat_test` |
| `VITE_CARTO_KEY` | optional: the map's tile key. Without it the map shows "API key required" tiles |

Never point `DATABASE_URL` at production for everyday work. Everything you
run (the dev server, migrations, scripts) acts on whatever it names.

`TEST_DATABASE_URL` is guarded, because the tests empty tables. The tests
refuse to start unless it:

- points at `localhost`,
- names a database ending in `_test`,
- **states its port**.

There's no fallback to a default host or port.

### 4. Databases

```bash
createdb -p 5432 teyvat_dev
createdb -p 5432 teyvat_test
npm run migrate        # applies db/migrations/*, including the seed content
```

Use the port your PostgreSQL listens on. The test database is migrated by the
tests themselves.

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
| `npm run migrate` | Apply pending migrations (`-- --dry-run` to list them) |
| `npm run seed:generate` | Regenerate `0002_seed.sql` from `scripts/fixtures/*.ts` |
| `npm run admin:create` | Create an admin, or `--reset-password` for an existing one |
| `npm run images:audit` | Read-only: stored image URLs the CSP would block |
| `npm run media:rebase` | Move stored image URLs to a new R2 base (`--from`, `--to`, `--dry-run`) |
| `npm run images:import` | Copy the Wikimedia photos the content uses into R2 and repoint rows and credits (`--dry-run`) |

---

## How it works

### The public site and the approved design

The public components in `src/components/` are the **approved, frozen design**.
They read their content through hooks under the names they used for their old
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

Any change in `src/components/` must be called out before it's made. Review
with `git diff demo-baseline -- src/components/`.

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

- **Collected:** what the visitor types into the form, and when.
- **Visible to:** signed-in admins only.
- **Kept:** closed enquiries are deleted 12 months after closing, spam after
  30 days, and open ones until someone closes or deletes them. An admin can
  delete any enquiry at any time.
- **IP addresses** are kept only by the rate limit, apart from the enquiry,
  for 24 hours.
- **Logs:** they never contain names, emails or messages. Errors are logged
  by code only.

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
  50 per email. Past a limit: 429 with `Retry-After`.

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
| | `https://fonts.googleapis.com` | the Google Fonts stylesheet |
| | `https://unpkg.com` | Leaflet's stylesheet, pinned by an integrity hash |
| `font-src` | `'self' https://fonts.gstatic.com` | the font files |
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
- Scripts run from a laptop against production (`migrate`, `admin:create`,
  `images:audit`, `images:import`, `media:rebase`) use the Postgres service's
  `DATABASE_PUBLIC_URL` with `?sslmode=require`. That is encrypted but not
  authenticated, because Railway's proxy certificate is self-signed.

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
| `PUBLIC_SITE_URL` | the public `https://` origin, for canonical links, share previews, the sitemap and the email's link (unset: each request's host) |
| `SITE_INDEXABLE` | `true` opens the site to search engines; anything else keeps them out (launch checklist item 21) |
| `VITE_CARTO_KEY` | the map's tile key. Read when the client is **built**, so a change needs a redeploy |

Don't set `PORT`; Railway injects it.

**CI:** `.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. typecheck;
2. build;
3. verify:roundtrip;
4. the full test suite, against a PostgreSQL service container, with Chrome
   for the browser tests.

`main` takes changes through pull requests, which must pass CI, and Railway's
*Wait for CI* holds each deploy until it has passed.
