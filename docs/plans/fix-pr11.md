# Plan: fix forward from PR #11

Status: DRAFT, waiting for approval. Nothing is built until it's approved.

Background:

- `docs/reviews/ui-review-2026-10-09.md` covers what #11 changed.
- This plan assumes #13, the revert of #12, has merged. The branch starts on
  top of it, so `main` matches `12c972a` (#11's merge).

## Goals

1. **Local scripts reach production again.** `migrate`, `admin:create`,
   `images:audit` and `media:rebase` connect through Railway's public proxy
   (`*.proxy.rlwy.net`, `?sslmode=require`). The deployed app keeps using the
   internal `*.railway.internal` URL.
2. **The two weakened checks are restored.**
   - `verify:roundtrip` compares photos again.
   - The CSP test asserts the exact `img-src` list.
3. **The CSP and image allow-list only name hosts something uses.**
4. **Photos come from the database.** Photo URLs and their credits come
   from the database and the admin, not from JSON files and overrides in
   code.

Out of scope, but on the review's list: the newsletter's privacy notice and
unsubscribe, and `.env.example`'s port 5432. Those can be separate PRs.

---

## 1. Database connections (`shared/pg-connection.ts`)

**What #11 broke.** Before #11, any `sslmode` except `disable` meant
"encrypt, don't verify". #11 turned `require`, `prefer` and `allow` into
"encrypt and verify". It also only allows `no-verify` for localhost.

That breaks Railway's TCP proxy, which presents a certificate that chains to
no public CA. Every script run against `DATABASE_PUBLIC_URL?sslmode=require`
now fails with a certificate error. That is the exact setup
`privateHostHint()` tells people to use. #11 also deleted the comment that
explained this trade-off.

**Change:** follow libpq's own meanings, so the URL says what it does.

| `sslmode` | TLS | Verify certificate | Notes |
|---|---|---|---|
| absent / `disable` | no | n/a | The deployed app's internal URL. Traffic stays on Railway's private network. |
| `allow`, `prefer`, `require` | yes | **no** | Restores pre-#11 behaviour. Railway's proxy works. |
| `verify-ca`, `verify-full` | yes | yes | For a host with a trusted certificate, or with `NODE_EXTRA_CA_CERTS`. |
| `no-verify` | yes | no | Kept as an alias, **any host**. The localhost-only limit goes. |
| anything else | error | | Keeps #11's useful part: a typo fails loudly instead of silently going without TLS. |

- Restore the comment block from `8d13a1a`, which explains the trade-off
  (encrypted but not authenticated). Point it at this table.
- **The deployed app is unchanged.** `DATABASE_URL = ${{Postgres.DATABASE_URL}}`
  is the internal URL, with no `sslmode`, so `ssl: false`.
- Add one guard in `server/src/db.ts`. When `NODE_ENV=production` and the
  host doesn't end in `.railway.internal`, log a single warning at start-up:
  `DATABASE_URL is not Railway's internal URL`. It names neither the host nor
  the URL. This catches someone pasting the public URL into the service. It
  doesn't refuse to start, because a refusal would take the site down over a
  variable.
- `server/test/connection-policy.test.ts` is rewritten to the table:
  - each mode maps to the right `ssl` value;
  - `sslmode` and `uselibpqcompat` are stripped;
  - an invalid mode throws;
  - `no-verify` works for a remote host.
- **Manual check before merging.** You run `npm run migrate -- --dry-run`
  against the public proxy. It prints the ledger and changes nothing. I
  won't connect to production myself.

## 2. Restore the two checks

- **`scripts/verify-roundtrip.ts`** goes back to its `8d13a1a` version:
  - no `nonPhoto()` stripping;
  - no p6/p7 location override;
  - the original header and success message.

  It passes once the mappers stop rewriting photos (step 4). It compares
  fixtures → seed rows → mappers, so it never sees 0010's database updates.
- **`server/test/security.test.ts`** goes back to exact assertions. Both
  tests (with and without R2) assert the whole `img-src` list, with one
  exact regex, as before #11. The list is whatever step 3 decides.
- `server/test/pages.test.ts`: the `og:image` assertion goes back to
  `shareImage(row.image, SITE)`, with no `publicPhoto()`.

## 3. CSP and image allow-list

What each host #11 added is needed for, once #12 is reverted:

| Host | Used by | Decision |
|---|---|---|
| `tile.openstreetmap.org` | Nothing. `publicBasemap()`'s OSM fallback is only called by #12's `mapTiles.ts`, which the revert removed. The client uses CARTO (`cartoVoyagerUrl`). | **Remove**, with `OSM_TILES_ORIGIN` and `publicBasemap()`. OSM's tile policy also discourages production use. |
| `thumb.wikimedia.org` | Nothing. No URL in code, migrations or seed uses it. | **Remove.** |
| `upload.wikimedia.org` | **Database rows.** Migration 0010 points up to 60 image fields at it (8 tables, plus 2 galleries) on any database it ran on, including production if it ran there. | **Keep for now**, in both `img-src` and the admin allow-list. Without it, every one of those photos is blocked. Remove it in step 5, once the photos are in R2. |

`IMAGE_HOST_REFUSED` keeps naming Wikimedia while the host is allowed.

## 4. Photos and credits come from the database

**Remove the code overrides:**

- `src/lib/mappers.ts` goes back to `8d13a1a`. Every `image`, `gallery`,
  `url` and photo-story `location` is the row's value.
- `server/src/pages/pages.ts`: `firstImage()` and the row pages use the row's
  `image`.
- Delete these files:
  - `shared/public-photos.ts`
  - `shared/photo-corrections.ts`
  - `shared/legacy-photo-references.json`
  - `src/lib/destination-photo.ts`
  - `shared/optimized-photos.json` (empty `{}`)
- `shared/travel-photos.json` is deleted **after** its credits are copied
  into migration 0011 (below).
- `shared/responsive-image.ts` keeps the home page's hero preload (#11's
  speed-up). It now builds `srcset` from the URL pattern alone
  (Unsplash `w=`, Wikimedia `/1280px-`), with no JSON lookup.

