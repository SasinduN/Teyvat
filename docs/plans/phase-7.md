# Phase 7 plan: clean-up and launch readiness

Status: DRAFT, waiting for approval. No code has been written.

Two parts:

- **7a: code and docs.** I build these: the README and SCHEMA rewrite, CI,
  security headers, error boundaries, a database restore guide, and a script
  for the R2 URL move.
- **7b: launch decisions only people can make.** A single checklist,
  `docs/LAUNCH-CHECKLIST.md`, merging every launch item so far, each marked
  with what it blocks and who does it. 7a writes the file; the decisions stay
  yours.

## Decisions in this plan

These need a yes or no before any code is written:

1. **Images are limited to an allow-list, enforced in two places.**
   - The CSP allows images only from our own origin, Unsplash, the R2 public
     URL and the map tiles.
   - Since phase 4, though, the admin accepts *any* `https://` image URL. A
     picture pasted from another host would pass validation and then be
     blocked by the browser, so the site would look broken and nothing would
     say why.
   - So the same allow-list (`shared/image-hosts.ts`) drives both the CSP and
     the admin's URL check: "Images must come from the media library or
     Unsplash."
   - The alternative is `img-src https:`, which allows any https image. That's
     looser, but nothing breaks.
   - Before deploying, a read-only `npm run images:audit` lists any stored
     image URL outside the list. You run it against production. If it finds
     some, they are re-uploaded first.
