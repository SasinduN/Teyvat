# Phase 4 plan: admin CRUD on our own API

Status: APPROVED, with the links change below ("Links may be empty") replacing
the open question the draft asked.

Scope: `/api/admin/*` for the nine content tables and the `site_settings` row,
and the admin panel switched from Supabase to those endpoints. Image uploads
(phase 5) and the enquiry inbox (phase 6) stay out.

## Decisions in this plan

These need a yes or no from you before any code is written:

1. **Slugs are permanent after creation. I agree.** There's one more reason
   besides links: `InteractiveMapSection.tsx:21` hardcodes `'ella'` as the
   map's default destination and falls back to the first row. Renaming `ella`
   would quietly change the map's opening state. The API ignores nothing
   silently: a `PUT` whose body carries a different `id` gets 400. To "rename"
   a row, create a new one and delete the old.
2. **`updateRow` gains one required parameter**, `expectedUpdatedAt`. This is
   the only signature change in `src/lib/api/admin.ts`. It's required rather
   than optional so the compiler catches any caller that forgets it; an
   optional parameter would make the 409 protection easy to skip by accident.
3. **The 409 check compares `updated_at` to the millisecond.** Postgres stores
   microseconds, but node-postgres turns `timestamptz` into a JS `Date`
   (milliseconds), and that is what the client gets back. An exact comparison
   would therefore never match and every save would 409. The update runs
   `where id = $1 and date_trunc('milliseconds', updated_at) = $2`. Two human
   saves inside the same millisecond is not a realistic case.
4. **`sort_order` leaves the edit form.** The list's arrow buttons become the
   only way to reorder; a new row is added at the end (`max + 1`). Two ways to
   set the same number is how a stale form overwrites a reorder.
5. **Reorder takes the table's complete id list.** If the submitted set differs
   from the rows currently in the table (someone added or deleted one since the
   list loaded), the request gets 409 and nothing changes.
6. **`count` and `order` become reserved slugs**, because `GET …/count` and
   `PUT …/order` share a path position with `…/:id`. No seeded row uses either
   name.
7. **The enquiries page shows a "moves to the API in phase 6" notice** instead
   of calling Supabase. In production it already fails: the build has no
   Supabase credentials. The dashboard drops its enquiries tile until phase 6.

### Links may be empty (approved change)

The draft asked how to handle a NOT VALID constraint. It was replaced by:

- The rule for all seven link columns (`instagram_url`, `facebook_url`,
  `tiktok_url`, `youtube_url`, `privacy_url`, `terms_url`,
  `sustainability_url`) is **NULL or `https://…`**.
- Migration 0004 sets the `#…` placeholders to NULL, then adds the CHECK fully
  validated. No NOT VALID.
- An empty link field in the admin form saves as NULL.
- `Footer.tsx` does not change. The mapper turns NULL into `undefined`, so
  React leaves out the `href` attribute and the link renders without one.
  Visible effects:
  - the cursor over those links is the default arrow rather than a pointer,
    because the classes have no `cursor-pointer`;
  - the links can't be reached with Tab;
  - clicking one does nothing, where `#instagram` used to jump to the top of
    the page.
- Launch checklist: the site needs a real privacy policy page before go-live,
  because it collects enquiries.

## Findings that shape the plan

- **`src/admin/collections.ts` imports lucide icons**, so the server can't
  import it. The plain field descriptors move to `shared/`; the admin keeps
  icons, labels and list-view settings.
- **`ContentTables` covers only seven tables.** `hero_slides` and `pillars`
  have no admin pages yet. Both are added.
- **`PillarIconName` is a type only**, so a dropdown has no runtime list to
  read. It becomes a `PILLAR_ICON_NAMES` array in `shared/database.types.ts`
  with the type derived from it, still the same 18 names as the `pillars.icon`
  CHECK and `WhyTravelEye`'s map. `src/components/` doesn't change.
- **Nothing caches `/api/content` across page loads.** The response has no
  `Cache-Control`, only Express's ETag; there's no `Last-Modified`, so browsers
  don't apply heuristic caching. TanStack Query's 5-minute `staleTime` lives
  in memory and resets on reload. `index.html` is `no-cache`. To make this
  explicit rather than accidental, the route gets `Cache-Control: no-cache`
  (the ETag still allows a 304). A test checks both the header and that a save
  shows up on the next `GET`.
- **`sameOrigin` already covers PUT, PATCH and DELETE.** It is mounted on all
  of `/api` in phase 3, so no new wiring is needed.

## 1. Shared schemas

New `shared/content-schema.ts`:

- The field descriptors now in `collections.ts` (name, label, type, required,
  options, help, span), keyed by table, with no React or icon imports. The
  option lists (`CATEGORY_OPTIONS` and so on) move with them.
- `schemaForTable(table, mode)` builds the Zod schema from those descriptors,
  moved from `src/admin/validation.ts`, which becomes a thin re-export. `mode`
  is `'create'` (includes `id`) or `'update'` (no `id`).
