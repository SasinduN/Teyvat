# Current evidence - 2026-10-06 quality pass

The authoritative current ledger is [BUG_REPORT](../BUG_REPORT.md); final evidence is [FINAL_QA](../FINAL_QA.md). Build passes; local database is available; photo migration applied. Browser checks remain blocked and Belilena unresolved. Earlier entries below are preserved as dated history and are superseded where the current ledger records newer evidence.

# Audit Report

# Current Audit — 2026-10-06

This re-audit supersedes the health claims in the historical report below. Application source, configuration and database files were not changed. Existing bug IDs and changelog history are preserved.

## Scope and evidence

Project root: the nested `Teyvat-main/` directory, not its parent workspace. Reviewed README, AGENTS, CLAUDE, package/lock files, environment example, Vite/TypeScript/CI configuration, schema and migrations, public routing/content/forms/maps, admin editor/settings/inbox patterns, API routes, auth middleware/passwords/sessions/throttles, shared validation/mappers/utilities, storage, error handling, tests and operational/phase documentation. This is a source review with execution checks, not a claim that every feature or browser layout was exercised.

Evidence labels: **VERIFIED** = executed observation; **FOUND BY STATIC ANALYSIS** = code/document evidence; **NOT TESTED** = no execution evidence; **BLOCKED** = a prerequisite or execution restriction prevented validation.

## Project and architecture

Teyvat / Travel Eye Sri Lanka is a tourism marketing site and administrator CMS, not a booking/payment system. Public visitors browse destinations, experiences, tours and journal articles, explore a Leaflet map, and send enquiries or follow WhatsApp links. All provisioned users are administrators; there is no public registration, customer account or granular role system.

Detected stack: Node 22 (installed v22.23.2), React 19.2.6, Vite 7.3.2, TypeScript 5.9.3 strict mode, Tailwind 4.1.17, Framer Motion, React Router 7, TanStack Query, React Hook Form/Zod, Express 5, pg/PostgreSQL, Argon2id, optional R2 via aws4fetch and Resend via HTTP. Installed dependency inventory passed; package.json ranges and lockfile resolve exact versions. No lint script/configuration was identified.

Frontend: BrowserRouter with lazy public/admin pages; a shared QueryClient caches GET /api/content. Shared mappers translate published database rows into component models. PublicLayout gates initial loading/errors, hosts navigation/footer/dialogs, and revalidates on route changes. Home includes content sections, map filters and a sample planner. AdminApp supplies AuthProvider and RequireAdmin, with collection descriptors generating CRUD forms. Styles retain the approved green/gold travel design; no redesign is proposed.

Backend: Express mounts same-origin mutation protection before API routers. Public endpoints are health, published content and enquiry submission; auth provides login/me/logout/logout-all; protected admin endpoints cover nine collections, settings, media and enquiry counts/list/detail/update/delete/CSV. JSON is limited to 100 KB; media raw requests to 10 MB. Values use SQL parameters and dynamic identifiers come from allow-listed table/field descriptors. Unexpected errors return generic JSON while database errors are sanitized by the central handler.

Communication: development uses Vite on 5173 and an API process on 8081 with /api proxy and preserved Host; production uses one Express origin serving dist assets and page shells. Credentials are same-origin cookies; no separate CORS service is required. Shared schemas/types link frontend and backend. The server injects escaped per-page head metadata and statuses; page bodies are client rendered, not server rendered React.

Database: PostgreSQL migrations 0001–0008 cover nine published/sorted content collections, singleton site_settings, users/sessions/login_attempts, media, inquiries/inquiry_attempts and normalized tour_stops. Constraints, foreign keys, indexes and updated_at triggers enforce model rules. Migration runner uses an advisory lock and migration bookkeeping. Seed upserts overwrite content if manually rerun; follow the existing runner. Test setup only accepts explicitly ported local databases ending _test and clears data. No migrations or destructive database operations were attempted.

Authentication: CLI provisions admins; Argon2id password hashing; 32-byte random session tokens with SHA-256 hashes stored server-side; seven-day fixed expiry; HttpOnly/Secure/SameSite=Strict __Host cookie; server-side requireAdmin is requireSession because every user is an admin. Sign-in throttle counts failures in PostgreSQL, uses dummy-hash verification for unknown emails, and same-origin guards cover login/mutations. Password reset revokes user sessions. These protections were inspected statically; live login/logout/permission behavior is BLOCKED.