2. **`style-src` keeps `'unsafe-inline'`; `script-src` doesn't.** Sonner, the
   admin's toast library, injects a `<style>` element at runtime, so a strict
   `style-src` would leave toasts unstyled. Inline *styles* are low-risk; inline
   *scripts* are what XSS needs, and `script-src 'self'` allows none.
   (React's `style={…}` and Leaflet's positioning set styles through the
   CSSOM, which CSP doesn't restrict.)
3. **Leaflet's stylesheet stays on `unpkg.com`**, pinned by its existing
   integrity hash, and the CSP allows that one host. Moving it into our bundle
   would change the order in which stylesheets load. That's a risk to the
   frozen design for no security gain, given the integrity hash.
4. **HSTS starts at one day** (`max-age=86400`), with no `includeSubDomains`
   and no `preload`. A long HSTS can't be withdrawn from browsers that have
   seen it. It goes to one year in 7b, once the real domain is settled.
5. **A crashed public section disappears instead of showing an error box.**
   The approved design has no error states, and an empty gap is closer to the
   design than an invented message. The error is logged to the console. Only
   if the whole page fails does the existing `SiteError` screen show.
6. **CI and deploys: pull requests into `main`, plus Railway's "Wait for CI".**
   - Requiring CI to pass for `main` means changes reach it through pull
     requests, so I would push a branch and open a PR instead of pushing
     `main`.
   - Railway's "Wait for CI" holds every deploy until GitHub Actions has
     passed on that commit, as a second guard.
   - If you'd rather keep pushing straight to `main` while you work alone,
     leave out the two PR rules in section 2, and "Wait for CI" alone still
     stops a failing commit from deploying.
7. **Teammates develop against a local database, never production.** Today
   `.env`'s `DATABASE_URL` points at production. The new onboarding uses a
   local `teyvat_dev` (seeded by `npm run migrate`), so a new teammate's first
   `npm run dev:server` can't touch live data. You keep a separate way to reach
   production for `admin:create` and the 7b scripts (section 6).
8. **One comment in a frozen component changes.** `src/components/SiteStatus.tsx`
   line 6 says content "loads from Supabase". The comment is corrected; no
   markup, `className` or layout changes. That is the only `src/components/`
   change in this phase.

## 7a. Code and docs

### 1. README rewrite and leftover Supabase

**README.md**, rewritten as onboarding for a new teammate:

1. **Prerequisites:** Node 22, PostgreSQL 16 or later, and Chrome (for the
   browser tests).
2. **Clone and install:** `npm ci`.
3. **Environment:** `cp .env.example .env`, and what each variable is for.
   Only `DATABASE_URL` and `TEST_DATABASE_URL` are required locally.
4. **Local databases:** `createdb teyvat_dev` and `createdb teyvat_test`,
   with the explicit-port rule for `TEST_DATABASE_URL`.
5. **Migrate and seed:** `npm run migrate`.
6. **An admin login:** `npm run admin:create` (local).
7. **Test:** `npm test`.
8. **Run:** `npm run dev:server` and `npm run dev`.

Then the reference sections: the architecture (kept, minus Supabase); the
security model as it now is (sessions, the same-origin check, rate limits,
logs, CSP); the admin API; media; enquiries and privacy; deployment on Railway
(build, start, migrations, variables, Wait for CI); operations (restore guide,
scripts); and links to `docs/SCHEMA.md` and `docs/LAUNCH-CHECKLIST.md`.

Removed:

- every Supabase and RLS passage, and the Netlify/Vercel/Nginx deployment
  text;
- the "Out of date" sections;
- the old launch checklist, which moves to `docs/LAUNCH-CHECKLIST.md`.

**`docs/SCHEMA.md`**, rewritten from `db/migrations/0001`–`0006`:

- every table with its columns and rules: the nine content tables,
  `site_settings`, `users`, `sessions`, `login_attempts`, `media`,
  `inquiries`, `inquiry_attempts`;
- the conventions;
- where validation lives: Zod in `shared/`, with the CHECK constraints as a
  backstop.

Removed: the RLS, API-keys and Storage sections, and the stale
`supabase/migrations` and `src/lib/database.types.ts` paths.

**Leftovers:**

- `public/_redirects` (a Netlify file, dead since Express serves the SPA)
  is deleted.
- The three historical comments that mention Supabase (`shared/api.ts`,
  `shared/pg-types.ts`, `SiteStatus.tsx`) are reworded, the last as called
  out in decision 8.
- `.env.example`'s `DATABASE_URL` comment points at the local dev database
  (decision 7).
- A final `grep -ri supabase` over everything except `docs/plans/` (history)
  must come back empty.

### 2. GitHub Actions CI

`.github/workflows/ci.yml`, on every `push` and `pull_request`:

```yaml
jobs:
  checks:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:18          # match production's major version (7b: confirm)
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: teyvat_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 5s
          --health-timeout 5s --health-retries 10
    env:
      TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/teyvat_test
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/teyvat_test
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }    # the visual test reads faed6bc from history
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build          # before the tests: the visual test needs dist/ CSS
      - run: npm run verify:roundtrip
      - run: npm test
```

- **The `TEST_DATABASE_URL` guard is satisfied:** `localhost`, an explicit
  port, and a database ending in `_test`.
- **Chrome:** GitHub's Ubuntu runners have it at `/usr/bin/google-chrome`,
  which `findChrome()` already checks. The browser tests run rather than skip.
  If that ever changes, the test's skip message says so.
- **Secrets:** none. The repository is public, so CI must never need any.
- **Concurrency:** a newer push cancels a still-running CI on the same
  branch.

**GitHub settings for `main`** (Settings → Rules → Rulesets → New branch
ruleset, target `main`, enforcement *Active*):

| Rule | Setting | Why |
|---|---|---|
| Restrict deletions | on | `main` can't be deleted |
| Block force pushes | on | history (and Railway's deploy source) can't be rewritten |
| Require a pull request before merging | on, required approvals **0** | changes reach `main` through a PR, where CI runs first. 0 because you work alone; raise to 1 when a teammate joins |
| Require status checks to pass | on: add the check **`checks`**, and tick *Require branches to be up to date before merging* | a PR can't merge with red CI or against a stale `main` |
| Require linear history | optional | keeps `git log` readable |
| Bypass list | empty | the rules apply to everyone, including admins |

Then, in Railway: API service → Settings → *Wait for CI*, on. It appears
once this workflow (with its `push` trigger) is in the repo.

### 3. Security headers

A small Express middleware (`server/src/security-headers.ts`, no new
dependency) on every response:

| Header | Value |
|---|---|
| `Content-Security-Policy` | see below |
| `Strict-Transport-Security` | `max-age=86400` (decision 4); sent only on HTTPS requests |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` (for old browsers; `frame-ancestors` is the modern rule) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

**The CSP, and every host it allows:**

| Directive | Allows | Why |
|---|---|---|
| `default-src` | `'self'` | anything not listed below: our own origin only |
| `script-src` | `'self'` | only our own bundles. No inline scripts and no `eval`; the build emits neither |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com` | our CSS; Sonner's injected `<style>` (decision 2); the Google Fonts stylesheet; Leaflet's stylesheet (decision 3) |
| `font-src` | `'self' https://fonts.gstatic.com` | the font files Google Fonts' stylesheet points to |
| `img-src` | `'self' https://images.unsplash.com <R2 origin> https://*.basemaps.cartocdn.com` | Unsplash for the seeded content; R2 for uploads; CARTO for the map tiles (`a`–`d` subdomains) |
| `connect-src` | `'self'` | the browser only ever calls our own `/api` |
| `frame-ancestors` | `'none'` | no one can frame the site or the admin |
| `base-uri` | `'self'` | |
| `form-action` | `'self'` | |
| `object-src` | `'none'` | |

- **The R2 origin comes from `R2_PUBLIC_BASE_URL`** at boot, so moving to a
  custom domain in 7b updates the CSP with no code change. The same goes for
  the image allow-list (decision 1).
- **No `data:` or `blob:` in `img-src`:** nothing uses them. Upload previews
  show the uploaded URL, and the map uses `divIcon` (HTML), not images.
- **Development:** Vite serves the page in `npm run dev`, so the headers
  apply to the built server (`npm start`, and production) only.

**Checking nothing breaks** (`server/test/browser-csp.test.ts`): headless
Chrome against the built app, running on the test database with a memory
media store, collects every `securitypolicyviolation` event while it:

- loads `/` and scrolls through every section, including the map (tiles);
- opens the enquiry modal;
- loads `/admin/login` and signs in;
- opens the dashboard, a destination editor (Unsplash previews), the media
  library (an R2 image), enquiries and settings;
- triggers a toast.

There must be no violations. A control proves the listener works: an image
from a host that isn't allowed must be reported. The headers themselves are
checked on `/`, `/admin` and an `/api` response.

### 4. Error boundaries

- **Public** (`src/pages/PublicSite.tsx`, not `src/components/`): each
  section is wrapped in a `SectionBoundary`. If a section throws, it renders
  nothing and logs, and the rest of the page stays (decision 5).
  - Boundaries add no DOM, so the page's markup is unchanged.
  - `PublicSiteRoute` gets an outer boundary that shows the existing
    `SiteError`.
- **Admin:**
  - A boundary around `AdminLayout`'s `<Outlet />`, keyed by the route, so
    navigating away clears it. Its fallback is a card: "This page hit an
    error", with *Reload* and *Back to the dashboard*. The sidebar keeps
    working.
  - A second boundary around the whole admin app.
- **Tests,** in headless Chrome:
  - a section that throws leaves its neighbours rendered;
  - an admin page that throws shows the card, and navigating to another
    route recovers;
  - the public page's rendered HTML is identical with and without the
    boundaries.

### 5. Restore guide: `docs/RESTORE.md`

From Railway's documentation on point-in-time recovery (Postgres):

- **It must be switched on first, and it isn't retroactive:** the window
  starts at the first base backup after enabling. Until then there's nothing
  to restore from, which is why it's at the top of the 7b checklist.
- **Enable:** Postgres service → *Backups* → *Enable PITR*. Railway creates a
  storage bucket, sets the archive variables and redeploys Postgres once.
  - Keep the image on a major tag (not a pinned minor version), which PITR
    requires.
  - Cost: bucket storage and egress.
- **Window:** about 4 weeks (the last 4 weekly full backups, with daily
  differentials and continuous WAL).
- **Restore:**
  1. *Backups* → pick the time → *Restore to this moment*. Railway creates a
     new service, `<name>-restored-YYYYMMDD-HHMM`, and leaves the original
     untouched.
  2. Check the restored data in Railway's *Data* tab.
  3. Switch the app over by hand: API service → Variables → `DATABASE_URL`
     → change the reference to `${{<restored service>.DATABASE_URL}}` →
     redeploy. The start command's `npm run migrate` applies anything the
     restored copy lacks.
  4. Once it's verified, rename or remove the old service, and enable PITR on
     the new one: a restored fork doesn't archive.
- **Partial recovery** (one deleted row, not the whole database): restore to
  a fork, copy the rows across, and delete the fork.
- **Dashboard only:** no Railway CLI. The local CLI is linked to a different
  project.
- Linked from the README's operations section and from CLAUDE.md.

### 6. Scripts for 7b

- `npm run images:audit` (read-only): lists every image URL in the content
  tables that isn't on the allow-list (decision 1). You run it against
  production before the CSP deploys.
- `npm run media:rebase -- --from <old base> --to <new base> [--dry-run]`:
  for the move to an R2 custom domain. In one transaction it rewrites
  `media.url` and every image column (from the same `IMAGE_COLUMNS` list the
  usage query uses).
  - Runs against `DATABASE_URL`, printing the target first, like
    `create-admin`.
  - Both scripts get tests on the test database.

### 7. Checks and wrap-up

- `typecheck`, `build`, `verify:roundtrip` and `npm test`, locally and on
  the first CI run.
- `git diff 050e06a -- src/components/` shows only the comment from
  decision 8.
- The CSP violation test passes, and the public page renders unchanged.
- CLAUDE.md: the phase table, notes, the Railway variables, and links to
  `RESTORE.md` and `LAUNCH-CHECKLIST.md`.
- Commit locally, show the results, and ask before pushing. After it's
  merged: GitHub's ruleset and Railway's *Wait for CI* are yours to switch on.

## 7b. `docs/LAUNCH-CHECKLIST.md`

One file, written in 7a, replacing the README's checklist. Each item says
**what it blocks** and **who** does it:

- **Owner:** the business decision-maker.
- **Railway admin**, **Cloudflare admin**, **GitHub admin**, **DNS admin.**
- **Developer.**
- **Content editor:** an admin user.

Ordered so that nothing waits on something listed after it.

| # | Item | Blocks | Who |
|---|---|---|---|
| 1 | **Enable Railway point-in-time recovery now** (`docs/RESTORE.md`) | any recovery from data loss; there's no backup until this is on | Railway admin |
| 2 | **Rotate the Postgres password** (it was exposed during setup) | go-live | Railway admin |
| 3 | Check the API service's `DATABASE_URL` is the internal reference | go-live (keeps DB traffic private) | Railway admin |
| 4 | Remove the public TCP proxy, or accept it. Note: without it, local scripts (`admin:create`, `media:rebase`) can't reach production | reducing exposure | Railway admin + owner |
| 5 | Confirm Railway's Postgres major version and match it in CI's `postgres:` image | CI testing what production runs | Developer |
| 6 | GitHub ruleset on `main` and Railway *Wait for CI* (7a section 2) | safe deploys | GitHub admin + Railway admin |
| 7 | **Brand decision** | 8, 9, 10, 11, 17 | Owner |
| 8 | Buy the domain; add it to the Railway service; DNS records | 9, 10, 11, 17, real visitors | Owner + DNS admin |
| 9 | R2 custom domain: connect it in Cloudflare, set `R2_PUBLIC_BASE_URL`, run `npm run media:rebase` (7a section 6) | go-live (`r2.dev` is rate-limited and meant for development) | Cloudflare admin + developer |
| 10 | Resend sending domain: verify it, then set `NOTIFY_EMAIL_FROM`, and add other recipients if wanted | new-enquiry emails to anyone but the Resend account owner | DNS admin + owner |
| 11 | Raise HSTS to one year; decide on `includeSubDomains` and preload | long-term HTTPS-only | Developer, after 8 |
| 12 | **Privacy policy page** with the retention periods (README: enquiries and privacy), plus terms and sustainability pages; set all three URLs in *Admin → Settings* | go-live: the site collects personal data | Owner (writing; legal review advised) + content editor |
| 13 | **Real contact details** in *Admin → Settings*: address, phone, email. The current ones are the demo's | go-live | Owner + content editor |
| 14 | Replace the Unsplash photos with owned or licensed ones (upload through the media library) | a brand that owns its look; not legally blocking | Owner + content editor |
| 15 | **Map tiles: a CARTO licence or API key.** CARTO's free basemaps are for non-commercial use. A keyed tile URL changes `InteractiveMapSection.tsx`, a frozen component (called out when it's done), and the CSP host | commercial go-live | Owner (account) + developer |
| 16 | Run `npm run images:audit` against production before the CSP deploy; re-upload anything it lists | the CSP deploy | Developer |
| 17 | Rename "Travel Eye" in the code, emails and titles to the chosen brand | go-live under the real brand | Developer, after 7 |
| 18 | Review `users`: real staff accounts only; reset any shared password | go-live | Owner + developer |
| 19 | Check the old Supabase project for real enquiries, then delete it | closing an unused service holding personal data | Owner |
| 20 | Standing rules: never run `0002_seed.sql` by hand, and confirm `.env` is not committed | always | Everyone |