- The same schema runs in the admin form (through `zodResolver`) and in the
  API. The API also treats it as the column allow-list: SQL column names come
  from the descriptors, never from the request body.

Per-field rules:

| Type | Rule |
|---|---|
| slug (`id`) | `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–60 chars, not `count` or `order`, create only |
| text | trimmed; required ones 1–300 chars; optional blank becomes `null` |
| textarea | trimmed, up to 5000 chars |
| number | coerced; the column's range (rating 0–5, latitude and longitude, `days` ≥ 1 integer, `price_from` ≥ 0) |
| select / multiselect | the allowed list, the same as the CHECK constraints |
| string list | up to 50 items, blanks dropped |
| date | `YYYY-MM-DD` and a real calendar date |
| image / image list | `https://` URL up to 2000 chars (section 6) |
| itinerary | `{ day, title, description, location }[]`: `title` required, the others trimmed strings, extra keys stripped, days renumbered 1..n |
| pillar icon | one of `PILLAR_ICON_NAMES` |

A test runs every seeded row through its table's schema, so existing content
is guaranteed to open and save as it is. If a limit above rejects a seeded
row, the limit is too tight and gets raised.

## 2. API: `server/src/routes/admin.ts`

Every route is `requireAdmin` + `Cache-Control: no-store`. `sameOrigin` is
already on every non-GET `/api` request. `:table` must be one of the nine
names, otherwise 404.

| Route | Result |
|---|---|
| `GET /api/admin/content/:table` | all rows, **published or not**, ordered by `sort_order`, `id` |
| `GET /api/admin/content/:table/count` | `{ count }` |
| `GET /api/admin/content/:table/:id` | the row, or 404 |
| `POST /api/admin/content/:table` | 201 + row. Slug taken → 409 with `fields.id` |
| `PUT /api/admin/content/:table/:id` | body `{ values, expectedUpdatedAt }`. 200 + row; 409 if changed since; 404 if deleted |
| `PATCH /api/admin/content/:table/:id/published` | body `{ published }`. 200 + row |
| `DELETE /api/admin/content/:table/:id` | 204 |
| `PUT /api/admin/content/:table/order` | body `{ ids }`. 204; 409 if the set doesn't match the table; 400 on duplicates |
| `GET /api/admin/site-settings` | the whole row |
| `PUT /api/admin/site-settings` | body `{ values, expectedUpdatedAt }`. Same 409 rule |

Validation errors are 400 with field-level messages. `ApiErrorPayload` gains
an optional `fields` map, keyed by path:

```json
{ "error": { "code": "bad_request", "message": "Some fields need fixing.",
             "fields": { "itinerary.2.title": "Each day needs a title." } } }
```

**Reorder**, in one transaction:

1. `select id from <table> for update` locks every row.
2. Compare the id sets (409 if they differ).
3. `update … set sort_order = n` for each row whose position changed. Unchanged
   rows are skipped, so their `updated_at` stays put and open forms on them
   don't get a false 409.
4. Commit. Any error rolls the whole thing back.

**Last published hero slide.** Checked in a transaction that locks the
published slides, so two admins can't each unpublish "one of two" at the same
moment. It applies to all three ways a slide can disappear from the page:

- `PATCH …/published` with `false`,
- `PUT` with `published: false`,
- `DELETE`.

Each gets 409 "The hero needs at least one published slide."

**Database errors**, which the Zod rules should normally catch first:

- unique violation (`23505`) → 409,
- CHECK violation (`23514`) → 400,
- anything else → 500 through the existing error handler.

## 3. Admin client (`src/lib/api/admin.ts` and pages)

`listRows`, `getRow`, `createRow`, `deleteRow`, `setPublished`,
`reorderRows`, `countRows` and `slugify` keep their signatures; only their
bodies move from Supabase to `fetch`. `updateRow` gains `expectedUpdatedAt`
(decision 2). New: `getSiteSettings()` and
`updateSiteSettings(values, expectedUpdatedAt)`.

- `src/lib/api/http.ts`: `putJson`, `patchJson` and `deleteJson` next to
  `postJson`. `ApiRequestError` carries `fields`.
- `collections.ts`: gains Hero Slides and Pillars; the Pillars icon field is a
  select of `PILLAR_ICON_NAMES`. `sort_order` fields are removed (decision 4).
- **Destinations:** the list header and the Featured field's help say "Only the
  first 6 featured destinations are displayed." Featured rows beyond the sixth,
  by sort order, get a "Featured · not shown" badge instead of "Featured".
- **Hero Slides:** when a slide is the only published one, its unpublish toggle
  and delete button are disabled with that reason. The server check is what
  enforces it.
- `RecordEditorPage`:
  - passes the loaded row's `updated_at`;
  - on a 400, puts each `fields` message on its form field;
  - on a 409, keeps your edits on screen and shows "Someone saved this record
    after you opened it", with a "Load their version" button that discards
    your edits.
- New `SettingsPage` at `/admin/settings`, a sidebar item: address, phone,
  contact email and the seven links, with the same 409 handling.
