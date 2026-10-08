# Current comprehensive debugging pass — 2026-10-08

User-authorized implementation, preserving the existing React/Vite/Express/PostgreSQL architecture and published content. Read README/current Codex audit/status/bugs/changelog/improvements; inspected public routing/layout, shared heroes/navbar, slideshow/image renderer, CSS/themes, dialogs/forms/planner/map, admin editor/revision handling, API/auth/content/media/security and build/test configuration. No database writes, migrations, credentials or test guards changed.

| Area | Finding and action | Evidence |
|---|---|---|
| Hero surfaces | Large panels were already absent, but metadata/actions retained diffusion/reflections and overlays stacked heavily. Plain metadata, clean hero controls and lighter gradients now used; inner heights reduced | Source/markup/build PASS; photo contrast and crop unverified |
| Cursor | Custom follower mounted in every public layout, with pointer/scroll listeners and RAF work | Component/import/mount/CSS deleted; source search clean; native cursors retained |
| Navigation | Explore shared /destinations via hash, conflicting with page identity | Dedicated /explore for existing map/hidden gems; catalogue separate; explicit active/current target; compatibility redirects |
| Slideshow | Manual change could expose an unloaded slide; cached readiness survived same-count image changes | Pending selection keeps current photo until load; resets on source changes |
| Filters | Flex items could shrink despite nowrap; selected scaling could clip scroll edges | shrink-0, visible scrollbar and color-only selected transition |
| Forms/dialogs | Named controls, keyboard card activation, focus trap/inert background, same-origin validation present | Markup/source reviewed; actual submission/focus/touch NOT VERIFIED |
| Admin/API | Saved row updates cache; exact microsecond revision compares; validation/auth/same-origin protections present | Source reviewed; authenticated CRUD/concurrency BLOCKED by test DB authentication |
| Themes | Semantic palette and stored/system preference handling retained; photographic accent now Champagne Gold | 22 declared color pairs PASS; actual photograph/theme interaction unverified |
| Images | 62 mapped live references, 61 with credit metadata; Belilena remains unverified | Read-only inventory; no full pixel/decode/crop validation |
| Delivery | 43 public routes, 47 built assets, protected read endpoints and redirect/status checks | Production HTTP PASS; does not prove rendered interactions |

Final production build/typecheck PASS; 28 focused tests PASS; synthetic non-photo mapper round-trip PASS. Full suite executed: 8/27 files PASS, 19 failed/blocked by local test-DB password authentication, browser bundler/transport restrictions or missing historical Git baseline. Errors retained in qa-results/web-debug/tests-full.txt; no blanket test success claim. No lint script exists.

Chrome before/after and Edge after disconnected before any viewport. Lighthouse unavailable: offline retry ENOTCACHED; previous online registry attempt EACCES. Screenshot scores remain supplied history. Responsive layout at 320/375/430/768/1024/1440/1920, both themes, short landscape, console errors, keyboard/touch/buttons/forms/theme/slideshow, image pixels/decode/crop and SEO/accessibility audits NEEDS MANUAL VERIFICATION.

Reports: HERO_AUDIT.md, NAVIGATION_AUDIT.md, IMAGE_AUDIT.md, BUTTON_AUDIT.md, PERFORMANCE_AUDIT.md, BUG_REPORT.md and FINAL_QA.md. Latest artifacts under qa-results/web-debug; older report below remains historical.

# Travel Eye web audit

2026-10-06. Baseline and changes are tracked in CHANGELOG.md and BUG_REPORT.md. No category is signed off solely from source inspection.

## FUNCTIONAL / AUDIT-001

ID: AUDIT-001
Page: Newsletter, planner, revision checks
Component: Newsletter, planner, revision checks
Problem: False newsletter success, ignored planner preferences, precision loss and stale save cache
Impact: Reliability, discovery, trust or usability is reduced.
Recommendation: Persisted newsletter endpoint, preference-based planner and lossless revision tokens
Status: Backend/logic tests PASS; browser flows NEEDS MANUAL VERIFICATION

## FUNCTIONAL / AUDIT-002

ID: AUDIT-002
Page: Keyless map
Component: Keyless map
Problem: Missing CARTO key left a nonfunctional basemap
Impact: Reliability, discovery, trust or usability is reduced.
Recommendation: Use attributed OSM tiles only for normal interactive viewing
Status: Policy tests PASS; tile rendering NEEDS MANUAL VERIFICATION

## VISUAL / AUDIT-003

ID: AUDIT-003
Page: Named photographs
Component: Named photographs
Problem: Repeated unrelated stock images represented different named locations
Impact: Reliability, discovery, trust or usability is reduced.
Recommendation: Exact reviewed source corrections and photo credits
Status: IN PROGRESS: Belilena OPEN; rendered photo review pending

## RESPONSIVE / AUDIT-004

ID: AUDIT-004
Page: Home and public shell
Component: Home and public shell
Problem: Inconsistent containers, hero alignment and narrow navbar spacing
Impact: Reliability, discovery, trust or usability is reduced.
Recommendation: Shared 80rem container, fluid gutters, responsive discovery grid and mobile logo
Status: NEEDS MANUAL VERIFICATION at all recorded widths

## UX / AUDIT-005

ID: AUDIT-005
Page: All routes
Component: All routes
Problem: Missing persistent theme controls and inadequate failure states
Impact: Reliability, discovery, trust or usability is reduced.
Recommendation: System-aware stored theme, header toggle, section retry and image fallback
Status: Theme policy tests PASS; interactive checks NEEDS MANUAL VERIFICATION

## ACCESSIBILITY / AUDIT-006

ID: AUDIT-006
Page: Dialogs, forms, motion
Component: Dialogs, forms, motion
Problem: Missing labels, focus lifecycle and motion safeguards
Impact: Reliability, discovery, trust or usability is reduced.
Recommendation: Shared focus management, names, focus styles and reduced-motion guards
Status: Markup checks PASS; keyboard and visual contrast NEEDS MANUAL VERIFICATION

## PERFORMANCE / AUDIT-007

ID: AUDIT-007
Page: Images, animations
Component: Images, animations
Problem: Oversized image requests and frequent animation work
Impact: Reliability, discovery, trust or usability is reduced.
Recommendation: Responsive photographs, eager hero, lazy below-fold imagery, rAF cursor/counters and paused idle frames
Status: Implementation reviewed; browser timing NEEDS MANUAL VERIFICATION

## CODE QUALITY / AUDIT-008

ID: AUDIT-008
Page: Database/build
Component: Database/build
Problem: TLS certificate verification disabled; server build inaccessible ancestor lookup
Impact: Reliability, discovery, trust or usability is reduced.
Recommendation: Verified TLS modes, explicit local exception and supported Vite runner build
Status: TLS regression and production build PASS

## CRITICAL / AUDIT-009

ID: AUDIT-009
Page: Environment and final QA
Component: Environment and final QA
Problem: Chrome disconnect prevents interactive verification; no Git history exists
Impact: Reliability, discovery, trust or usability is reduced.
Recommendation: Keep original snapshot, report blocked tests honestly and finish browser QA on a working browser
Status: NEEDS MANUAL VERIFICATION; no application crash proven by this blocker
