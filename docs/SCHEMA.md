# Database schema

**Source of truth:** [`db/migrations/`](../db/migrations), applied in order by
`npm run migrate`, which records each in `schema_migrations`.

- **TypeScript mirror:** [`shared/database.types.ts`](../shared/database.types.ts).
- **What each form may write:** [`shared/content-schema.ts`](../shared/content-schema.ts)
  (content and settings) and [`shared/inquiry-schema.ts`](../shared/inquiry-schema.ts)
  (enquiries).
- **Row to component mapping:** [`src/lib/mappers.ts`](../src/lib/mappers.ts).

| Migration | Adds |
| --- | --- |
| `0001_init.sql` | content tables, `inquiries`, `users`, `sessions`, `site_settings`, triggers |
| `0002_seed.sql` | the approved baseline content (an upsert; never run by hand) |
| `0003_login_attempts.sql` | the sign-in rate limit |
| `0004_site_settings_links.sql` | footer links are NULL or `https://…` |
| `0005_media.sql` | the media library |
| `0006_inquiries.sql` | enquiry statuses, `closed_at`, `spam`, `inquiry_attempts` |

**Where the rules live.** There is no row-level security: every connection is
the API's single database role. Rules are enforced in two layers:

1. **The API.** Zod schemas from `shared/`, the column allow-lists, and
   `requireAdmin` on every admin route. The public routes never filter on a
   request-supplied column.
2. **CHECK constraints in the database**, as a backstop in case a bug lets
   something through.

---

## Conventions

Every content table follows the same pattern, so the admin panel can be
schema-driven rather than hand-built per collection.

| Column | Type | Why |
| --- | --- | --- |
| `id` | `text` PK | A human-readable slug, **not** a UUID. Keeping the original slugs keeps the seed, the fixtures and the admin URLs readable. |
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
| `image` | `text` | `image` | an image URL: Unsplash or our R2 bucket (`shared/image-hosts.ts`) |
| `gallery` | `text[]` | `gallery?` | empty array → `undefined` |
| `best_time` | `text` | `bestTime` | |
| `experiences` | `text[]` | `experiences` | |
| `highlights` | `text[]` | `highlights` | |
| `rating` | `numeric(3,2)` | `rating` | `CHECK` 0–5; holds `4.95` |
| `elevation` | `text` NULL | `elevation?` | free text, e.g. `"1,041 m"` |
| `ideal_for` | `text[]` | `idealFor` | |
| `featured` | `boolean` | `featured?` | `NOT NULL DEFAULT false`; `DestinationSpotlight` shows the first 6 featured rows by `sort_order` |
| `travel_time_from_airport` | `text` NULL | `travelTimeFromAirport?` | since 0007; 1–30 chars, e.g. `"~4 h"`, shown as "~4 h from Colombo airport (CMB)" |

## `experience_categories` → `ExperienceCategory` (6 rows)

The "what kind of journey" tiles. This had no interface in `src/types` — it was
an inline literal in the original data file (now `scripts/fixtures/experiences.ts`) — so the mapper declares
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
| (from `tour_stops`) | | `stops`, `route` | see below; `route` is the stops' names, the route chips |
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

## `tour_stops` → `TourPackage.stops`

A tour's route, one row per stop, in order (since 0007, which converted and
dropped `tours.route`). Unlike the itinerary this is a child table: a stop can
link a destination, and the database has to keep that link honest.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity PK | |
| `tour_id` | `text` | FK `tours`, `ON DELETE CASCADE` |
| `position` | `integer` | 0..n-1; `UNIQUE (tour_id, position)` |
| `destination_id` | `text` NULL | FK `destinations`, `ON DELETE RESTRICT` |
| `name` | `text` NULL | a linked stop's optional chip label (NULL: the destination's name); a custom stop's name |
| `lat`, `lng` | `double precision` NULL | a custom stop's coordinates; `CHECK` lat 5.5–10, lng 79.3–82.1 |

A `CHECK` allows exactly two shapes: a **linked** stop (`destination_id`, no
coordinates; it takes the destination's, so moving a destination moves every
route through it) or a **custom** stop (`name`, `lat`, `lng`, no
destination). The bounds are a box around Sri Lanka, to catch swapped or
mistyped coordinates.

- **`GET /api/content`** resolves each stop on the server:
  `stops: { position, name, lat, lng, destinationId }[]`, with
  `destinationId` set only while that destination is published.
- **Admin:** `GET /api/admin/content/tours/:id` adds `stops` in the form's
  shape; `PUT`/`POST` take them and replace the tour's stops in the same
  transaction. A destination a route uses can't be deleted: 409, naming the
  tours.
- **Tests:** `resetContent()` re-adds `tours.route`, replays 0002 and then
  0007, so every reset runs the real conversion.

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


## `hero_slides` → `HeroSlide` (3 rows)

| Column | Type | Domain field | Notes |
| --- | --- | --- | --- |
| `id` | `text` PK | `id` | |
| `image` | `text` | `url` | named `image` like every other table; the component prop is `url` |
| `title` | `text` | `title` | |
| `caption` | `text` | `caption` | |

The API refuses to unpublish or delete the last published slide: the hero
can't be empty.

## `pillars` → `Pillar` (4 rows)