## Execution results

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Node version | VERIFIED | v22.23.2 matches required 22.x |
| Installed dependencies | VERIFIED PASS | npm.cmd ls --depth=0, no reported missing dependencies |
| Installation planning | VERIFIED PASS | npm.cmd ci --dry-run --ignore-scripts --offline; actual clean installation NOT TESTED |
| Typecheck | VERIFIED PASS | npm.cmd run typecheck completed; build also passed tsc before Vite |
| Standard build | VERIFIED FAIL / BLOCKED | npm.cmd run build: Vite/esbuild cannot read ../../.. and cannot resolve config under filesystem restrictions |
| Standard dev frontend | VERIFIED FAIL / BLOCKED | npm.cmd run dev -- --host 127.0.0.1 fails on same config bundling restriction |
| Built backend startup | VERIFIED FAIL / BLOCKED | node server/dist/index.js exits: DATABASE_URL missing; existing bundle used, not a newly successful build |
| Full tests | VERIFIED FAIL | 2/19 files pass: map-markers and whatsapp-link; 17 fail or cancel |
| Database/API tests | BLOCKED | TEST_DATABASE_URL absent; guard refuses destructive tests |
| Browser tests | BLOCKED | Missing DB, esbuild access restrictions, baseline Git prerequisites and hook cancellations |
| Fixture round-trip | VERIFIED PASS | Nine collection checks pass; synthetic fixture-to-row-to-mapper conversion, NOT a live database round trip or visual proof |
| Git state | VERIFIED | git status --short says not a Git repository; baseline history unavailable |
| Database tooling | NOT AVAILABLE ON PATH | psql/createdb command discovery returned no commands; this does not prove no server is installed |
| Lint | NOT AVAILABLE | No configured script identified |
| Live pages/API/CRUD/auth/database | NOT TESTED / BLOCKED | No functioning app/database session |
| R2/Resend/production deployment | NOT TESTED | No external operations attempted |
| Mobile/tablet/desktop visual review | NOT TESTED | Existing screenshots are historical artifacts, not current verification |

PowerShell refuses npm.ps1 due to execution policy; npm.cmd runs without changing policy. No environment secrets were created, no production URL was substituted, and no system permissions were changed. The access-denied build failure is an execution-environment limitation, not established evidence of broken source imports. Existing dist files cannot justify declaring the current build healthy.

## Issue register

Open findings: **CRITICAL 0; HIGH 3; MEDIUM 8; LOW 4** (15 tracked records). Includes environment/documentation blockers inherited as BUG-001–003. BUG-013 is a documented security follow-up with current credential state unconfirmed, not a newly verified leak.

Every issue's affected files, expected/actual behavior, reproduction/evidence, proposed fix and resolution history are in [BUGS.md](BUGS.md). New findings are static unless explicitly marked otherwise.

| ID | Severity | Category | Finding |
| --- | --- | --- | --- |
| BUG-001 | HIGH | Environment blocker | Missing local DB variables prevent app/API verification |
| BUG-002 | MEDIUM | Test portability | Visual baselines require unavailable Git history |
| BUG-003 | LOW | Documentation | Historical onboarding follow-up; missing local setup alone is not a software bug |
| BUG-004 | HIGH | Security | Database TLS connections do not authenticate the server |
| BUG-005 | MEDIUM | Functional / UX | Newsletter reports success without subscribing |
| BUG-006 | MEDIUM | Functional / UX | Planner ignores preferences and misrepresents saving |
| BUG-007 | MEDIUM | Accessibility / UX | Public modals lack keyboard and dialog accessibility |
| BUG-008 | MEDIUM | Accessibility | Public form controls lack associated labels |
| BUG-009 | MEDIUM | State / CRUD | Record editor can reopen a stale saved record |
| BUG-010 | MEDIUM | Concurrency / Data integrity | Timestamp tolerance can accept an obsolete version |
| BUG-011 | LOW | Functional / UX | Destination search hides matches and fails to trim terms |
| BUG-012 | LOW | UI | Planner formats day ten as Day 010 |
| BUG-013 | HIGH | Security / Operations | Previously exposed database credential has unconfirmed rotation |
| BUG-014 | LOW | UX / Incomplete content | Unset footer URLs retain link-like presentation |
| BUG-015 | MEDIUM | Functional / UX | Quick search silently ignores travel timing |

