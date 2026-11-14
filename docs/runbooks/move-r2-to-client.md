# Runbook: move R2 to the client's Cloudflare account

Moves every uploaded image (the media library, the photo sets, the photos of
`npm run images:import` and `content:import`) from our R2 bucket, served from
`r2.dev`, to a new bucket in the client's Cloudflare account, served from
**`https://images.serendibluxetours.com`**. That account owns the domain, so the
custom domain can only be connected there. It also closes launch checklist item 9
(`r2.dev` is rate-limited and meant for development).

Everything here is done by hand, by whoever holds the accounts: the Cloudflare
dashboard, Railway, and a local terminal. No step is for a tool session to run.

**How long:** about an hour, most of it the copy and the checks. Visitors see no
downtime: the site can show images from either address throughout. **Nobody
uploads or deletes images** from the end of step 4 to the end of step 9: say so to
whoever uses the admin. Don't do this while the Railway project is being transferred.

**Needs the `ops/r2-client-account` PR merged and deployed first.** It makes the CSP and the admin always accept
`images.serendibluxetours.com`, so the rows can move before the variables do (and move
back), and adds `R2_PREVIOUS_PUBLIC_BASE_URL`, which keeps the old address allowed
after the variables change.

Placeholders used below:

| Placeholder | What it is | Where to find it |
|---|---|---|
| `<OLD_BASE>` | today's `R2_PUBLIC_BASE_URL`, `https://pub-….r2.dev` | Railway → API service → Variables |
| `<OLD_BUCKET>` | today's `R2_BUCKET` | the same |
| `<NEW_BASE>` | `https://images.serendibluxetours.com` | |
| `<NEW_BUCKET>` | the bucket you create in step 2, e.g. `serendib-media` | |
| `<NEW_ACCOUNT_ID>` | the client's Cloudflare account ID | their Cloudflare → R2 → Overview |
| `<OUR_ACCOUNT_ID>` | our account's ID: today's `R2_ACCOUNT_ID` | Railway → API service → Variables |

The dashboard's labels were right in November 2026; Cloudflare moves them now and then.

Keys go into Railway, your password manager, and rclone's own config file (outside
the repo). Never into the repo, a chat, or a terminal you share.

---

## 1. Before you start (changes nothing)

1. **Save the current R2 values.** Copy all five `R2_*` variables from Railway into your
   password manager, labelled "R2, old account". Rollback needs them.
