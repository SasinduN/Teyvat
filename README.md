# Teyvat — Travel Eye Sri Lanka

Inbound-tourism site for foreign travellers visiting Sri Lanka, plus the admin
panel that manages its content.

- **Public site** — `/` — the approved marketing design, now rendered entirely
  from the database.
- **Admin panel** — `/admin` — Supabase Auth behind an allow-list, full CRUD for
  every content collection, image uploads, and the enquiry inbox.

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
- `0002_seed.sql` — the approved baseline content: 63 rows across all nine
  content tables (20 destinations, 6 experience types, 4 featured experiences,
  4 tours, 6 articles, 8 hidden gems, 8 photo stories, 3 hero slides,
  4 pillars). Generated from `src/data/*.ts` by `npm run seed:generate`.

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

Being signed in is not the same as being an admin. Two steps:

1. **Authentication → Users → Add user** — create an email/password user and
   tick *Auto Confirm User*.
2. **SQL Editor** — add that user to the allow-list:

   ```sql
   insert into public.admins (id, email, full_name)
   select id, email, 'Your Name'
   from auth.users
   where email = 'you@traveleye.lk';
   ```

Anyone who signs in without a row in `public.admins` sees a "no admin access"
screen, and Postgres refuses their writes regardless of what the browser does.

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
| `npm run typecheck` | `tsc --noEmit` across client, server, shared and scripts |
| `npm run preview` | Vite's own preview of the client build |
| `npm run seed:generate` | Regenerate `0002_seed.sql` from `src/data/*.ts` |
| `npm run verify:roundtrip` | Assert the DB round-trip renders identical content |
| `npm run images:migrate` | Optional: pull seeded Unsplash images into Storage |

---

## Architecture

### Keeping the public design untouched

The approved components were not redesigned. Each one previously did:

```ts
import { DESTINATIONS } from '../data/destinations';
```

and now does:

```ts
const DESTINATIONS = useDestinations();
```

That is the entire change — no JSX was modified.
`src/hooks/useSiteContent.ts` fetches all seven collections in one TanStack
Query, so every component reads from a single shared cache entry.

`npm run verify:roundtrip` proves this is lossless: it pushes the original
`src/data/*.ts` content through the same shape transformation the seed performs,
back through the runtime mappers, and asserts deep equality against what the
components used to import — ordering, optional-field presence and the article
date strings included.

`src/data/*.ts` is retained as the seed's source of truth and as that test's
fixture. Nothing in the running app imports it.

### Data flow

```
Postgres ──RLS SELECT (anon)──▶ lib/api/content.ts ──mappers──▶ useSiteContent ──▶ components

InquiryModal ──RLS INSERT (anon)──▶ public.inquiries ◀──RLS (admin)── /admin/inquiries

/admin/* ──Supabase Auth + public.admins──▶ lib/api/admin.ts ──RLS ALL──▶ Postgres
```

Admin mutations invalidate the query keys they touch (`src/lib/queryClient.ts`),
including `siteContent` — so a save is reflected on the public site without a
reload. Reordering is optimistic and rolls back if the write fails.

### Security model

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

Every list view and edit form is generated from `src/admin/collections.ts`.
Adding a column means adding one field descriptor — no new page components.
Supported field types: `text`, `textarea`, `slug`, `number`, `select`,
`multiselect`, `image`, `imageList`, `stringList`, `date`, `boolean`,
`itinerary`.

The *same* descriptors generate the Zod schema (`src/admin/validation.ts`), so
validation can never drift from the UI. That schema is also the coercion layer:
number inputs arrive as strings and are coerced, text is trimmed, blank optional
text becomes `null` (so the mapper yields `undefined` and the public component
renders exactly as it did with hardcoded data), empty list rows are dropped, and
itinerary days are renumbered 1..n. React Hook Form therefore hands the mutation
a payload that is ready for Postgres, and the database `CHECK` constraints
become a backstop rather than the first line of defence.

The admin bundle is lazy-loaded, so a traveller on the marketing site never
downloads the CMS — Zod, React Hook Form and Sonner all ship in that chunk.

### Images

Admins upload files; the DB stores the returned Storage public URL. There is
deliberately no "paste a URL" input. Uploads go to
`media/<folder>/<timestamp>-<random>.<ext>` — a fresh key per upload, so
replacing an image never needs a CDN cache-bust and cannot clobber a file another
record still points at. Replacing or deleting a record cleans up images we own
and leaves third-party URLs alone.

The seeded records still reference their original Unsplash URLs. To move those
into Storage too:

```bash
# bash
SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run images:migrate

# PowerShell
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SECRET_KEY="sb_secret_..."
npm run images:migrate
```

Add `-- --dry-run` to preview. The secret key (`sb_secret_...`) is read from the
shell only and is never written to a file. Re-running is safe — URLs already in the bucket
are skipped.

### Ordering and drafts

Every content table has `sort_order` (seeded with the record's original array
index, which is what preserves the approved page order) and `published`. The
list views reorder with the arrow buttons and toggle drafts with the eye icon.

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
- [ ] **Confirm no `.env` file is committed.** `git check-ignore -v .env`
      should print a matching rule.
