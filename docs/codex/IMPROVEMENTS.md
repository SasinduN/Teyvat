# Improvements


# 2026-10-06 — Re-audit recommendations

Prior entries remain historical. These are recommendations, not completed changes. Behavior defects are tracked separately in BUGS.md; optional design preferences are not blockers.

## IMP-006 — Accessibility / UI

**Priority:** High  
**Affected area:** Accessibility / UI  
**Current problem:** Public dialogs and forms lack the expected keyboard lifecycle and accessible names.  
**Recommended improvement:** Address BUG-007/008, then verify keyboard and screen-reader behavior at phone/tablet/desktop sizes.  
**Expected benefit:** Makes core enquiry/search actions usable without a mouse.

## IMP-007 — Data integrity / maintainability

**Priority:** High  
**Affected area:** Data integrity / maintainability  
**Current problem:** Editor record-cache invalidation and timestamp revision comparisons are fragile.  
**Recommended improvement:** Address BUG-009/010 using returned-row cache updates and exact revision tokens, with meaningful concurrency tests.  
**Expected benefit:** Prevents stale reopening and accidental overwrites.

## IMP-008 — Testing / developer experience

**Priority:** Medium  
**Affected area:** Testing / developer experience  
**Current problem:** Build/browser checks are blocked by execution restrictions and missing local infrastructure.  
**Recommended improvement:** Provide a repeatable local PostgreSQL setup and documented Windows npm.cmd workflow; retain destructive-test guards and baseline history or versioned fixtures.  
**Expected benefit:** Separates environment failures from regressions.

## IMP-009 — Performance / architecture

**Priority:** Medium  
**Affected area:** Performance / architecture  
**Current problem:** Public content and admin inbox/export queries load whole result sets.  
**Recommended improvement:** Measure realistic dataset sizes; add bounded inbox pagination and streaming/limited exports if warranted.  
**Expected benefit:** Controls memory, response sizes and editor wait time as data grows.

## IMP-010 — Observability / UX

**Priority:** Medium  
**Affected area:** Observability / UX  
**Current problem:** Section error boundaries intentionally remove failed content, navigation or dialog UI.  
**Recommended improvement:** Design a small accessible recovery state for essential actions and add privacy-safe error monitoring.  
**Expected benefit:** Users can recover instead of losing actions silently.

## IMP-011 — Security hardening / deployment

**Priority:** High  
**Affected area:** Security hardening / deployment  
**Current problem:** Proxy trust assumes one trusted edge hop; rate-limit check and insert are separate operations.  
**Recommended improvement:** Verify proxy topology and prevent direct backend access; consider atomic throttling or a bounded global queue for expensive password checks.  
**Expected benefit:** Improves resistance to spoofed IPs and concurrent bursts without inventing an exploit claim.

## IMP-012 — Documentation / operations

**Priority:** Medium  
**Affected area:** Documentation / operations  
**Current problem:** README model-roundtrip claim overstates its evidence; launch checklist and phase docs include unconfirmed external state.  
**Recommended improvement:** Clarify pure conversion versus DB/browser verification, document public routes and incomplete planner/newsletter, and confirm launch controls with the owner.  
**Expected benefit:** Creates accurate expectations and reviewable deployment readiness.

## IMP-001 — Improve environment bootstrap guidance
**Priority:** High
**Affected area:** Developer experience / setup
**Current problem:** The repo expects a local `.env` and PostgreSQL instance, but the current working copy does not yet include those values. The README describes them, but the dependency is easy to miss in a fresh environment.
**Recommended improvement:** Add a short local setup checklist and maybe a bootstrap script or validation step that clearly identifies missing DB variables before runtime commands continue.
**Expected benefit:** Lower onboarding friction and fewer failed first runs.

## IMP-002 — Make browser baseline tests reproducible outside git-only workflows
**Priority:** Medium
**Affected area:** Testing / CI
**Current problem:** Some tests rely on git history to compare baseline renders, which breaks when the project is not in a valid git checkout.
**Recommended improvement:** Store required baseline snapshots in the repo or provide an explicit CI-only path that ensures the repository is checked out before the tests run.
**Expected benefit:** More reliable cross-machine test execution and clearer failure modes.

## IMP-003 — Keep runtime config checks explicit during startup
**Priority:** High
**Affected area:** Security / operations
**Current problem:** The app fails fast on missing `DATABASE_URL`, but a developer may not notice the exact root cause when the environment is incomplete.
**Recommended improvement:** Add a startup health check that prints concrete follow-up guidance for missing local env values and database configuration.
**Expected benefit:** Faster diagnosis and safer local setup.

## IMP-004 — Document local Postgres names and test DB constraints in a single bootstrap section
**Priority:** Medium
**Affected area:** Documentation
**Current problem:** The test database must be named with a `_test` suffix and include a port; this is critical but easy to fail in a fresh setup.
**Recommended improvement:** Consolidate the exact Postgres requirements into one quick-start section and reinforce them in versioned docs.
**Expected benefit:** Fewer misconfigured local runs and less time spent debugging `TEST_DATABASE_URL` issues.

## IMP-005 — Keep the changelog and bug tracker in sync with major work
**Priority:** Low
**Affected area:** Project maintenance
**Current problem:** A fast-moving project can drift if bug status and changelog updates are not maintained.
**Recommended improvement:** Make documentation updates part of the standard PR checklist and keep issue status current when fixes land.
**Expected benefit:** Better project continuity and easier handoff between contributors.
