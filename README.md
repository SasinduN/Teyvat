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

## 1. Create the Supabase project

1. Create a project at <https://supabase.com/dashboard>.
2. Open **SQL Editor** and run, in order:
   - `supabase/migrations/0001_init.sql` — tables, constraints, RLS policies,
     the `media` storage bucket and its policies.
   - `supabase/migrations/0002_seed.sql` — the approved baseline content
     (20 destinations, 6 experience types, 4 featured experiences, 4 tours,
     6 articles, 8 hidden gems, 8 photo stories).

   `0002_seed.sql` is generated from `src/data/*.ts` and every statement is an
   upsert, so it is safe to re-run to restore the baseline.

> If your project restricts policy changes on `storage.objects`, section 7 of
> `0001_init.sql` may error. Create the four `media` policies from
> **Storage → Policies** in the dashboard instead; everything else still applies.

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

```bash
npm install
npm run dev          # http://localhost:5173  (admin at /admin)
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, then production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
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
