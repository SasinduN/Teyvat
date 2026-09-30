# Phase 5 plan: image uploads to Cloudflare R2

Status: APPROVED, with the five changes in "Approved changes" below merged in.

Scope: admins upload images through our API into an R2 bucket, pick them from
a media library, or keep pasting `https://` URLs. Nothing is deleted from R2
automatically: an image leaves the bucket only when an admin deletes it from
the library. `src/components/` does not change.

## Approved changes

1. `R2_PUBLIC_BASE_URL` is the bucket's `r2.dev` address for now. A custom
   domain is required before go-live, and that is on the launch checklist.
2. **No automatic deletion** (replaces the draft's decision 9 and its cleanup
   step). When an image is replaced, or its row is deleted, it shows as
   "Unused" in the library. Objects leave R2 only when an admin deletes them
   there, and deleting one that is in use still gets the 409.
3. **Phone photos.**
   - A HEIC file the browser can't decode gets a clear message telling the
     admin to export it as JPEG.
   - A photo too large for the browser's canvas (48 MP, iPhone Safari's
     limits) is either downscaled safely or refused with a clear message.
     Never a silent failure (section 6).
4. **A test proves a portrait phone photo keeps its orientation** after the
   re-encode. It runs in a real headless Chrome (section 8).
5. **`R2_PUBLIC_BASE_URL` is normalised**: with or without a trailing slash,
   the same base is used.

Already decided (not revisited here):

- Uploads go through `POST /api/admin/media` (`requireAdmin` +
  `sameOrigin`), not presigned URLs. R2 credentials never reach the browser.
- Object keys are `<folder>/<timestamp>-<random>.<ext>`.
- Whether an image is ours is decided on the server, against
  `R2_PUBLIC_BASE_URL`.

## Decisions in this plan

These need a yes or no before any code is written:

1. **A `media` table in Postgres** (section 2) records every upload. The
   library reads it instead of listing the bucket, and "is this ours?" means
   "its URL is under `R2_PUBLIC_BASE_URL/` **and** it has a `media` row". The
   table also gives cleanup something to lock (decision 8).
2. **`aws4fetch` signs the R2 requests** (new server-only dependency, small,
   no transitive dependencies), rather than `@aws-sdk/client-s3`. R2 speaks the
   S3 API, and we need three calls: PUT, DELETE and a HEAD for the health
   check.
3. **The upload body is the raw file** (`Content-Type:
   application/octet-stream`, `?folder=` in the query), not multipart. That
   needs no multipart parser, and the filename is never read, so it can't be
   trusted by accident. The browser sends it with `XMLHttpRequest`, because
   `fetch` reports no upload progress.
4. **The 10 MB limit applies to the bytes uploaded**, after the browser has
   resized them. The browser accepts originals up to 40 MB, so a phone photo
   (often 12–25 MB) can be resized to well under 10 MB and uploaded. The
   alternative is to refuse anything over 10 MB before resizing, which would
   turn away most phone photos. I recommend the 40 MB input allowance.
5. **The browser always re-encodes**, even an image already under 2000 px.
   Re-encoding through a canvas drops EXIF metadata, including the GPS
   location phone cameras embed, which would otherwise be published on the
   site. The one exception: if the browser can't decode a JPEG, PNG, WebP or
   AVIF (an AVIF on an older browser), the original bytes go up and the
   server still checks them. A HEIC the browser can't decode is refused in
   the browser instead, because the server doesn't accept HEIC bytes
   (section 6).
6. **The server checks type and size but doesn't re-encode or measure pixels.**
   Doing either needs an image library with a native binary (`sharp`), which is
   a new build risk on Railway. The 2000 px limit is therefore a browser
   courtesy the server doesn't enforce. The byte cap bounds what a bypassing
   client could upload, and only signed-in admins can upload at all.
7. **Deleting an in-use image from the library** gets 409 with the list of
   rows that use it. The UI shows that list and asks again. Only the second
   request, sent with `?force=true`, deletes. Those rows then show a broken
   image, and the warning says so.