- `DashboardPage`: counts for all nine tables; the enquiries tile goes until
  phase 6.
- `InquiriesPage`: the phase 6 notice (decision 7).
- `CollectionPage` and `fields.tsx`: the Supabase Storage clean-up calls on
  delete and replace are removed (section 6).
- After this phase, `@/lib/supabase` is loaded only by `inquiries.ts`, and
  only through its dynamic import. So the SDK also drops out of the admin
  chunk's static imports. The bundle report covers both chunks.

## 4. Migration `0004_site_settings_links.sql`

One transaction, re-runnable:

1. Drop 0001's `site_settings_<col>_check` constraints on the seven link
   columns (`drop constraint if exists`). They call `public.is_link()`, which
   is false for NULL, so they would reject an empty link. `is_link()` itself
   is left in place.
2. `alter column … drop not null` on the seven columns.
3. Set each link that starts with `#` to NULL. Only `#…` placeholders: any
   other non-https value makes step 4 fail the deploy loudly rather than
   being silently erased.
4. Add `site_settings_<col>_https` CHECK
   (`col is null or (col ~ '^https://[^\s]+$' and length(col) <= 500)`),
   fully validated, each guarded by a `pg_constraint` existence check.

- `contact_email` already has an email CHECK in 0001; the API adds `z.email()`.
- `SiteSettingsRow` and `PublicSiteSettings` link fields become
  `string | null`, and `SiteSettings` (in `src/types`) becomes
  `string | undefined`. `toSiteSettings` maps NULL to `undefined`, as the
  other mappers already do. `Footer.tsx` compiles unchanged: `href` accepts
  `undefined`.
- The API's Zod: empty or blank becomes `null`; otherwise an `https://` URL
  (which rejects `http:`, `#…`, `/…` and `javascript:`), up to 500 chars.

## 5. Public site

- `src/components/`: **no changes.** `git diff demo-baseline -- src/components/`
  must be identical before and after.
- `server/src/routes/content.ts`: `Cache-Control: no-cache` (finding above).
  It still filters `published = true`. Nothing in the admin API does.
- `verify:roundtrip` must still pass. The mappers don't change.

## 6. Image fields until phase 5

Each image field becomes a URL text box with a live preview thumbnail. The
existing broken-image indicator stays, and the upload button is removed. Image
lists (the destination gallery) become a list of those rows with add, remove
and reorder.

- The value must be an `https://` URL. The seeded Unsplash URLs pass as they
  are.
- Help text: "Paste an image URL. Uploads arrive in a later update."
- `src/lib/storage.ts` stays in the tree unused; phase 5 replaces it with R2.

## 7. Tests (`server/test/admin.test.ts`)

Between groups, the helpers truncate the nine content tables, re-run the
0002 seed and reset `site_settings` to its 0001 defaults. This is safe only
because the database is guarded as the test database; the README's warning
about 0002 still applies to production.

- **401 without a session:** a table-driven loop over every route × every
  table, plus both site-settings routes.
- **403 for a cross-origin write:** every PUT, PATCH, POST and DELETE route,
  sent with a valid session and `Origin: https://evil.example`.
- **400 with field-level errors:**
  - an itinerary day without a title (`fields["itinerary.0.title"]`),
  - rating 7,
  - a bad slug and a reserved slug,
  - a pillar icon outside the list,
  - a `PUT` that tries to change `id`.
- **Seeded rows:** every one passes its schema.
- **Admin list vs public:** an unpublished row appears in the admin list and
  not in `/api/content`.
- **Save → public:** after a `PUT`, the next `GET /api/content` shows the
  change, with `Cache-Control: no-cache`.
- **Reorder is all-or-nothing:**
  - a valid reorder applies;
  - a missing, extra or duplicate id changes nothing;
  - a failure midway (a test-only trigger that raises on one row's update)
    leaves every `sort_order` exactly as it was.
- **Last hero slide:** unpublishing via PATCH or PUT and deleting are refused
  for the last published slide and allowed while another one is published.
- **409 conflict:** two editors load a row, the first saves, the second gets
  409, and the row keeps the first editor's values.
- **Duplicate slug:** creating one gets 409 with `fields.id`.
- **`site_settings` URLs:**
  - rejected: `http://`, `#instagram`, `/privacy`, `javascript:`, a bad
    `contact_email`;
  - accepted: `https://…` for all seven, and empty, which is stored as NULL;
  - after migrating, the seeded placeholders are NULL, and a direct SQL
    `update` with an `http://` link violates the constraint;
  - `/api/content` returns `null` for an empty link.

## 8. Checks and wrap-up

- `typecheck`, `verify:roundtrip`, `npm test`, `build`.
- `git diff demo-baseline -- src/components/` unchanged by this phase.
- Bundle sizes for the public page and the admin chunk, before and after.
- Update the phase table and notes in `CLAUDE.md`, and the admin and security
  sections of the README. Add to the README launch checklist: a real privacy
  policy page before go-live, because the site collects enquiries.
- Commit locally, show the results, and ask before pushing. You check the live
  site after the deploy, as in phase 3.