**What the overrides were covering for.** Removing them changes what a
database shows only where 0010 didn't apply:

- **A database where 0010 ran** (any fresh database; production if it ran):
  no visible change. The rows already hold the Wikimedia URLs.
- **A row an admin had edited before 0010**: no change. It keeps the
  admin's photo, as it does today.
- **Photo-story locations.** The code renamed p6 "Hatton Tea Valleys" to
  "Nuwara Eliya" and p7 "Koggala & Weligama" to "Ahangama", so the captions
  match the new photos. 0010 never did that in the database.
- **Jaffna.** The code served the full-size original instead of 0010's
  1280px thumbnail. The reason isn't recorded. I'll check whether the
  thumbnail loads; if it doesn't, 0011 switches that one row to the
  original.

**New migration `0011_image_credits.sql`**, written to be re-runnable
(`if not exists`, `on conflict`), unlike 0009:

```sql
create table if not exists public.image_credits (
  url          text primary key check (url like 'https://%'),
  author       text not null check (length(author) between 1 and 200),
  license      text not null check (length(license) between 1 and 100),
  license_url  text check (license_url like 'https://%'),
  source_url   text check (source_url like 'https://%'),
  updated_at   timestamptz not null default now()
);
-- 32 rows copied from shared/travel-photos.json (url = its "image" value).
insert into public.image_credits (...) values (...) on conflict (url) do nothing;

-- The two caption fixes, guarded like 0010: only rows still on the seed
-- text *and* on 0010's photo.
update public.photo_stories set location = 'Nuwara Eliya', updated_at = now()
 where id = 'p6' and location = 'Hatton Tea Valleys' and image = '<0010 URL>';
update public.photo_stories set location = 'Ahangama', updated_at = now()
 where id = 'p7' and location = 'Koggala & Weligama' and image = '<0010 URL>';
```

- **Why credits are keyed by image URL:** the same photo is used in several
  tables (the Yala leopard is on 6 rows), and a URL stays valid whether the
  photo is on Wikimedia or later in R2. `public.media` can't hold them,
  because it only accepts R2 keys.