8. **A content save that references one of our URLs must reference a live
   `media` row.** Otherwise it gets 400 "That image was deleted from the
   library." The save takes a share lock on those `media` rows inside its
   transaction, and a library delete takes an update lock. So "admin A
   deletes an unused image" and "admin B's save starts using it" can't
   interleave: whichever commits first, the other sees it.
9. **Nothing is deleted automatically** (approved change 2). An image that
   no row uses shows as "Unused" in the library until an admin deletes it.
10. **Folders are an allow-list**: the `folder` values already on the image
    fields in `shared/content-schema.ts` (`destinations`, `experiences`,
    `tours`, `journal`, `authors`, `hidden-gems`, `photo-stories`, `hero`),
    plus `library` for uploads made from the library page. Any other value is
    400, so a key can never contain a path the client chose.

### The public URL for R2 (settled)

`r2.dev` for now (approved change 1). Switching to a custom domain later
means rewriting stored URLs, because the base is part of every one. That's a
one-off `update … replace(…)` script, written when the domain exists.

## Findings that shape the plan

- **The old client-side cleanup was wrong in two ways.** `isStorageUrl` ran in
  the browser, and `deleteImageByUrl` deleted an image even when another row
  still used it. Both go, along with the rest of `src/lib/storage.ts`.
- **`.env` now holds real R2 credentials**, and the tests load `.env`. The
  test setup (`server/test/test-db.ts`) clears every `R2_*` variable, just as
  it replaces `DATABASE_URL`, so no test can ever reach the real bucket.
- **No CSP exists**, so `<img>` tags can load from the R2 domain without a
  policy change.
- **Uploaded files are served from R2's domain, not ours.** That's good
  isolation: even a file that slipped past the checks couldn't read the admin's
  session cookie, which is `__Host-` on our origin. R2 serves the
  `Content-Type` stored with each object, and we set that from the sniffed
  type, never from the client.
- **No R2 CORS setup is needed.** The browser resizes the local file before
  upload and never reads pixels back from R2. The public site only shows
  images with `<img>`.
- **`express.json` is limited to 100 kB app-wide.** The media route gets its
  own `express.raw({ limit: 10 MB })` and nothing else does.

## 1. Configuration: `server/src/env.ts`

New optional variables. They must be all set or all unset:

| Variable | Example |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account id (endpoint is `https://<id>.r2.cloudflarestorage.com`) |
| `R2_ACCESS_KEY_ID` | from an R2 API token scoped to this bucket, Object Read & Write |
| `R2_SECRET_ACCESS_KEY` | from the same token |
| `R2_BUCKET` | bucket name |
| `R2_PUBLIC_BASE_URL` | `https://…`, no trailing slash |

- **All set:** uploads are on.
- **None set:** the site runs normally, and media routes that need R2 answer
  **503 `not_configured`** "Image uploads aren't configured on this server."
  The library page and the image field show that message in place of the
  upload button. Pasting a URL still works.
- **Some set:** the same as none, plus one warning at boot naming the missing
  variables. The server does not exit: a typo in an image setting must not
  take the whole site down.
- `R2_PUBLIC_BASE_URL` must start with `https://`, or it counts as missing.
  Trailing slashes are stripped once, at boot, so `https://x.r2.dev` and
  `https://x.r2.dev/` give the same base. Every URL is built as
  `base + '/' + key`, and "ours" is tested against `base + '/'`.
- `ApiErrorCode` gains `not_configured` (503), `payload_too_large` (413) and
  `unsupported_media_type` (415).
- Railway variables to add in the dashboard (not the CLI): the five above.
  `CLAUDE.md` gets them in its list, without values.

## 2. Migration `0005_media.sql`

```sql
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,     -- <folder>/<timestamp>-<random>.<ext>
  url          text not null unique,     -- R2_PUBLIC_BASE_URL/key
  content_type text not null check (content_type in
                 ('image/jpeg','image/png','image/webp','image/avif')),
  bytes        integer not null check (bytes between 1 and 10485760),
  uploaded_by  uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists media_created_idx on public.media (created_at desc);
```

Idempotent, like the others.

## 3. Storage module: `server/src/media/`

