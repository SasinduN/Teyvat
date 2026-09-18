# Database schema

Source of truth: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
TypeScript mirror: [`src/lib/database.types.ts`](../src/lib/database.types.ts).
Row → domain mapping: [`src/lib/mappers.ts`](../src/lib/mappers.ts).

Nine tables: seven content collections, one enquiry inbox, one admin allow-list.

---

## Conventions

Every content table follows the same pattern, so the admin panel can be
schema-driven rather than hand-built per collection.

| Column | Type | Why |
| --- | --- | --- |
| `id` | `text` PK | A human-readable slug, **not** a UUID. The approved front-end references specific ids — `DestinationSpotlight` hardcodes `['ella','sigiriya','galle','mirissa','kandy','jaffna']` — so keeping the original slugs preserves that behaviour exactly. |
| `sort_order` | `integer` | Seeded with the record's index in its original hardcoded array. Ordering by it reproduces the approved page order. Editable from the list view's arrow buttons. |
| `published` | `boolean` | Drafts stay in the database but vanish from the public site. |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` is maintained by a trigger, not the client. |

TypeScript union types are mirrored as `CHECK` constraints rather than Postgres
enums — same integrity, but a new category is an `ALTER … CHECK` instead of an
enum migration.

| TS union (`src/types/index.ts`) | Enforced as |
| --- | --- |
| `CategoryType` minus `'All'` | `CHECK (… in ('Beaches','Mountains','Culture','Wildlife','Adventure','Food','Hidden Gems'))`. `'All'` is a UI-only filter value and is never stored. |
| `Destination['region']` | `CHECK (region in ('South','Central','East','North','Cultural Triangle','West'))` |
| `TourPackage['category']` | `CHECK (category in ('Luxury','Culture','Wildlife','Adventure','Full Island'))` |
| `PhotoStory['aspect']` | `CHECK (aspect in ('square','portrait','landscape'))`, nullable |

**Naming.** Columns are `snake_case`; the domain types stay `camelCase`. The
mappers are the only place the two meet — components were not touched.

**`null` vs `undefined`.** Optional columns are `NULL` in Postgres and mapped
back to `undefined`, because the approved components test them with truthiness
and optional chaining. `npm run verify:roundtrip` asserts this.

---

## `destinations` → `Destination` (20 rows)

| Column | Type | Domain field | Notes |
| --- | --- | --- | --- |
| `id` | `text` PK | `id` | |
| `name` | `text` | `name` | |
| `latitude` | `double precision` | `latitude` | `CHECK` between −90 and 90 |
| `longitude` | `double precision` | `longitude` | `CHECK` between −180 and 180 |
| `region` | `text` | `region` | constrained union |
| `province` | `text` | `province` | |
| `category` | `text[]` | `category` | every element validated by `is_category_array()` |
| `short_description` | `text` | `shortDescription` | |
| `long_description` | `text` | `longDescription` | |
| `image` | `text` | `image` | Storage public URL |
| `gallery` | `text[]` | `gallery?` | empty array → `undefined` |
| `best_time` | `text` | `bestTime` | |
| `experiences` | `text[]` | `experiences` | |
| `highlights` | `text[]` | `highlights` | |
| `rating` | `numeric(3,2)` | `rating` | `CHECK` 0–5; holds `4.95` |
| `elevation` | `text` NULL | `elevation?` | free text, e.g. `"1,041 m"` |
| `ideal_for` | `text[]` | `idealFor` | |
| `featured` | `boolean` | `featured?` | `NOT NULL DEFAULT false`; no component currently reads it |

## `experience_categories` → `ExperienceCategory` (6 rows)

The "what kind of journey" tiles. This had no interface in `src/types` — it was
an inline literal in `src/data/experiences.ts` — so the mapper declares
`ExperienceCategory` in `src/lib/mappers.ts`.

| Column | Type | Domain field |
| --- | --- | --- |
| `id` | `text` PK | `id` |
| `title` | `text` | `title` |
| `category` | `text` | `category` — single `CategoryType`; clicking the tile filters the map by it |
| `subtitle` | `text` | `subtitle` |
| `image` | `text` | `image` |
| `description` | `text` | `description` |

## `featured_experiences` → `ExperienceItem` (4 rows)

| Column | Type | Domain field | Notes |
| --- | --- | --- | --- |
| `id` | `text` PK | `id` | |
| `title` | `text` | `title` | |
| `subtitle` | `text` NULL | `subtitle?` | |
| `location` | `text` | `location` | |
| `duration` | `text` | `duration` | e.g. `"3–4 Hours"` |
| `category` | `text` | `category` | constrained union |
| `image` | `text` | `image` | |
| `description` | `text` | `description` | |
| `highlights` | `text[]` | `highlights` | |
| `recommended_time` | `text` NULL | `recommendedTime?` | e.g. `"5:30 AM – 8:30 AM"` |
| `rating` | `numeric(3,2)` | `rating` | |

## `tours` → `TourPackage` (4 rows)

| Column | Type | Domain field | Notes |
| --- | --- | --- | --- |
| `id` | `text` PK | `id` | |
| `title` | `text` | `title` | |
| `subtitle` | `text` | `subtitle` | |
| `days` | `integer` | `days` | `CHECK > 0` |
| `route` | `text[]` | `route` | ordered; rendered as the route chips |
| `short_desc` | `text` | `shortDesc` | |
| `full_desc` | `text` | `fullDesc` | |
| `image` | `text` | `image` | |
| `highlights` | `text[]` | `highlights` | |
| `included_places` | `text[]` | `includedPlaces` | |
| `price_from` | `numeric(10,2)` | `priceFrom` | |
| `category` | `text` | `category` | constrained union |
| `itinerary` | `jsonb` | `itinerary` | see below |

`itinerary` is `jsonb` rather than a child table: it is always read and written
as a whole with its parent tour, never queried across tours, and ordering
matters. A `CHECK (jsonb_typeof(itinerary) = 'array')` keeps the shape sane, and
the Zod schema validates each entry and renumbers `day` to 1..n on save.

```jsonc
[{ "day": 1, "title": "…", "description": "…", "location": "…" }]
```

## `articles` → `Article` (6 rows)

| Column | Type | Domain field | Notes |
| --- | --- | --- | --- |
| `id` | `text` PK | `id` | |
| `title` | `text` | `title` | |
| `category` | `text` | `category` | free text, rendered uppercase (`"INSPIRATION"`) |
| `published_at` | `date` | `date` | **see below** |
| `read_time` | `text` | `readTime` | free text, e.g. `"6 min read"` |
| `image` | `text` | `image` | |
| `snippet` | `text` | `snippet` | |
| `author_name` | `text` | `author.name` | flattened |
| `author_avatar` | `text` | `author.avatar` | flattened |
| `author_role` | `text` | `author.role` | flattened |
| `content` | `text[]` | `content?` | one element per paragraph |

**`date` is the one lossy-looking mapping, and it is not.** The original data
stored a display string (`"February 12, 2026"`, `"December 05, 2025"`). Storing
that as `text` would make the admin type a formatted string by hand and make the
column unsortable, so it is a real `date` column rendered back through
`Intl.DateTimeFormat`:

```ts
toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric', timeZone: 'UTC' })
```

`day: '2-digit'` is what reproduces `"December 05, 2025"` rather than
`"December 5, 2025"`. All six seeded articles round-trip to their exact original
string — asserted by `npm run verify:roundtrip`. UTC is pinned so the label
never shifts a day in a western timezone.

`author` is flattened to three columns rather than kept as `jsonb`: it is a
fixed three-field shape, and flat columns give the admin form three plain inputs
and let you later query or group by author.

## `hidden_gems` → `HiddenGem` (8 rows)

| Column | Type | Domain field |
| --- | --- | --- |
| `id` | `text` PK | `id` |
| `name` | `text` | `name` |
| `region` | `text` | `region` — free text (`"Central Highlands"`), **not** the constrained `Destination.region` union |
| `image` | `text` | `image` |
| `description` | `text` | `description` |
| `why_visit` | `text` | `whyVisit` |
| `tag` | `text` | `tag` |

## `photo_stories` → `PhotoStory` (8 rows)

| Column | Type | Domain field | Notes |
| --- | --- | --- | --- |
| `id` | `text` PK | `id` | |
| `title` | `text` | `title` | |
| `location` | `text` | `location` | |
| `category` | `text` | `category` | free text |
| `image` | `text` | `image` | |
| `caption` | `text` | `caption` | |
| `aspect` | `text` NULL | `aspect?` | drives the tile height in the mosaic |

---

## `inquiries`

New — the `InquiryModal` previously discarded submissions.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `gen_random_uuid()` — not a slug; these are not addressable content |
| `name` | `text` | 1–120 chars |
| `email` | `text` | regex-validated |
| `phone` | `text` NULL | ≤ 40 chars |
| `travelers` | `text` | e.g. `"2 Adults"` |
| `dates` | `text` | e.g. `"Next 3 Months"` |
| `subject` | `text` | the modal's `prefilledSubject`, e.g. `"Experience: Safari in Yala"` |
| `message` | `text` | ≤ 5000 chars |
| `status` | `text` | `new` · `in_progress` · `responded` · `closed` · `archived` |
| `admin_notes` | `text` NULL | internal only; never returned to the public site |

Indexed on `created_at desc` and `status` — the two orderings the inbox uses.

## `admins`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | FK → `auth.users(id)`, `ON DELETE CASCADE` |
| `email` | `text` | |
| `full_name` | `text` NULL | |

A row here is what grants write access. Having an `auth.users` account is not
enough. Populate it from the SQL editor — there is deliberately no client-side
path to add an admin.

---

## Row Level Security

Enabled on all nine tables. `public.is_admin()` is a `SECURITY DEFINER` function
so a policy can consult `admins` without the caller needing `SELECT` on it, and
without recursing through RLS.

| Actor | Content tables | `inquiries` | `media` bucket |
| --- | --- | --- | --- |
| `anon` | `SELECT` where `published` | `INSERT` only | read |
| `authenticated`, not an admin | same as `anon` | `INSERT` only | read |
| Admin | full read/write | full read/write | read/write |

Two details worth knowing:

- The content read policy is `using (published = true or public.is_admin())`, so
  an admin can preview drafts. The client still passes `.eq('published', true)`
  on public reads, so the marketing site does not change shape just because
  someone happens to be signed in.
- The anon insert policy on `inquiries` is
  `with check (status = 'new' and admin_notes is null)` — a visitor cannot forge
  an enquiry that is already marked handled, or inject internal notes.

## API keys

The app uses Supabase's **new API key format** only:

| Key | Prefix | Where | Postgres role |
| --- | --- | --- | --- |
| Publishable | `sb_publishable_` | `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`, shipped in the browser bundle | `anon` (or `authenticated` once signed in) |
| Secret | `sb_secret_` | `SUPABASE_SECRET_KEY` in the shell, server-side scripts only | bypasses RLS |

The `anon` / `authenticated` rows in the table above describe the *roles* RLS
sees — they are unchanged by the key format. The legacy `anon` and
`service_role` JWT keys (`eyJ...`) are deprecated by Supabase and will stop
working at the end of 2026; do not use them.

## Storage

One public bucket, `media`, capped at 10 MB per object and restricted to
`image/jpeg|png|webp|avif|gif`. Public `SELECT`; insert/update/delete require
`public.is_admin()`.

Objects are keyed `media/<folder>/<timestamp>-<random>.<ext>`. A fresh key per
upload means replacing an image never needs a CDN cache-bust and cannot clobber
a file another record still points at.

The seeded rows still carry their original Unsplash URLs.
`npm run images:migrate` pulls them into the bucket and rewrites the rows.

---

## Changing the schema

1. Add a numbered migration in `supabase/migrations/`.
2. Update the matching row interface in `src/lib/database.types.ts`.
3. If the public site reads the column, update `src/lib/mappers.ts`.
4. Add a field descriptor to the collection in `src/admin/collections.ts` — this
   generates the admin form control **and** its Zod validation
   (`src/admin/validation.ts`). No new page components.
5. Run `npm run verify:roundtrip` to confirm the public site still renders
   identical content.
