# Plan: fix forward from PR #11

Status: APPROVED (2026-10-09), with these answers:

- **Attribution:** option B. A `/photo-credits` page, linked from the footer.
- **The Wikimedia photos move into R2 as part of this work.**
  - Each image migration 0010 placed is copied into R2, respecting
    Wikimedia's rate limits, with a descriptive User-Agent.
  - Rows are rewritten to the R2 URL only where they still hold the
    Wikimedia URL, and the credits move with them.
  - Then `upload.wikimedia.org` leaves the CSP. If that's too big for one
    PR, it goes in a second PR straight after.
- **Newsletter (from #11):**
  - a consent line on the form;
  - a working unsubscribe link and token;
  - a privacy-policy item on the launch checklist;
  - and an answer: does anything send newsletters? If not, say so, and
    propose whether to hide the form.
- **`docs/reviews/`:** commit the review `.md`, and git-ignore the
  screenshots.

Not answered, so these follow the draft's recommendations:

- the p6/p7 caption fixes go into migration 0011;
- a production `DATABASE_URL` that isn't Railway's internal one only logs a
  warning.

Background: `docs/reviews/ui-review-2026-10-09.md`. #13 (the revert of #12)
is merged, so `main` matches #11's merge, `12c972a`.

## Two PRs, because of ordering

The Wikimedia host can only leave the CSP once production's rows point at
R2. The copy needs:

- production's R2 credentials;
- production's database;
- outbound requests to Wikimedia.

Neither CI nor I (I don't connect to production) can do that, so the owner
runs it as a script, between the two PRs.

| | PR A (this one) | You, between them | PR B (straight after) |
|---|---|---|---|
| What | Everything below, including the `images:import` script. The CSP still allows `upload.wikimedia.org`. | `npm run images:import -- --dry-run`, then `npm run images:import`, from `main` once PR A is deployed. Then `npm run images:audit` with PR B's branch. | Removes `upload.wikimedia.org` from `img-src` and the allow-list. The strict CSP test becomes exactly Unsplash, R2 and CARTO. |
| Safe to merge | Any time. Nothing visible changes except the footer additions and the new pages. | Re-runnable. Every image is its own transaction. | **Only once the audit shows nothing blocked** (launch checklist item 16). |

Merging B early is still safe. Its migration (0013) puts any row still on a
0010 Wikimedia URL back on its seed photo, so nothing becomes a CSP-blocked
image. The cost is losing the new photos on those rows. On a database where
the import ran, 0013 finds nothing to do. On a fresh local database (0002,
then 0010, then 0013) the rows end up on the seed photos, matching the
fixtures.

---

## PR A

### 1. Database connections (`shared/pg-connection.ts`)

Follow libpq's meanings, so the URL says what it does:

| `sslmode` | TLS | Verify certificate |
|---|---|---|
| absent / `disable` | no | n/a. The deployed app's internal URL. |
| `allow`, `prefer`, `require` | yes | **no** (as before #11). Railway's public proxy works again. |
| `verify-ca`, `verify-full` | yes | yes |
| `no-verify` | yes | no, for any host |
| anything else | error | |

- The comment explaining the trade-off comes back.
- `server/src/db.ts` logs one warning when `NODE_ENV=production` and the
  host isn't `*.railway.internal`. It names neither the host nor the URL.
- `connection-policy.test.ts` is rewritten to cover the table.

### 2. Restore the two checks

- `scripts/verify-roundtrip.ts` goes back to its `8d13a1a` version.
- `security.test.ts` asserts the whole `img-src` list exactly, with and
  without R2.
- `pages.test.ts` uses the row's `image` again.

### 3. CSP and image allow-list

| Host | Used by | In PR A |
|---|---|---|
| `tile.openstreetmap.org` | Nothing since the revert. The client uses CARTO. | Removed, with `OSM_TILES_ORIGIN` and `publicBasemap()`. |
| `thumb.wikimedia.org` | Nothing. | Removed. |
| `upload.wikimedia.org` | Database rows written by 0010. | **Kept** until PR B. |

### 4. Photos and credits come from the database

- **Removed:**
  - `shared/public-photos.ts`
  - `shared/photo-corrections.ts`
  - `shared/legacy-photo-references.json`
  - `shared/travel-photos.json` (its credits move into 0011)
  - `shared/optimized-photos.json`
  - `shared/responsive-image.ts`
  - `src/lib/destination-photo.ts`
- `src/lib/mappers.ts` goes back to `8d13a1a`.
- `server/src/pages/pages.ts` uses each row's own `image`. The home page
  keeps #11's hero preload, but as a plain `href`. The `imagesrcset`
  variants were for #12's `TravelImage`, which is gone; the hero requests
  the plain URL, so the variants would have downloaded a second copy.
- **Migration `0011_image_credits.sql`** (re-runnable):
  - Adds a table:
    `image_credits (url pk, author, license, license_url, source_url, updated_at)`.
  - Adds 32 rows from `travel-photos.json`, keyed by the URL that 0010
    stored.
  - Applies the guarded p6/p7 caption fixes: only where the location is
    still the seed text and the photo is still 0010's.
- **API:**
  - `GET /api/content` gains `imageCredits`: only the credits whose URL a
    published row uses.
  - New admin endpoints: `GET /api/admin/image-credits` (each credit with
    the rows using its URL), plus `POST`, `PUT /:url` (with
    `expectedUpdatedAt`) and `DELETE /:url`.
- **Admin:** a "Photo credits" page beside the media library. It lists every
  credit with its thumbnail and where it's used, and lets you add, edit and
  delete.
- **Public `/photo-credits`**, one new page type:
  - The route is lazy, like every other page.
  - Head tags: `PAGE_TITLES.photoCredits` / `PAGE_DESCRIPTIONS.photoCredits`.
    The title comes from the existing `pageTitle()`, so no new brand
    string.
  - It's in the sitemap.
  - Its layout is a `PageHero` and a grid of thumbnails, each with "Photo:
    author · licence (link) · source (link)". It renders only what
    `imageCredits` holds, and says so if it's empty.
- **Footer, a frozen component, changed as approved:** one "Photo credits"
  link in the bottom bar, before Privacy Policy.

### 5. `npm run images:import` (`scripts/images-import.ts`)

The logic lives in `server/src/media/import.ts`, so it can be tested with a
fake Wikimedia server and `memoryStore()`.

1. Find every distinct `https://upload.wikimedia.org/…` URL in any image
   column, drafts included (`storedImages()`).
2. For each URL, one at a time:
   - Download it with `User-Agent: Teyvat-image-import/1.0 (+https://github.com/SasinduN/Teyvat)`.
   - Wait at least 2 s between requests.
   - On 429 or 503, honour `Retry-After`; otherwise back off exponentially
     from 5 s, up to 5 tries.
   - Refuse anything over 10 MB, and anything that isn't JPEG, PNG, WebP or
     AVIF by its bytes (`sniffImage`).
3. Upload to R2 as `library/<timestamp>-<random>.<ext>` and insert a
   `media` row (`uploaded_by` null).
4. In one transaction per image:
   - Rewrite every image column (plain and list) **where the value is still
     that exact URL**.
   - Move its `image_credits` row to the new URL (`source_url` still names
     the Commons page).
   - If the transaction fails, the R2 object is deleted, the same as a
     failed upload.
5. `--dry-run` lists the URLs and the rows using each, and downloads
   nothing.

Other details:

- It reads `DATABASE_URL` and the five `R2_*` variables. It refuses to run
  without R2, and prints the target database first, like `media:rebase`.
- It's re-runnable: a URL already moved is no longer found.
- A failure on one image is reported, and the others carry on.

### 6. Newsletter

**Does anything send newsletters? No.**

- Nothing reads `newsletter_subscribers`. Resend is only used for
  new-enquiry emails.
- On `main` the footer form doesn't even call `POST /api/newsletter`. It
  shows "Welcome to Travel Eye Dispatch!" and stores nothing. #12 was what
  wired it up.

In PR A:

- **The form posts to `/api/newsletter`**, with a hidden honeypot field and
  real error messages. A success message for a subscription that never
  happened is worse than none.
- **A consent line under the button:** "By subscribing you agree to receive
  occasional emails from us. Unsubscribe at any time from the link in every
  email." It ends with "Privacy Policy" linking to `privacyUrl` when that's
  set (no `href` while unset, like the bottom bar).
- **Migration `0012_newsletter_unsubscribe.sql`:**
  - `unsubscribe_token uuid not null unique default gen_random_uuid()`, so
    existing rows get one;
  - `consented_at timestamptz not null default now()`.
- **`POST /api/newsletter/unsubscribe {token}`:**
  - deletes the row, so the address is gone, not just flagged;
  - always answers 200 (no membership leak);
  - is rate-limited like subscribing.

  It's a POST because link scanners in mail clients follow GETs.
- **Public `/unsubscribe?token=…`:**
  - a small page with one "Unsubscribe" button;
  - `noindex`, not in the sitemap;
  - no link to it on the site;
  - a missing or malformed token shows a message.

  `newsletterUnsubscribeUrl(origin, token)` in `shared/site-paths.ts` builds
  the link any future sender must put in every email (plus the
  `List-Unsubscribe` header).
- **Launch checklist:** item 12 adds that the privacy policy must cover the
  newsletter. A new item records that nothing sends newsletters.

**Proposal: hide the form until sending exists.** Until then, every address
collected is personal data held for a mailing that can't happen. I haven't
hidden it in this PR, because that's your call. It would be a one-line
change in `Footer.tsx`.

### 7. Housekeeping

- `docs/reviews/ui-review-2026-10-09.md` is committed.
  `docs/reviews/*/` (the screenshots) goes into `.gitignore`.
- `scripts/bundle-report.ts`:
  - drops #11's "Explore" row (no such page since the revert);
  - marks Home's map again;
  - adds Photo credits and Unsubscribe.
- CLAUDE.md notes:
  - images: the allow-list is temporarily Unsplash + R2 + Wikimedia;
  - credits;
  - newsletter;
  - the TLS table's pointer.
- `docs/SCHEMA.md`: `image_credits`, and the new newsletter columns.
- README: the TLS table, and `images:import`.

### Checks

- `typecheck`, `build`, `npm test` and `verify:roundtrip` all pass.
- The home baseline matches `bf94e25`. The footer's new link and consent
  line are inside `Footer`, which that test doesn't compare.
- `git diff demo-baseline -- src/components/` changes only `Footer.tsx`, as
  approved.

## PR B

- Removes `upload.wikimedia.org` from `WIKIMEDIA_ORIGINS` (and the constant
  itself). `IMAGE_HOST_REFUSED` goes back to "the media library or
  Unsplash".
- `security.test.ts` expects exactly Unsplash, R2 and CARTO.
- **`0013_wikimedia_fallback.sql`:** any row still on a 0010 Wikimedia URL
  goes back to its seed URL. It mirrors 0010 in reverse, with the same
  guards.
- Merge **only after** `images:import` and an `images:audit` (run with PR
  B's branch) that reports nothing blocked.
