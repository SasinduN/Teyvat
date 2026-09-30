# CLAUDE.md

Teyvat: the Travel Eye Sri Lanka public site (`/`) and its admin panel
(`/admin`). Vite + React 19 client, plus an Express API in `server/` backed by
Railway Postgres. Both are served from one origin. We are migrating off
Supabase in phases. Setup and commands are in `README.md`; the schema is in
`docs/SCHEMA.md`.

This repo is public. Never put secrets, connection strings, or passwords in
this file or anywhere else in git.

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| 1 | Railway Postgres, migration runner, `site_settings` | done (`11d77e2`) |
| 2a | Express API, shared types, `GET /api/content` | done (`d50988d`) |
| 2b | Public site reads `/api/content`: hero slides, pillars, site settings, spotlight from `featured` | done |
| 3 | Auth on our own `users` / `sessions` tables (replaces Supabase Auth) | done |
| 4 | Admin CRUD endpoints (replaces Supabase queries in `src/admin`) | done |
| 5 | Image uploads to Cloudflare R2 (replaces Supabase Storage) | done |
| 6 | Inquiries endpoints: public submit and admin inbox | done |
| 7 | Remove Supabase entirely, update docs, deploy | next |

Update the Status column when a phase lands.

### Notes for later phases

- **Images:** every form uses `ImagePicker` / `ImageListPicker`
  (`src/admin/components/ImagePicker.tsx`): upload, library or URL. Nothing is
  deleted from R2 automatically; only a library delete removes an object.
  The R2 custom domain is on the README launch checklist.
- **Phase 7:** `scripts/migrate-images.ts` and `npm run images:migrate` are
  still Supabase-only. Remove them with the rest of Supabase.
- **Phase 7:** Supabase is already out of the code (phase 6). What's left:
  - the README sections marked "Out of date";
  - `docs/SCHEMA.md`'s RLS and Storage sections;
  - three historical comments (`SiteStatus.tsx`, `shared/api.ts`,
    `shared/pg-types.ts`);
  - deleting the old Supabase project once the user has checked it for real
    enquiries.
- **Enquiries:**
  - The public insert's column list is `INQUIRY_INSERT_COLUMNS`
    (`shared/inquiry-schema.ts`); never read `status`, `admin_notes`, `spam`
    or `closed_at` from a request.
  - The honeypot in `InquiryModal` must stay its form's first child (Tailwind
    v4's `space-y-*` puts a margin on every child but the last).
  - `server/test/browser-inquiry.test.ts` compares its render against
    `faed6bc`.
- **Site settings links** are NULL or `https://…` (migration 0004). An unset
  link renders without an `href`; `Footer.tsx` is unchanged.

### Where things live

- Seed content: `scripts/fixtures/*.ts`. It feeds `npm run seed:generate` and
  `npm run verify:roundtrip`. Nothing under `src/` may import it; the app reads
  everything from `GET /api/content`.

## Standing rules

- **Plan first, then stop.** Write the plan and wait for approval before
  writing any code.
- **The public design is approved and frozen.** Any change to markup,
  `className` or layout in `src/components/` must be called out in the plan
  before it is written. Review with:
  `git diff demo-baseline -- src/components/`
- **Never run the Railway CLI.** It is linked at the home directory to a
  different project (`alluring-warmth`), not Teyvat. We deploy by pushing to
  `main`, and Railway deploys from GitHub automatically.
- **Railway API service variables:**
  - `DATABASE_URL = ${{Postgres.DATABASE_URL}}`
  - `NODE_ENV=production`
  - `NPM_CONFIG_PRODUCTION=false`. Without it, `npm ci` skips vite and
    typescript and the build fails.
  - Do not set `PORT`. Railway injects it.
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
    `R2_PUBLIC_BASE_URL`: image uploads. All five or none; missing ones turn
    uploads off without stopping the site.
  - `RESEND_API_KEY`, `NOTIFY_EMAIL_TO` (and optionally `NOTIFY_EMAIL_FROM`,
    `PUBLIC_SITE_URL`): new-enquiry emails. Off without the first two.
- **Never log request data.** `errorHandler` logs errors through
  `describeForLog` (no Postgres `detail`, no request bodies). Enquiry names,
  emails and messages must never reach the logs.
- **The local API runs on port 8081**, because Apache holds 8080. Vite proxies
  `/api` there.
- **The brand is undecided.** The code says "Travel Eye". Don't rename it, and
  don't add new brand strings.
- **`db/migrations/0002_seed.sql` is an upsert.** Never run it by hand against
  production. It overwrites admin edits.
- **Rotate the Postgres password before go-live.** It is on the launch
  checklist.

## Checks

- `npm run typecheck`
- `npm run verify:roundtrip` must pass. It proves the rows the database stores
  map back to exactly the values the approved components render.
- The public page must look identical to `demo-baseline`.