Most serious demonstrated functional implementation gap: newsletter success without persistence (BUG-005). Most serious potential data-integrity defect: stale editor record cache (BUG-009); version-tolerance failure window is narrower (BUG-010). Most urgent runtime blocker: BUG-001. Most serious security follow-ups: confirm documented credential rotation (BUG-013), and correct TLS server verification (BUG-004).

UI/UX defects: fake newsletter/planner success, inactive timing filter, modal keyboard lifecycle, inaccessible form labels, truncated search results, day-number formatting and inert footer links. These are actionable behavior/accessibility problems, not optional taste changes. Current responsive overflow, spacing, contrast and rendered alignment remain unverified; inspect at phone/tablet/desktop widths after runtime setup.

Code quality/data integrity: editor cache invalidation misses record queries; timestamp tolerance weakens exact revisions; planner copy duplicates hardcoded itineraries while claiming dynamic generation. Queries/CSV exports load whole collections/inbox without pagination, a scalability improvement rather than a proven current outage. Section fallback=null deliberately hides failing sections, including navigation/dialog/footer boundaries, so failures can silently remove actions; recommend visible recovery and operational monitoring after design approval.

Security review: no real credential values were found in reviewed text or printed. Git history cannot be scanned in this archive. SQL allow-lists, password/session handling, escaped head tags, inquiry field allow-list, restricted image types/hosts, admin route guards and CSV formula defenses are present statically; no claim of exploitation resistance from blocked tests. trust proxy=1 relies on the real edge topology; direct public access would allow forwarded-address spoofing and weaken per-IP limits. Concurrent login/enquiry count-then-insert checks can overshoot limits; login comments explicitly accept this. Treat both as hardening recommendations, with production edge behavior untested.

## README versus implementation

