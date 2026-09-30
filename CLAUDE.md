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
| 5 | Image uploads to Cloudflare R2 (replaces Supabase Storage) | next |
| 6 | Inquiries endpoints: public submit and admin inbox | |
| 7 | Remove Supabase entirely, update docs, deploy | |

Update the Status column when a phase lands.

### Notes for later phases

- **Phase 5:** image fields are `https://` URL boxes until uploads exist
  (`ImageField` / `ImageListField` in `src/admin/components/fields.tsx`).
  `src/lib/storage.ts` is the old Supabase uploader, unused since phase 4;
  replace it rather than revive it.
- **Phase 6:** `InquiriesPage` shows a placeholder. The old Supabase inbox UI
  is kept, unrouted, as `InquiriesInbox` in the same file, so phase 6 swaps
  its data calls rather than rebuilding it. Put the dashboard's enquiry counts
  back too.
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
