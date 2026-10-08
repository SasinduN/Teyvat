# PR #11 CI repair — 2026-10-08

## Failure evidence

Workflow `.github/workflows/ci.yml`: one job, `checks`, on Ubuntu with PostgreSQL 18 and Node 22. It installs dependencies, typechecks, builds, verifies the synthetic content round-trip, and runs every test. No workflow changes were made.

Run 37788362535 failed only at `npm test`: 18/21 files passed. Exact failures:

- `server/test/browser-home-baseline.test.ts`: `Navbar at 1280px: no pixel differs by more than 2 levels` (3757 pixels differed; the other 13 visual comparisons passed).
- `server/test/browser-pages.test.ts`: `"Explore" lands on the home map, "Contact" on the About form, focused` (timed out waiting for `/#explore-map`).
- `server/test/pages.test.ts`: `pages are 200; unknown paths, bad, unknown and unpublished slugs are 404` (`/journal/` returned 200 instead of 404).
- `server/test/pages.test.ts`: `SITE_INDEXABLE on: the normal robots.txt, and a sitemap of every published page` (42 entries instead of 41).

Map, CSP/header, API and database checks passed in this run. Their failures in the combined frontend upload are not evidence of failures in PR #11.

## Root cause and repair

The two-step upload incorrectly included the new frontend route definitions/navigation links and Express index-page routes in the backend-only first step. PR #11 still has the original frontend: its map and Journal live on Home, and no Explore/Plan/Journal index or photography credits pages exist. This made navigation render differently, sent visitors to missing React pages, and advertised nonexistent pages as HTTP 200 in the sitemap. The sitemap assertion was also partially updated to eight fixed pages while the new server advertised nine.

Keep the original route/navigation and page metadata contracts in step 1. Defer the four new Express index routes and mapTour redirect with their frontend pages to step 2. Keep the existing photo compatibility/head/preload and backend improvements. Restore five-page sitemap expectations and add explicit 404 coverage for frontend pages not yet included. Existing visual baseline, all browser tests and CI settings remain intact. No public component markup or frozen UI design was edited.

## Validation

VERIFIED locally: production build/typecheck and synthetic non-photo content round-trip pass. Initial worktree test attempt failed because tests require a worktree-local node_modules path; a local ignored junction to existing dependencies corrected that setup. The subsequent relevant tests are BLOCKED by the configured local test database rejecting the postgres password. No test guard or database credential was changed, and no production database was substituted.

GitHub Actions for the fix is the required acceptance gate. Do not mark merge-ready or merge until all checks on the current head pass. Prior evidence and changelog entries are preserved.