- `store.ts`: an `ObjectStore` interface (`put(key, bytes, contentType)`,
  `delete(key)`, `ping()`), with:
  - `r2Store(config)`, which uses `aws4fetch` against
    `https://<account>.r2.cloudflarestorage.com/<bucket>/<key>`. The endpoint
    is a constructor argument, so tests point it at a local fake server
    instead of Cloudflare;
  - `memoryStore()`, for tests.
- `createApp()` gains an optional `{ objectStore }`. By default it is built
  from the environment, or `null` when R2 isn't configured, which gives the
  503s above. Tests pass `memoryStore()` or `null`.
- Every `put` sends:
  - `Cache-Control: public, max-age=31536000, immutable` (keys never repeat,
    so a year is safe);
  - `Content-Type` from the sniffed bytes.
- `sniff.ts` (section 4). `usage.ts` (section 7).
- `GET /api/health` reports `media: 'up' | 'down' | 'not_configured'`. It's
  informational: the health check still passes on the database alone, so an
  R2 outage can't fail a Railway deploy.

## 4. File checks, on the server

`sniff.ts` reads the first bytes and returns a type or null. The filename and
the request's `Content-Type` are never consulted.

| Type | Signature |
|---|---|
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| WebP | `RIFF` at 0, `WEBP` at 8 |
| AVIF | `ftyp` at 4, and brand `avif` or `avis` (major or compatible) |

- **Anything else is 415**: GIF, HEIC (`ftyp heic`), PDF, text.
- **SVG gets its own 415 message**, "SVG isn't accepted because it can carry
  scripts." It's detected as text starting, after an optional BOM and
  whitespace, with `<svg` or `<?xml`. This is for the message only: anything
  unrecognised is already refused.
- **Over 10 MB (10 485 760 bytes) is 413.** `express.raw` enforces the limit
  while reading, so an oversized body isn't buffered in full.
- **Empty body is 400.**
- The extension in the key comes from the sniffed type (`jpg`, `png`, `webp`,
  `avif`).

## 5. API: `/api/admin/media`

All routes are `requireAdmin` + `Cache-Control: no-store`; writes also pass
`sameOrigin`.

| Route | Result |
|---|---|
| `POST /api/admin/media?folder=<folder>` | raw body. 201 `{ id, url, key, contentType, bytes }`; 400 bad folder or empty; 413; 415; 503 |
| `GET /api/admin/media` | the library, newest first, each with `usedBy: { table, id, title }[]` |
| `GET /api/admin/media/usage?url=…` | rows using that URL (used by the image field before replacing) |
| `DELETE /api/admin/media/:id` | 204 if unused; 409 `{ usedBy }` if used; `?force=true` deletes anyway; 502 if R2 refuses; 503 |

Upload order:

1. Sniff and check.
2. `put` to R2.
3. Insert the `media` row.

If the insert fails after the put, the object is deleted again (best effort,
logged), so there's no row-less object.

Library delete, in one transaction:

1. Lock the `media` row (`for update`).
2. Run the usage check. If the image is in use and there's no `force`, 409.
3. `store.delete(key)` while the lock is held. If R2 refuses, roll back and
   answer 502 "Couldn't delete it from storage. Try again." The row stays, so
   the library still shows the image and the admin can retry.
4. Delete the row and commit.

`ApiErrorCode` also gains `bad_gateway` (502) for that case.

## 6. Browser side

`src/lib/media.ts`:

- `prepareImage(file)`:
  - Reads the first bytes to identify the file. JPEG, PNG, WebP and AVIF are
    accepted, and so is HEIC as *input* (from `ftyp` brands `heic`, `heix`,
    `hevc`, `hevx`, `heim`, `heis`, or `mif1`/`msf1` without an AVIF brand).
    SVG gets the scripts message; anything else is refused. The 40 MB input
    limit applies (decision 4).
  - Decodes with `createImageBitmap(file, { imageOrientation: 'from-image' })`,
    so the EXIF rotation is applied to the pixels before EXIF is dropped. A
    portrait phone photo stays portrait.
  - **HEIC the browser can't decode** (Chrome, Firefox, Edge; Safari usually
    can): refused with "This is a HEIC photo, which this browser can't read.
    Export it as JPEG first (on an iPhone: Settings → Camera → Formats → Most
    Compatible, or share the photo and save it as JPEG), then upload that." A
    HEIC Safari decodes goes through the normal re-encode, so the server
    only ever receives WebP or JPEG from it.
  - **Photos too large for the canvas.** The output canvas is at most 2000 px
    wide and at most 16 777 216 px in area (iOS Safari's canvas limit). So a
    tall panorama is scaled down until it fits both limits, never upscaled.
    Large sources (48 MP) are handled in two steps:
    1. A full-size decode is tried.
    2. If it throws (out of memory), a second try asks the decoder to
       downsample directly: `createImageBitmap(file, { resizeWidth, … })`.
    3. If both fail: "This photo is too large for this browser to process.
       Try a smaller export, or use a desktop browser." Never a silent
       failure.
  - **Guards against the silent kinds of failure:**
    - `toBlob` returning `null`;
    - an empty blob;
    - a canvas that comes back fully transparent from an opaque source (JPEG
      or HEIC). iOS Safari draws nothing when it runs out of canvas memory.

    Each raises the "too large" message instead of uploading a blank image.
    Canvases are released (width and height set to 0) after use, because iOS
    counts canvas memory across the page.
  - Scales to at most 2000 px wide and keeps the aspect ratio.
  - Encodes with `canvas.toBlob('image/webp', 0.85)`. If the browser can't
    encode WebP, the blob comes back as another type, so this checks
    `blob.type` and falls back to `image/jpeg` at 0.85.
  - If the result is still over 10 MB, refuses with a clear message.
- `uploadImage(blob, folder, onProgress)`: XHR `POST` with upload progress,
  and the same error parsing as `http.ts`.
- The target-size calculation (width limit plus area limit) is a pure
  function in `shared/`, unit-tested in Node. The decode and encode path is
  tested in headless Chrome (section 8).

### One image field: `src/admin/components/ImagePicker.tsx`

Used by every `image` and `imageList` field, replacing the phase 4 URL boxes:

- **Upload:** pick a file, see its preview and a progress bar. The result's
  URL goes into the field.
- **Library:** a modal grid of uploads (newest first, with search by folder).
  Click one to use it.
- **URL:** paste `https://…`. This keeps the Unsplash URLs working. Validation
  is unchanged: any `https://` URL.
- The preview and broken-image indicator stay. `imageList` gets the same three
  ways to add, plus move and remove.
- When uploads aren't configured, **Upload** is replaced by the 503 message.
  **Library** and **URL** keep working.

### Media library page: `/admin/media`

- A grid of every upload with its thumbnail, folder, size and date, and "Used
  by N" or "Unused". A filter shows only the unused ones: those are what an
  admin clears out, since nothing is deleted automatically.
- An upload button with progress; it uploads into the `library` folder.
- Copy URL.
- Delete:
  - unused: an ordinary confirm;
  - in use: lists the rows ("Tours: Island in 7 Days", …) and warns they will
    show a broken image, then deletes with `force`.
- A sidebar item under "Site".

## 7. Usage, on the server

- **Where images live.** `usage.ts` builds its query from the `image` and
  `imageList` fields in `shared/content-schema.ts`, so a new image column is
  covered with no extra code. Unpublished rows count as usage. The library's
  "Used by" / "Unused" and the delete 409 both come from it.
- **What counts as ours.** The URL starts with `R2_PUBLIC_BASE_URL + '/'`
  (normalised, section 1), with the slash: `https://media.example.lk.evil.com/…`
  isn't ours. It must also match a `media` row.
- **Nothing is deleted on save** (approved change 2). A replaced image, or the
  images of a deleted row, simply become "Unused".
- **A content save** takes `for key share` on the `media` rows of every one
  of our URLs it writes, and gets 400 if one has no row (decision 8).
- **Unchanged:** the phase 4 rules (409 on a stale version, the last hero
  slide, reorder).

## 8. Tests (no real bucket)

`server/test/media.test.ts`, using `memoryStore()` unless noted:

- **Sniffing**, with hand-built byte buffers:
  - each of the four types is accepted;
  - PNG bytes sent as `Content-Type: image/jpeg` are stored as PNG;
  - SVG (plain, with an XML prolog, with a BOM and leading whitespace) is
    refused with the scripts message;
  - GIF, HEIC, PDF, text, an empty body and a truncated header are refused.
- **Upload:**
  - 401 without a session, 403 cross-origin;
  - 413 at 10 MB + 1 byte, and a file of exactly 10 MB is accepted;
  - 400 for an unknown folder;
  - 201 returns a key matching `<folder>/<digits>-<hex>.<ext>`, the store
    received `Cache-Control: public, max-age=31536000, immutable` and the
    sniffed type, and the `media` row exists.
- **Not configured**, with `objectStore: null`:
  - upload and delete get 503 `not_configured`;
  - the library list, `/api/content` and `/api/health` still answer;
  - `env.ts` with none of the variables, and with some, doesn't exit.
- **R2 client:** `r2Store` pointed at a local HTTP server that records
  requests. Checked:
  - `PUT /<bucket>/<key>` carries the cache and type headers and an
    `AWS4-HMAC-SHA256` `Authorization`;
  - `DELETE` works;
  - a non-2xx answer becomes an error.
- **Ownership:** an R2-prefixed URL with no `media` row isn't ours; the
  `…example.lk.evil.com` prefix trick isn't ours; an Unsplash URL is never
  deleted.
- **No automatic deletion:** replacing a row's image, or deleting the row,
  leaves the old object in the store and its `media` row in place, and the
  library shows it "Unused".
- **Race guard:** a save referencing an R2 URL whose `media` row was deleted
  gets 400.
- **Library delete:**
  - unused → 204, and the object is gone;
  - used → 409 with `usedBy`, and nothing is gone;
  - with `force` → 204;
  - a store that refuses the delete → 502, and the row is still listed.
- **Base URL:** `R2_PUBLIC_BASE_URL` with and without a trailing slash builds
  identical URLs and ownership checks.
- **Test isolation:** after `test-db.ts` runs, no `R2_*` variable is set.
- **Resize maths:** the target-size function (wide, tall, already small,
  exactly 2000 px, a 48 MP photo, a panorama over the area limit).
- **In headless Chrome** (`server/test/browser-image.test.ts`). It drives the
  installed Chrome over the DevTools protocol with Node's built-in WebSocket,
  so there's no new dependency. `src/lib/media.ts` is bundled with esbuild,
  which is already a dev dependency. `CHROME_PATH` overrides the location;
  with no Chrome found, the test is skipped with a message saying so.
  - **Orientation:** a JPEG is built in the page, 60×40 stored pixels, red on
    the left half and blue on the right, with an EXIF APP1 segment spliced in
    saying Orientation 6 ("rotate 90° clockwise to view"). After
    `prepareImage`, the output must be 40×60 (portrait), red on top and blue
    at the bottom, with no EXIF left in the output bytes.
  - **HEIC:** HEIC `ftyp` bytes give the "export as JPEG" message, not an
    upload and not a generic error.
  - **Large photo:** an 8000×6000 (48 MP) image comes out at most 2000 px
    wide. With the area limit forced low, it still comes out within it,
    or gets the clear "too large" error, never a blank image.
  - **Encoding:** the output is WebP in Chrome, and every output is at most
    2000 px wide.

## 9. Removed

- `src/lib/storage.ts` (the Supabase uploader) and its `isStorageUrl` /
  `deleteImageByUrl`.
- `cleanup.ts` from the draft: not written (approved change 2).
- `scripts/migrate-images.ts` and `npm run images:migrate` are still
  Supabase-only. Phase 7 removes them with the rest of Supabase. Moving the
  seeded Unsplash images into R2 isn't in scope; say if you want it.

## 10. Checks and wrap-up

- `typecheck`, `verify:roundtrip`, `npm test`, `build`.
- `git diff 099c53c -- src/components/` must be empty.
- Bundle: the public page must be unchanged; report the admin chunk before and
  after.
- README: R2 setup (bucket, a token scoped to it, a public domain, the five
  variables), the media library, cleanup rules, and a launch-checklist entry
  for a custom domain in place of `r2.dev`. CLAUDE.md: the phase table, the
  Railway variable list and notes.
- Commit locally, show the results, and ask before pushing. You set the R2
  variables in Railway and check uploads on the live site.