| Column | Type | Domain field | Notes |
| --- | --- | --- | --- |
| `id` | `text` PK | `id` | |
| `icon` | `text` | `icon` | a Lucide icon **name**, CHECKed against the same list as `PILLAR_ICON_NAMES` and `WhyTravelEye`'s map |
| `title` | `text` | `title` | |
| `description` | `text` | `desc` | `desc` is a reserved word in SQL |

## `site_settings` (exactly one row)

The Footer's contact details and links. The CHECK on `id` (always `true`) is
what makes it single.

| Column | Type | Notes |
| --- | --- | --- |
| `postal_address` | `text` | 1–300 chars |
| `phone` | `text` | 1–40 chars |
| `contact_email` | `text` | an email; shown publicly |
| `instagram_url`, `facebook_url`, `tiktok_url`, `youtube_url`, `privacy_url`, `terms_url`, `sustainability_url` | `text` NULL | NULL (the Footer renders the link without an `href`) or `https://…`, ≤ 500 chars |

`GET /api/content` exposes only the columns in `PUBLIC_SITE_SETTINGS_COLUMNS`
(`shared/api.ts`), so a setting added later is private until someone adds it
there.

---

## `inquiries`

Submissions from the public enquiry form (`POST /api/inquiries`). The insert
names its columns (`INQUIRY_INSERT_COLUMNS`, `shared/inquiry-schema.ts`), so
`status`, `admin_notes`, `spam` and `closed_at` are always the server's to set.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `gen_random_uuid()` |
| `name` | `text` | 1–120 chars |
| `email` | `text` | an email |
| `phone` | `text` NULL | ≤ 40 chars |
| `travelers` | `text` | e.g. `"2 Adults"` |
| `dates` | `text` | e.g. `"Next 3 Months"` |
| `subject` | `text` | the modal's subject, e.g. `"Experience: Safari in Yala"` |
| `message` | `text` | ≤ 5000 chars |
| `status` | `text` | `new` · `contacted` · `closed` |
| `closed_at` | `timestamptz` NULL | set exactly when `status = 'closed'` (a CHECK keeps them in step) |
| `spam` | `boolean` | the hidden honeypot was filled in |
| `admin_notes` | `text` NULL | internal only, ≤ 5000 chars |

Retention, enforced by the hourly sweep (`server/src/auth/sweep.ts`): closed
enquiries are deleted 12 months after `closed_at`, and spam 30 days after
arrival. Open enquiries are never deleted automatically.

## `inquiry_attempts`

The enquiry form's rate limit (5 per 15 minutes, 20 per 24 hours, per IP).
It holds `ip` (`inet`) and `attempted_at` only, swept after 24 hours.

---

## `users`, `sessions`, `login_attempts`

Sign-in. Every user is an admin; there is no role column.

**`users`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `email` | `text` | unique on `lower(email)`; stored trimmed and lowercased |
| `password_hash` | `text` | argon2id PHC string; a CHECK requires the `$argon2id$` prefix |
| `full_name` | `text` NULL | |
| `last_login_at` | `timestamptz` NULL | |

Created only by `npm run admin:create`; there's no HTTP route for it.

**`sessions`**: one row per signed-in browser. Deleting the row signs it out.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | → `users`, `ON DELETE CASCADE` |
| `token_hash` | `text` | SHA-256 of the cookie's token; the token is never stored |
| `user_agent`, `ip` | `text`, `inet` | recorded at sign-in |
| `last_seen_at` | `timestamptz` | advanced at most every 5 minutes |
| `expires_at` | `timestamptz` | sign-in + 7 days, fixed; checked on every request |

**`login_attempts`**: the sign-in rate limit. It holds `email_hash` (SHA-256
of the submitted email, never the email), `ip`, `succeeded` and
`attempted_at`. Only failures count; it's swept after 24 hours.

---

## `media`

One row per image uploaded to R2 (`POST /api/admin/media`). A URL under
`R2_PUBLIC_BASE_URL` is "ours" only if it has a row here.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `key` | `text` unique | `<folder>/<timestamp>-<random>.<ext>` (CHECKed) |
| `url` | `text` unique | `R2_PUBLIC_BASE_URL/key` |
| `content_type` | `text` | `image/jpeg`, `png`, `webp` or `avif` (from the bytes, not the request) |
| `bytes` | `integer` | 1 B to 10 MB |
| `uploaded_by` | `uuid` NULL | → `users`, `ON DELETE SET NULL` |

Nothing is deleted automatically. A content save that uses one of our URLs
takes a share lock on its row, and a library delete takes an update lock, so
an image can't be deleted at the moment a save starts using it.

## `schema_migrations`

The migration runner's ledger: `filename` and `applied_at`. Never edit it by
hand; deleting a row makes the runner apply that file again.

---

## Changing the schema

1. Add the next numbered file in `db/migrations/` (`NNNN_name.sql`). It must
   wrap itself in `begin;` … `commit;` and be safe to re-run.
2. Update the row type in `shared/database.types.ts`.
3. If the admin edits the column, add a field descriptor in
   `shared/content-schema.ts`. That gives you the form control, its Zod
   validation, the API's column allow-list, and (for image fields) the usage
   query and the image audit.
4. If the public site reads it, update `src/lib/mappers.ts` and run
   `npm run verify:roundtrip`.
5. `npm test` applies every migration to the test database, so a broken one
   fails there first.