- **API:**
  - `GET /api/content` gains `imageCredits`: only the credits whose URL is
    used by a published row.
  - Admin `GET/PUT/DELETE /api/admin/image-credits/:url`, with the same
    session, origin and `expectedUpdatedAt` rules as the other admin
    endpoints.
  - `docs/SCHEMA.md` gets the new table.
- **Admin:** `ImagePicker` shows a credit section under the chosen image
  (author, licence, licence link, source link), edited in place. This
  changes admin UI only, not the frozen public design.
- **Seed and fixtures:** `scripts/fixtures` and 0002 stay on Unsplash, so
  `verify:roundtrip` and the browser baselines compare against the approved
  demo as before.
- **Tests:**
  - migration 0011 runs twice without error;
  - credits round-trip through the admin endpoint (409 on a stale
    revision);
  - `/api/content` only lists credits for published rows;
  - a rewritten mapper test proves a row's photo is passed through
    unchanged.

**Showing the credits to visitors is a public-design change, so I need a
decision from you.** It's also a licence requirement: the Wikimedia photos
are CC BY-SA 4.0, which requires attribution. If 0010 ran on production,
production is showing them **with no credit at all** right now, because #12's
`/photo-credits` page is gone with the revert. The options are under
Questions.

## 5. Afterwards (separate, owner-run)

Copy the Wikimedia photos into R2 and drop `upload.wikimedia.org` from the
CSP. While checking 0010's URLs, Wikimedia answered **HTTP 429 (rate
limited)** to a burst of 32 HEAD requests. Hotlinking ties the site's
photos to someone else's rate limits.

The steps:

1. A one-off script, `images:import`, modelled on `media:rebase`. It needs
   R2 configured in production.
2. Download each `upload.wikimedia.org` image a row uses, upload it to R2
   as a `media` row, and rewrite every content row and every
   `image_credits.url` that pointed at it.
3. Then remove `upload.wikimedia.org` from `img-src` and the allow-list.
   The strict CSP test goes back to exactly Unsplash, R2 and CARTO.

This is a separate plan, written when this one lands.

## Files touched (expected)

- **Changed:**
  - `shared/pg-connection.ts`
  - `server/src/db.ts`
  - `shared/map-tiles.ts`
  - `shared/image-hosts.ts`
  - `server/src/security-headers.ts`
  - `src/lib/mappers.ts`
  - `server/src/pages/pages.ts`
  - `shared/responsive-image.ts`
  - `scripts/verify-roundtrip.ts`
  - `server/src/routes/content.ts`
  - `server/src/routes/admin.ts`
  - `shared/api.ts`
  - `src/admin/components/ImagePicker.tsx`
  - `docs/SCHEMA.md`
  - `README.md` (TLS section)
  - tests under `server/test/`
- **Added:** `db/migrations/0011_image_credits.sql`
- **Deleted:** the five files listed in step 4, then
  `shared/travel-photos.json`.
- **Nothing in `src/components/`** unless you choose credits option A or B
  below; I'll call that out in the PR.

## Checks

- `typecheck`, `build`, `npm test` and `verify:roundtrip` (back at full
  strength) all pass.
- The public page is identical to `demo-baseline`, and the home baseline
  matches `bf94e25`.
- `npm run migrate -- --dry-run` passes against a local database with 0011
  pending, and then against the public proxy (you run that one).

## Questions

1. **Credits on the public site (needed for CC BY-SA):**
   - A. A small "Photo: Author, CC BY-SA 4.0" line on each credited image.
     Touches several frozen components.
   - B. A `/photo-credits` page linked from the footer. One new page type
     (route, head tags, sitemap) and one footer link.
   - C. Neither yet: go straight to step 5 and replace the Wikimedia photos
     with licensed or own photos in R2.

   My recommendation: B. It's the smallest change to the frozen design, and
   it's what #12 tried to do.
2. **The two caption fixes (p6, p7):** apply them in 0011, or leave the
   locations as they are and let an admin change them?
3. **The production `DATABASE_URL` warning:** log only (as planned), or
   refuse to start?
