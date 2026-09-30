# Teyvat — Travel Eye Sri Lanka

Inbound-tourism site for foreign travellers visiting Sri Lanka, plus the admin
panel that manages its content.

- **Public site** — `/` — the approved marketing design, now rendered entirely
  from the database.
- **Admin panel** — `/admin` — email/password sign-in on the API's own
  sessions, full CRUD for all nine content collections and the site settings
  through `/api/admin/*`, and a media library backed by Cloudflare R2. The
  enquiry inbox returns in phase 6.

Stack: Vite 7 · React 19 · TypeScript 5.9 (strict) · Tailwind CSS v4 ·
Framer Motion · Leaflet · React Router v7 · Supabase (Postgres, Auth, Storage) ·
TanStack Query · React Hook Form + Zod · Sonner.

Schema reference: [`docs/SCHEMA.md`](docs/SCHEMA.md).

---

## 1. Database

Migrations live in `db/migrations/` and are applied by the repo's own runner:

```bash
npm run migrate                 # apply every pending file, in order
npm run migrate -- --dry-run    # list what would be applied, change nothing
```

Applied files are tracked in `public.schema_migrations`, so this is safe to run
on every boot — it is part of the Railway start command. It needs `DATABASE_URL`
in the environment.

- **Deployed:** Railway injects it as a reference to the Postgres service's
  internal `DATABASE_URL`, so traffic stays on the private network.
- **Local:** put the Postgres service's `DATABASE_PUBLIC_URL`
  (`*.proxy.rlwy.net`) in `.env` as `DATABASE_URL`, with `?sslmode=require`
  appended. The internal host does not resolve outside Railway.

The files:

- `0001_init.sql` — tables, CHECK constraints, `updated_at` triggers, the
  `users`/`sessions` auth tables and the single-row `site_settings`. Idempotent:
  re-running it is a no-op and never overwrites live data.
- `0003_login_attempts.sql` — the sign-in throttle's counters.
- `0004_site_settings_links.sql` — each footer link becomes NULL or
  `https://…`. The `#instagram`-style placeholders become NULL, and the Footer
  renders an unset link without an `href`.
- `0005_media.sql` — the media library: one row per image uploaded to R2.
- `0002_seed.sql` — the approved baseline content: 63 rows across all nine
  content tables (20 destinations, 6 experience types, 4 featured experiences,
  4 tours, 6 articles, 8 hidden gems, 8 photo stories, 3 hero slides,
  4 pillars). Generated from `scripts/fixtures/*.ts` by `npm run seed:generate`.

> [!WARNING]
> **Never run `0002_seed.sql` by hand against production after go-live.**
>
> Every statement in it is `on conflict (id) do update`, keyed on the slug. That
> makes it safe and useful *before* go-live — it resets content to the approved
> baseline — but afterwards it is a destructive overwrite. Re-running it silently
> replaces every edit an admin has made to any of those 63 rows: rewritten
> copy, reordered `sort_order`, unpublished drafts flipped back to published, and
> uploaded images reverted to the original Unsplash URLs. There is no undo and no
> warning; the run reports success.
>
> The runner will not do this to you — `schema_migrations` records the file as
> applied and skips it forever after. The danger is only in pasting the file into
> a SQL console, or in deleting its `schema_migrations` row. Content edits made
> through the admin panel are not in version control; the seed file is. Treat it
> as a first-boot fixture, not a repair tool.

## 2. Configure the app

```bash
cp .env.example .env.local
```

These are only needed for the admin panel and the enquiry form, which move off
Supabase in later phases. The public site reads everything from `/api/content`
and renders without them; the enquiry form then says it can't send.

Fill in from **Project Settings → API Keys**:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use the **new key format** (`sb_publishable_...`). The legacy `anon` JWT
(`eyJ...`) is deprecated and stops working at the end of 2026 — do not use it.

The publishable key is safe in the browser — every table is protected by Row
Level Security. **Never** put the secret key (`sb_secret_...`) or a legacy
`service_role` key in `.env.local` or anywhere under `src/`: Vite inlines every
`VITE_*` variable into the client bundle.

## 3. Create your first admin