2. **Back up the database.** Point-in-time recovery is off, so this dump is the only way
   back. Turn the Postgres TCP proxy on (backlog: it's off between `--prod` runs) and:

   ```bash
   npm run db:backup -- --prod
   ```

   It prints the file (`backups/…`, git-ignored), its size and the table count.
   Restoring: [`restore-from-backup.md`](restore-from-backup.md).
3. **Look at what will move:**

   ```bash
   npm run images:audit -- --prod --r2-base <OLD_BASE>
   ```

   It lists how many stored image URLs are on each host, and should end with "nothing
   would be blocked". The count on `<OLD_BASE>`'s host is what step 6 moves.

## 2. Create the bucket in the client's account (Cloudflare dashboard)

Signed in to the client's account, the one with `serendibluxetours.com`:

1. **R2 Object Storage → Create bucket.** Name: `<NEW_BUCKET>`. Location: Automatic, or the
   Asia-Pacific hint. Storage class: Standard. Create.
2. Leave **Public Development URL** (`r2.dev`) **disabled** on it: the custom domain is its
   only public address.
3. **CORS:** none needed. The site shows images with `<img>`, and uploads go through our
   server, never from the browser to R2. (If the old bucket has a CORS policy, copy it
   across anyway; Settings → CORS policy on each.)

## 3. Connect `images.serendibluxetours.com`

1. In `<NEW_BUCKET>` → **Settings → Custom Domains → Add**. Enter
   `images.serendibluxetours.com` and continue. Cloudflare adds the DNS record itself
   (the zone is in the same account).
2. Wait until the domain's status is **Active** (usually a few minutes).
3. Check from a terminal: an empty bucket answers 404, which proves the domain reaches it.

   ```bash
   curl -sI https://images.serendibluxetours.com/nothing-here.jpg | head -1
   ```

## 4. Create the API tokens

**For the app** (it will go into Railway):

1. **R2 → Manage API tokens → Create API token.**
2. Name: `site uploads`. Permissions: **Object Read & Write**. **Apply to specific buckets
   only:** `<NEW_BUCKET>`. TTL: forever.
3. Create, then copy the **Access Key ID** and **Secret Access Key** at once (Cloudflare
   shows the secret once) into the password manager, labelled "R2, client account".

**For the copy, read-only on the old bucket:** in **our** account, the same steps with
**Object Read only**, applied to `<OLD_BUCKET>` only. Name: `copy to client`. You delete
it in step 11.

## 5. Copy every object, and check the copy

Install rclone once (`winget install Rclone.Rclone` on Windows). Then `rclone config` →
**n** (new remote), twice:

| Remote | type | provider | access_key_id / secret_access_key | endpoint |
|---|---|---|---|---|
| `old` | `s3` | `Cloudflare` | the read-only "copy to client" token | `https://<OUR_ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `new` | `s3` | `Cloudflare` | the "site uploads" token | `https://<NEW_ACCOUNT_ID>.r2.cloudflarestorage.com` |

For both, answer `acl` with `private`, and in the advanced options set
`no_check_bucket = true`: a token scoped to one bucket may not create buckets, and
rclone would otherwise try.

**Copy** (`--metadata` keeps each object's Content-Type and Cache-Control):

```bash
rclone copy old:<OLD_BUCKET> new:<NEW_BUCKET> --metadata --checksum --transfers 8 --progress
```

**Verify the counts and sizes match:**

```bash
rclone size old:<OLD_BUCKET>
rclone size new:<NEW_BUCKET>
```

"Total objects" and "Total size" must be identical. Then, file by file:

```bash
rclone check old:<OLD_BUCKET> new:<NEW_BUCKET> --one-way
```

It must end with **0 differences found**. And one file over the custom domain: pick any
key from `rclone ls new:<NEW_BUCKET> | head -3`:

```bash
curl -sI https://images.serendibluxetours.com/<a key> | grep -iE '^HTTP|content-type|cache-control'
```

200, an `image/…` type, and the same Cache-Control as on `<OLD_BASE>/<the same key>`.

## 6. Dry run, then move the rows

The dry run checks every file the database uses on the new domain (`--verify-files`, a
HEAD request each), then reports what would change, and changes nothing:

```bash
npm run media:rebase -- --prod --from <OLD_BASE> --to https://images.serendibluxetours.com --dry-run --verify-files
```

You type the production host back. Expect: "Every file is there", counts for the media
library, each image column and `image_credits`, "Afterwards, nothing in any table mentions
<OLD_BASE>", and "Nothing was changed". If a file is missing, it stops before changing
anything: rerun the step 5 copy. If something "still mentions" the old base, look at it
first (a setting or a paragraph quoting the address, say): the rebase never edits text.

Then the same without `--dry-run`:

```bash
npm run media:rebase -- --prod --from <OLD_BASE> --to https://images.serendibluxetours.com --verify-files
```

From now on the site serves the images from the new domain. It's one transaction: all of
it or none. Running it again is safe and changes nothing.

## 7. Audit

```bash
npm run images:audit -- --prod --r2-base https://images.serendibluxetours.com --previous-base <OLD_BASE>
```

Expect "nothing would be blocked" and "still mentioning the previous base: nothing, every
row has moved".

## 8. Change the variables (Railway → API service → Variables)

| Variable | New value |
|---|---|
| `R2_ACCOUNT_ID` | `<NEW_ACCOUNT_ID>` |
| `R2_ACCESS_KEY_ID` | the "site uploads" Access Key ID |
| `R2_SECRET_ACCESS_KEY` | its Secret Access Key |
| `R2_BUCKET` | `<NEW_BUCKET>` |
| `R2_PUBLIC_BASE_URL` | `https://images.serendibluxetours.com` |
| `R2_PREVIOUS_PUBLIC_BASE_URL` (new) | `<OLD_BASE>`: keeps the old address allowed until step 11 |

Deploy the staged changes. Railway restarts the API service with them.

Your laptop's `.env`: either the same five values, or leave R2 unset there (uploads off
locally). Never the old ones against the new bucket's address.

## 9. Check

1. **The CSP** has both addresses:

   ```bash
   curl -sI <site URL>/ | grep -i '^content-security-policy' | grep -o "img-src[^;]*"
   ```

   It lists `https://images.serendibluxetours.com` and `<OLD_BASE>`.
2. **The content** names only the new address for R2:

   ```bash
   curl -s <site URL>/api/content | grep -oE 'https://[a-z0-9.-]+' | sort | uniq -c
   ```

   No `r2.dev` in the list.
3. **In a browser**, with DevTools' Console open: the home page, a destination with nearby
   attractions, `/journal` and `/photo-credits`. Every photo shows, the console has no
   Content-Security-Policy errors, and `/photo-credits` lists the uploaded photos' credits.
4. **An upload:** Admin → Media, upload a small test image. Its URL starts with
   `https://images.serendibluxetours.com/`, it opens, and `rclone ls new:<NEW_BUCKET>`
   lists it. Delete it from the library; it's gone from the bucket.
5. **Catch up** with anything uploaded to the old bucket since step 5 (both commands change
   nothing if there was none):

   ```bash
   rclone copy old:<OLD_BUCKET> new:<NEW_BUCKET> --metadata --checksum --progress
   npm run media:rebase -- --prod --from <OLD_BASE> --to https://images.serendibluxetours.com --verify-files
   ```

6. Turn the TCP proxy off again. Uploads and deletes can resume.

## 10. Rollback

Before step 8 (only the rows have moved): move them back. The CSP still allows the old
address, through `R2_PUBLIC_BASE_URL`.

```bash
npm run media:rebase -- --prod --from https://images.serendibluxetours.com --to <OLD_BASE> --verify-files
```

After step 8:

1. Put the five old `R2_*` values back in Railway (from step 1.1), remove
   `R2_PREVIOUS_PUBLIC_BASE_URL`, and deploy. The new domain stays allowed (it's in the code).
2. Copy back anything uploaded to the new bucket since. This needs a token that can write to
   the old bucket: use the old app token (the old `R2_ACCESS_KEY_ID`) for an `oldrw` remote.

   ```bash
   rclone copy new:<NEW_BUCKET> oldrw:<OLD_BUCKET> --metadata --checksum --progress
   ```

3. Move the rows back (the command above), then `npm run images:audit -- --prod`.

Last resort: restore the step 1.2 backup ([`restore-from-backup.md`](restore-from-backup.md)).
It loses any enquiry or edit made since, so only if the rows themselves are wrong.

## 11. A week later: retire the old bucket

Only after **seven days with no errors**: no `[media]` warnings and no failed
`/api/admin/media` requests in Railway's logs, no reports of missing photos, and in our
Cloudflare account the old bucket's metrics show no reads (R2 → `<OLD_BUCKET>` → Metrics).

1. Remove `R2_PREVIOUS_PUBLIC_BASE_URL` in Railway and deploy. The CSP no longer allows the
   old address. Check again as in step 9.1 to 9.3. A later PR then removes the variable's
   support from the code.
2. In our account, **disable** the old bucket's Public Development URL. Easy to undo; wait
   another day or two and check again.
3. Take a fresh `npm run db:backup -- --prod`, then run `rclone check old:<OLD_BUCKET>
   new:<NEW_BUCKET> --one-way` one last time (0 differences).
4. Delete the old bucket: `rclone purge old:<OLD_BUCKET>` (with a read-write token), or
   empty and delete it in the dashboard. This can't be undone.
5. Delete the "copy to client" token and the old app token in our account, remove the `old`
   remotes (`rclone config delete old`), and mark the old R2 values in the password manager
   as retired.

## Notes

- `media:rebase` changes only values that **start with** `<OLD_BASE>/`: Unsplash, other
  hosts, and a URL that merely contains the address are left alone. It reports, but never
  edits, any other column in any table that mentions the old base.
- Rows it moves get a new `updated_at`, so `npm run content:import` afterwards treats them
  as edited by an admin and leaves them alone, as it does for any edit.
- The credits (`image_credits`) are keyed by URL, so they move too. If a photo already has a
  credit on the new address, that one is kept and the old one is left and counted.
