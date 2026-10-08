# Repository Instructions

This repository is Teyvat: a Vite + React + Express + PostgreSQL travel marketing site with an admin panel.

Before making changes:

1. Read `README.md`.
2. Read `docs/codex/PROJECT_STATUS.md`.
3. Read `docs/codex/BUGS.md`.
4. Read `docs/codex/CHANGELOG.md`.
5. Read `docs/codex/IMPROVEMENTS.md`.
6. Understand the existing architecture before editing code.
7. Do not make unrelated changes.
8. Preserve existing conventions unless there is a clear reason to change them.
9. Update `CHANGELOG.md` whenever application code changes.
10. Update the relevant bug status when fixing a tracked bug.
11. Add newly discovered bugs to `BUGS.md`.
12. Update `PROJECT_STATUS.md` after significant work.
13. Run the relevant available tests/build/lint checks after modifications.
14. Never claim something was tested if it was not actually tested.
15. Never hide, fabricate, or silently ignore errors.
16. Never expose secrets in documentation.
17. Do not delete historical changelog entries.

The repo has phases and a frozen public design. Any change to approved public UI markup or structure should be reviewed and explicitly called out before editing it.

## Audit continuity

- The application root is this directory; the parent downloaded workspace may not be a Git checkout.
- Read the current review at the top of AUDIT_REPORT.md; historical health claims are explicitly superseded.
- Keep VERIFIED, FOUND BY STATIC ANALYSIS, NOT TESTED and BLOCKED evidence distinct. A fixture mapper round-trip does not verify a live database or rendered UI.
- Preserve existing bug IDs and resolutions, and all historical changelog entries.
- The initial audit authorizes documentation only. Wait for the user's approval before starting application fixes.
- On Windows, use npm.cmd if PowerShell refuses npm.ps1; do not change execution policy merely to run npm.
- Never bypass the local test database guards or substitute a production database to make checks pass.