Every user is an admin; a row in `public.users` is what grants access to
`/admin`. There is no sign-up page and no HTTP route that creates a user. Use
the script:

```bash
npm run admin:create -- --email you@example.lk --name "Your Name"
```

It asks for the password twice at a hidden prompt (12–1024 characters). The
password is never accepted as an argument, so it cannot end up in shell history.

- **It runs against `DATABASE_URL`.** In the local `.env` that is production, and
  that is how the first admin gets into the deployed site. The script prints
  which database it connected to before it asks for anything.
- **After the phase 3 deploy, nobody can sign in until this has been run.** The
  `users` table starts empty.
- An existing email is refused. To replace its password, add
  `--reset-password`. That also ends all of that user's sessions and clears
  the email's failed sign-in attempts.
- It warns if the email is `site_settings.contact_email`. The Footer shows that
  address to every visitor, so it makes a poor login.

## 4. Run it

Development needs **two processes**: the API, and Vite for the client. In
production a single Express service serves both, so there is one origin and no
CORS — the dev proxy reproduces that arrangement locally.

```bash
npm install
npm run dev:server   # API on http://localhost:8081
npm run dev          # client on http://localhost:5173  (admin at /admin)
```

Vite proxies `/api` to port 8081 (`vite.config.ts`). 8081 rather than 8080
because a local Apache/XAMPP commonly holds 8080; change both together if you
move it.

### Tests

```bash
npm test
```

The API tests (`server/test/`, `node:test` through tsx) start the real app on a
random port and call it with `fetch`. They need a local Postgres database of
their own, named in `.env`:

```
TEST_DATABASE_URL=postgresql://postgres:<password>@localhost:<port>/teyvat_test
```

The tests apply every migration to it and empty `users`, `sessions` and
`login_attempts` between cases. So they refuse to start, with no fallback to a
default host or port, unless `TEST_DATABASE_URL`:

- is set,
- points at `localhost`,
- names a database ending in `_test`,
- includes an explicit port.

Create the database once with `createdb -p <port> teyvat_test` (or
`create database teyvat_test;` in psql).

The tests never touch R2: the test setup clears every `R2_*` variable, and
the upload tests use an in-memory store. `server/test/browser-image.test.ts`
checks the browser's image preparation (EXIF rotation, HEIC, large photos) in
a real headless Chrome. It finds the installed Chrome, or `CHROME_PATH`, and is
skipped with a message if there is none.

To run exactly what deploys:

```bash
npm run build && npm start   # everything on http://localhost:8081
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (client only) |
| `npm run dev:server` | API with reload on change |
| `npm run build` | Typecheck, build the client, bundle the server |
| `npm run build:server` | Bundle the server only (esbuild) |
| `npm start` | Run the built server — serves `/api/*` and `dist/` |
| `npm run migrate` | Apply pending migrations |
| `npm run admin:create` | Create an admin, or `--reset-password` for an existing one |
| `npm test` | API tests against `TEST_DATABASE_URL` |
| `npm run typecheck` | `tsc --noEmit` across client, server, shared and scripts |
| `npm run preview` | Vite's own preview of the client build |
| `npm run seed:generate` | Regenerate `0002_seed.sql` from `scripts/fixtures/*.ts` |
| `npm run verify:roundtrip` | Assert the DB round-trip renders identical content |
| `npm run images:migrate` | Legacy: pulls seeded images into Supabase Storage. Not used; phase 7 removes it with Supabase |

---

## Architecture

### Keeping the public design untouched

The approved components were not redesigned. Each one previously imported or
held its content as a constant:

```ts
import { DESTINATIONS } from '../data/destinations';
```

and now reads it under the same name:

```ts
const DESTINATIONS = useDestinations();
```

`src/hooks/useSiteContent.ts` makes one `GET /api/content` request through
TanStack Query, so every component reads from a single shared cache entry. That
covers the nine content collections plus the Footer's contact details and links
from `site_settings`. Review any change to the components against the approved
design with `git diff demo-baseline -- src/components/`.

`npm run verify:roundtrip` proves this is lossless: it pushes the original
`scripts/fixtures/*.ts` content through the same shape transformation the seed performs,
back through the runtime mappers, and asserts deep equality against what the
components used to import — ordering, optional-field presence and the article
date strings included.

`scripts/fixtures/*.ts` is retained as the seed's source of truth and as that
test's fixture. It lives outside `src/` so the running app cannot import it.

### Data flow

```
Postgres ──published rows──▶ GET /api/content ──▶ lib/api/content.ts ──mappers──▶ useSiteContent ──▶ components

InquiryModal ──RLS INSERT (anon)──▶ public.inquiries ◀──RLS (admin)── /admin/inquiries

/admin/login ──POST /api/auth/login──▶ session cookie ──GET /api/auth/me──▶ AuthContext

/admin/* ──lib/api/admin.ts──▶ /api/admin/* (requireAdmin + same-origin) ──▶ Postgres
```

Admin mutations invalidate the query keys they touch (`src/lib/queryClient.ts`),
including `siteContent` — so a save is reflected on the public site without a
reload. Reordering is optimistic and rolls back if the write fails.

`GET /api/content` is sent with `Cache-Control: no-cache`: the browser
revalidates it on every page load, so a save shows up on the next load.

### Admin API

Every route is behind `requireAdmin` and answers with `Cache-Control:
no-store`. Every write also passes the same-origin check.

| Route | Result |
| --- | --- |
| `GET /api/admin/content/:table` | every row, drafts included, in `sort_order` |
| `GET /api/admin/content/:table/count` | `{ count }` |
| `GET /api/admin/content/:table/:id` | one row, or 404 |
| `POST /api/admin/content/:table` | 201; the row is added at the end of the list |
| `PUT /api/admin/content/:table/:id` | `{ values, expectedUpdatedAt }`; 409 if saved by someone else since |
| `PATCH /api/admin/content/:table/:id/published` | `{ published }` |
| `DELETE /api/admin/content/:table/:id` | 204 |
| `PUT /api/admin/content/:table/order` | `{ ids }`: every id, in order, one transaction |
| `GET` / `PUT /api/admin/site-settings` | the single row; `PUT` takes `{ values, expectedUpdatedAt }` |

Rules the API enforces:

- **Validation.** Errors are 400 with a message per field, in
  `error.fields` (`"itinerary.2.title": "Each day needs a title."`).
- **Slugs.** A slug can't change after a row is created. `count` and `order`
  are reserved.
- **Concurrent edits.** Saving a version someone else has already replaced gets
  409, and the editor offers to load the saved version.
- **Reorder** is all or nothing. If the list changed underneath (a row added or
  deleted), it gets 409 and nothing is written.
- **Hero.** The last published hero slide can't be unpublished or deleted.
- **Site settings links** are `https://` or empty (stored as NULL);
  `contact_email` must be an email.

### Sign-in and sessions

- **Passwords** are argon2id (19 MiB, 2 passes, 1 lane) via `@node-rs/argon2`.
- **Sessions** live in `public.sessions`. The cookie is
  `__Host-teyvat_session` (`HttpOnly; Secure; SameSite=Strict; Path=/`) and
  carries a random 32-byte token. The table stores only its SHA-256.
  - A session lasts 7 days from sign-in; activity does not extend it.
  - *Sign out* deletes the session. *Sign out everywhere* deletes all of the
    user's sessions.
- **Every state-changing `/api` request** must carry an `Origin` equal to the
  site's own origin, or `Sec-Fetch-Site: same-origin` if there is no Origin.
  Otherwise it gets 403.
- **Unknown email and wrong password** give the same 401, "Incorrect email or
  password." Both run exactly one argon2 verify; an unknown email is checked
  against a dummy hash, so the timing doesn't reveal which case it was.
- **Brute-force limits.** Failures are counted in `public.login_attempts` over a
  rolling 15 minutes:
  - 5 per (email, IP),
  - 20 per IP,
  - 50 per email across all IPs.

  Past a limit, sign-in returns 429 with `Retry-After`, checked before any
  password is verified. A successful sign-in clears that email's failures.
- **Housekeeping.** Expired sessions and attempts older than 24 hours are swept
  at boot and hourly.

### Security: check that `req.ip` is the real visitor

The per-IP limit counts failures by `req.ip`. Express derives it from
`X-Forwarded-For` because of `app.set('trust proxy', 1)` in
`server/src/app.ts`, which trusts exactly one proxy hop: Railway's edge.

If Railway's proxy arrangement ever changes so that `req.ip` becomes the
proxy's own address, every visitor shares one "IP". "20 failures per IP" then
becomes **a site-wide sign-in lockout** that anyone can trigger with 20 wrong
passwords.

After every deploy that touches the proxy settings (and once after the first
phase 3 deploy):

1. Enter one wrong password at `/admin/login` from a laptop.
2. Enter one wrong password from a phone on **mobile data**, not the same
   Wi-Fi.
3. Look at the stored addresses:

   ```sql
   select ip, attempted_at from public.login_attempts order by attempted_at desc limit 5;
   ```

   The two attempts must show **two different public addresses**. If they show
   the same address, or a private one such as `10.x` or `100.64.x`, then
   `req.ip` is the proxy. Fix `trust proxy` before relying on the limits.

### Security model (Supabase side, until phases 5–6)

The table below describes the parts of the site that still run on Supabase:
the enquiry form and inbox, and image storage. Sign-in and content editing no
longer do.

| Actor | Content tables | `inquiries` | `media` bucket |
| --- | --- | --- | --- |
| Anonymous | `SELECT` where `published` | `INSERT` only | read |
| Signed in, not an admin | same as anonymous | `INSERT` only | read |
| Admin (`public.admins` row) | full read/write | full read/write | read/write |

Authorisation lives in Postgres. `public.is_admin()` is a `SECURITY DEFINER`
function consulted by every write policy; the React route guard only decides
what to *render*. The anon insert policy on `inquiries` also pins `status` to
`'new'` and forbids `admin_notes`, so a visitor cannot forge a handled enquiry.

### The admin panel is schema-driven

Every list view and edit form is generated from field descriptors in
`shared/content-schema.ts`; `src/admin/collections.ts` adds the icons, labels
and list-view columns. Adding a column means adding one field descriptor — no
new page components. Supported field types: `text`, `textarea`, `slug`,
`number`, `select`, `multiselect`, `image`, `imageList`, `stringList`, `date`,
`boolean`, `itinerary`, `email`, `link`.

The *same* descriptors generate the Zod schema (`schemaForTable`), which the
admin form and the API both run, so validation can never drift between them.
The API also uses the descriptors as its column allow-list: SQL column names
never come from a request. That schema is also the coercion layer:
number inputs arrive as strings and are coerced, text is trimmed, blank optional
text becomes `null` (so the mapper yields `undefined` and the public component
renders exactly as it did with hardcoded data), empty list rows are dropped, and
itinerary days are renumbered 1..n. React Hook Form therefore hands the mutation
a payload that is ready for Postgres, and the database `CHECK` constraints
become a backstop rather than the first line of defence.

The admin bundle is lazy-loaded, so a traveller on the marketing site never
downloads the CMS — Zod, React Hook Form and Sonner all ship in that chunk.

### Images and the media library

Every image field offers three ways in: **Upload** a file, pick one from the
**Library**, or paste an `https://` **URL**. The seeded Unsplash URLs keep
working as plain URLs.

**Uploads** go browser → `POST /api/admin/media` → Cloudflare R2. The browser
never sees R2 credentials.

- **In the browser**, before upload, the image is:
  - rotated by its EXIF orientation;
  - scaled to at most 2000 px wide (and within iOS Safari's canvas limit);
  - re-encoded as WebP, or JPEG where WebP encoding isn't available.

  Re-encoding also strips EXIF, including a phone's GPS location. Originals up
  to 40 MB are accepted for resizing. A HEIC photo the browser can't read gets
  a message to export it as JPEG. A photo too large for the browser's canvas is
  downscaled, or refused with a message: never uploaded blank.
- **On the server**, the file type is decided from the bytes: JPEG, PNG, WebP
  and AVIF only. SVG is refused, because it can carry scripts. The limit is
  10 MB, and the name and `Content-Type` sent with the file are ignored.
- Objects are stored as `<folder>/<timestamp>-<random>.<ext>` with
  `Cache-Control: public, max-age=31536000, immutable`, because keys never
  repeat.

**Nothing is deleted automatically.** When an image is replaced, or its row is
deleted, it shows as **Unused** in *Admin → Media library*. It leaves R2 only
when an admin deletes it there.

- Deleting an image that a row still uses lists those rows and asks again.
- A save that references an image deleted from the library is refused, on the
  field that holds it.

**Setting up R2:**

1. Create a bucket and allow public access, through its `r2.dev` address for
   now (a custom domain before go-live; see the launch checklist).
2. Create an R2 API token with *Object Read & Write*, limited to that bucket.
3. Set five variables, in `.env` locally and in the Railway service:
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
   `R2_PUBLIC_BASE_URL` (the public `https://…` address; a trailing slash is
   fine).

With none of them set, the site runs normally, uploads answer "not
configured", and the Library and URL options keep working. With only some
set, it runs the same way and logs a warning naming the missing ones.
`/api/health` reports `media: up | down | not_configured`, for information
only; the health check passes on the database alone.

### Ordering and drafts

Every content table has `sort_order` (seeded with the record's original array
index, which is what preserves the approved page order) and `published`. The
list views reorder with the arrow buttons and toggle drafts with the eye icon;
the edit form has no sort-order box, so there is one way to reorder.

The destinations list notes that only the first 6 featured destinations are
displayed (the spotlight's six-card grid), and marks featured rows beyond the
sixth "Featured · not shown".

---

## Deployment

`vite-plugin-singlefile` was removed: it inlines the whole app into one
`index.html`, which cannot serve `/admin/*` deep links. The build is now a normal
multi-asset SPA.

Configure a **SPA fallback** so every path serves `index.html`:

- **Netlify** — `public/_redirects` is already in the repo.
- **Vercel** — add `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`
  to `vercel.json`.
- **Nginx** — `try_files $uri $uri/ /index.html;`

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the host's environment
variables. In Supabase, add your production origin under
**Authentication → URL Configuration**.

---

## Launch checklist

Work through this before the site goes live.

- [ ] **Rotate the Postgres credentials.** The database password was exposed
      during setup — it was read out of Railway's variables into a local
      assistant session, and it has since travelled in `.env`, in shell
      history, and over the public TCP proxy. None of that is a breach on its
      own; all of it is reason not to carry the original password into
      production. Rotate in Railway (Postgres service → *Settings* → rotate the
      password, or redeploy the service with a new `POSTGRES_PASSWORD`), then
      confirm the API service's `DATABASE_URL` reference still resolves and
      re-run `npm run migrate` locally with the new public URL.
- [ ] **Remove the public TCP proxy**, or accept it. It exists only so
      migrations can be applied from a laptop. Once deploys run
      `npm run migrate` themselves, the database does not need to be reachable
      from the internet at all.
- [ ] **Never run `0002_seed.sql` by hand** — see the warning in
      [§1](#1-database). It is an upsert over all 63 seeded rows and will
      silently discard every content edit made through the admin panel.
- [ ] **Check `DATABASE_URL` on the API service is the internal reference**
      (`*.railway.internal`), not the public proxy URL, so database traffic
      stays on the private network.
- [ ] **Check `req.ip` is the real visitor address** — see
      [Security: check that `req.ip` is the real visitor](#security-check-that-reqip-is-the-real-visitor).
      If it is the proxy's address, the per-IP sign-in limit locks everyone out.
- [ ] **Create the first admin** with `npm run admin:create` (§3). Use an
      address other than the public `contact_email`.
- [ ] **Put R2 on a custom domain.** Images are served from the bucket's
      `r2.dev` address for now, which Cloudflare rate-limits and describes as
      for development. Connect a custom domain to the bucket, set
      `R2_PUBLIC_BASE_URL` to it, and rewrite the stored URLs (a one-off
      `update … replace(url, old_base, new_base)` over `media.url` and every
      image column).
- [ ] **Publish a real privacy policy page** and set its URL in
      *Admin → Settings*. The site collects enquiries (names, emails, phone
      numbers), so it needs one before go-live. Until the URL is set, the
      footer's "Privacy Policy" link has no destination.
- [ ] **Confirm no `.env` file is committed.** `git check-ignore -v .env`
      should print a matching rule.