| Claim / feature | Assessment | Source evidence |
| --- | --- | --- |
| Stack and single Express/Postgres origin | Statically accurate | package.json, vite.config.ts, server/src/app.ts |
| Nine collection CMS and settings | Implemented statically; runtime BLOCKED | shared/content-schema.ts, admin routes/forms |
| Published ordered content | Implemented statically; runtime BLOCKED | server/src/routes/content.ts, content hooks |
| Auth/session/logout/throttling | Implemented statically; runtime BLOCKED | server/src/auth/*, routes/auth.ts |
| Media library/upload restrictions | Implemented statically; real R2 NOT TESTED | routes/media.ts, media/store.ts, shared/image-sniff.ts |
| Enquiry/inbox/CSV/retention/notification | Implemented statically; delivery/DB NOT TESTED | routes/inquiries.ts, inquiries/*, auth/sweep.ts |
| Round-trip reproduces rendered site | Overstated | verify-roundtrip constructs synthetic rows and compares models; it does not query Postgres or render pixels |
| Concurrent edits always return 409 | Partial | timestamp tolerance admits a small stale revision window (BUG-010) |
| No R2/Resend required locally | Accurate architecture; not runtime verified | optional config defaults |
| Two local DB values suffice | Additional intentional limitation | Without CARTO key map uses API-key-required placeholder tiles |
| Setup commands | Generally match scripts/config | PowerShell requires npm.cmd in this environment; archive lacks baseline Git history |
| Node .env examples | Both supported | README uses .env; example suggests .env.local; load-env reads both, .env.local wins |
| API route table | Matches inspected routes | admin content/order/count/settings; auth/inquiries/media routes |
| CI checks | Workflow present, actual execution NOT TESTED | .github/workflows/ci.yml includes full Git history and postgres:18 |
| PR protections / Railway auto-deploy / Wait for CI | Cannot verify from source | External dashboard configuration; unchecked launch tasks remain |
| Real public pages/SEO/WhatsApp | Implemented but incompletely covered by README overview | App.tsx, server/src/pages/*, shared/whatsapp.ts |
| Newsletter/custom planner/save | Undocumented incomplete UI | Footer.tsx, TravelPlanner.tsx |
| Privacy/terms/sustainability | Configurable external links; internal pages missing by design | App routes, footer/settings; launch checklist item 12 |

No README feature can be declared working end-to-end from this run. Verified supporting checks are typecheck, two pure test files and fixture model conversion. Missing customer signup/payment/booking checkout is outside the advertised architecture and is not counted as a bug.

## Recommended order

1. Confirm/revoke the previously exposed DB credential and settle verified TLS configuration before connecting to remote production resources.
2. Configure safe local dev/test Postgres, recover a proper Git clone with baseline commits, and rerun build/tests in an environment where esbuild can resolve paths. Do not relax destructive test guards.
3. Fix false newsletter/planner claims, ignored season selection, record-cache invalidation and exact revision checks with targeted behavior tests.
4. Add accessible dialog lifecycle and associated labels; fix search result access and small formatting/inert-action defects.
5. Validate responsive layouts and real optional integrations, then close operational launch checklist tasks and update README/status.
6. Pursue pagination, observability, test portability and maintenance improvements after critical behavior is validated.

The initial audit is complete within these stated limitations. No application fixes were made. Await the user's approval before implementation.

---

# Historical initial report (retained; superseded above)



## Project overview

Teyvat is a travel-marketing and content-management application for Sri Lanka tourism. The codebase supports a public site that presents approved content from a database and an admin panel for editing that content, managing site settings, uploading images, and processing enquiries.

The repository is structured around a single Express server that serves both the public site and the admin API, with the React frontend delivered by Vite. Content is stored in PostgreSQL, media is optionally stored in Cloudflare R2, and enquiry emails can be sent through Resend.

## Detected technology stack

- Frontend: Vite 7, React 19, TypeScript 5.9, Tailwind CSS 4, Framer Motion, React Router 7, TanStack Query, React Hook Form, Zod
- Backend: Express 5, Node 22, Postgres client (`pg`), Argon2 password hashing
- Database: PostgreSQL, migrations under `db/migrations/`, schema mirrors in `shared/database.types.ts`
- Storage: Cloudflare R2 for image uploads, optional
- Email: Resend for new-enquiry notifications, optional
- Security: same-origin checks, same-site session cookies, request validation, CSP headers

## Architecture summary

- `src/` holds the public frontend and admin interface.
- `server/src/` holds the API and server-side app boot logic.
- `shared/` holds the common API contract, schemas, content models, and shared validation logic.
- `db/migrations/` is the source of truth for the database schema.
- `scripts/` contains maintenance and verification tasks.

The public site reads from `GET /api/content`, while the admin CRUD flows use protected routes under `/api/admin/*`. Frontend and backend share API contracts in `shared/api.ts` to reduce drift.

## Frontend summary

The public site is built as a routed marketing app with lazy-loaded pages. It uses a `QueryClientProvider` and content hooks to fetch content from the API. The public design is intended to be a frozen, approved design, with the app using mapped database rows to reproduce the expected UI shapes.

The admin panel lives under `/admin` and is gated by a React auth guard and a server-side `requireAdmin` middleware. The interface is driven by schema definitions and a set of admin collection descriptors.

## Backend summary

The backend is an Express app configured with a single-origin policy and security headers. It serves `/api/*` endpoints and, in production, the built frontend from the same origin. All state-changing requests are checked for same-origin requests, and authenticated/admin routes rely on cookie-based sessions.

Critical server pieces include:

- `server/src/app.ts` for app creation and static serving
- `server/src/auth/middleware.ts` for session/admin enforcement and CSRF-like origin checks
- `server/src/routes/*` for content, auth, inquiry and media APIs
- `server/src/db.ts` for the shared Postgres pool
- `server/src/env.ts` for environment validation

## Database summary

The database is PostgreSQL with a migration-first design. The schema includes content tables, admin users, sessions, login attempts, media metadata, enquiries, and route stops. Database rules are enforced both in SQL constraints and in the API layer. The codebase explicitly treats the migration folder as the source of truth and documents a strict test DB requirement.

## Authentication and authorization summary

Authentication is cookie-based and implemented with a custom `users` and `sessions` model. Password verification uses Argon2. Admin access is equivalent to being signed in, as there is no multi-role permission system in the code.

Server-side security checks are the real enforcement point; the admin UI guard is not sufficient by itself.

## Major features

- Public marketing site generated from database content
- Admin CRUD for content collections and site settings
- Media upload and library features with Cloudflare R2
- Enquiry submission and inbox features
- Session management and login throttling
- Browser and API tests for content, auth, map rendering, pages, and CSP
- Image preparation and validation utilities
- Server-side page metadata and sitemap/robots logic

## Bugs and issues

### AUD-001 — Environment validation blocks runtime verification
- Severity: HIGH
- Category: Environment / Build health
- Affected files: `README.md`, `.env.example`, `server/src/env.ts`, `server/test/test-db.ts`
- Description: The app requires `DATABASE_URL` and `TEST_DATABASE_URL` to be set in a local `.env`; without them, the server exits and the tests refuse to run.
- Expected behavior: Local development should be able to start after copying `.env.example` and setting valid local Postgres values.
- Actual behavior: `npm run dev:server` exits with `DATABASE_URL: Invalid input: expected string, received undefined`, and `npm test` rejects the run because `TEST_DATABASE_URL` is not set.
- Evidence: Verified by running `npm run dev:server` and `npm test` in this workspace.
- Recommended fix: Provide a valid local `.env`, ensure the developer instructions are followed, and keep any required database setup explicit in the onboarding documentation.

### AUD-002 — Browser baseline tests require a git checkout
- Severity: MEDIUM
- Category: Test infrastructure
- Affected files: `server/test/browser-inquiry.test.ts`, `scripts/run-tests.mjs`, repo checkout state
- Description: Some browser tests compare against a commit hash using `git show faed6bc:...`, which fails when the project is not a valid Git repository.
- Expected behavior: Tests should run in a normal repository checkout with git metadata available.
- Actual behavior: `fatal: not a git repository (or any of the parent directories): .git` appears during the browser-inquiry test.
- Evidence: Verified by running the full suite in the current workspace.
- Recommended fix: Ensure the project is cloned as a git repository before running baseline comparisons, or replace the git-based comparison with a vendored fixture path in CI.

### AUD-003 — README is broadly accurate but setup depends on local database and environment readiness
- Severity: LOW
- Category: Documentation
- Affected files: `README.md`, `.env.example`
- Description: The README describes the setup and commands correctly, but the repository currently lacks a checked-in `.env` and the local database setup is required before validation can proceed.
- Expected behavior: A fresh checkout should clearly tell the developer exactly which local credentials and DB names are required.
- Actual behavior: The project boots only after `.env` is created and a matching Postgres instance is running.
- Evidence: Verified by comparing the README instructions with the actual `npm run dev:server` and `npm test` failures.
- Recommended fix: Keep the README and `.env.example` aligned, and document required local database expectations more explicitly.

## UI/UX problems

No obvious UI/UX regression was identified during this initial audit. The codebase appears to include a deliberate public design and an admin workflow. The most visible issue in this environment is that the app cannot be runtime-verified without the required database configuration.

## Security concerns

No direct secret exposure was found in the checked-in repository files reviewed during this audit. The code intentionally avoids Vite `VITE_` exposure for server secrets, keeps the R2/Resend configuration server-side, and uses same-origin enforcement for state-changing API requests.

The main security-related risk is operational: the environment is not yet configured in this workspace, so there is not enough evidence to establish whether the production-like runtime setup is complete.

## Code-quality issues

- The project structure is strong and well-documented.
- The code is explicit about environment and security requirements.
- The build currently succeeds, which suggests the TypeScript and bundling health are generally good.
- The main code-quality issue at this stage is not a source bug but incomplete local environment readiness, which prevents the runtime and integration checks from completing.

## README mismatches

The README is largely aligned with the architecture, scripts, and database-driven design implemented in code. The only meaningful mismatch is operational: the repo expects a local `.env` and a running PostgreSQL test database, and the authoring environment here does not yet meet that requirement.

## Missing or incomplete functionality

- None identified from a static reading of the implementation and documentation, beyond the obvious requirement for a valid local runtime environment and complete Git metadata for the baseline browser tests.
- The project is clearly planned as a complete working site and admin platform rather than a partial scaffold.

## Recommended improvements

1. Create a local `.env` from `.env.example` and verify the Postgres setup before treating the repo as runnable.
2. Run the test suite in a valid Git checkout so the baseline browser tests can execute correctly.
3. Keep the README and environment setup instructions explicit about required local database naming and ports.
4. Add a minimal CI smoke check for startup and required env validation to catch startup blockers earlier.
5. Keep the audit and changelog files updated as the app evolves.
