## 2026-10-11 — PR #37 CI follow-up

Initial GitHub run 38150556135 passed build/typecheck/fixture round-trip and 35/39 test files. Four failed files retained stock-image/CARTO-only expectations. Update browser CSP/theme checks for the selected provider, compare share metadata with the public content photo, and verify curated credits alongside restored licensed photos. Fix an actual public-credit defect: exclude credits for superseded photos absent from the final public payload. Add a database regression for used-photo-only credits. Local guarded test database rejects credentials (28P01); no guard bypass or production fallback. Follow-up GitHub acceptance pending. Initial failure evidence is retained.

## 2026-10-11 — Local map and photo restoration (BUG-055/056)

Fixed missing-key map geography with an attributed OpenStreetMap fallback; configured CARTO keys retain themed basemaps. Restored the original local folder's named photo corrections and 40 WebP assets at the public API boundary, with source/licence credits and matching share metadata. Preserved exact admin photo replacements and existing public markup. Added only the required tile/photo origins to img-src. Updated environment/setup documentation and added focused regression tests and a local browser diagnostic.

VERIFIED: production build/typecheck, 11 focused map/photo tests, image assets over HTTP, Chrome map (20 markers/nine loaded tiles) and image decoding on sampled public pages. Build emits dependency annotation and >500 kB chunk warnings; these do not fail it. Initial sandbox browser attempt failed before rendering; unsandboxed retry succeeded. Full database tests, booking submission, authenticated admin actions, keyed CARTO requests and responsive visual acceptance NOT TESTED. Historical entries retained.

## 2026-10-08 — PR #11 route-split CI repair (BUG-054)

The backend-only upload prematurely changed frontend navigation and advertised four missing React index pages, failing one Navbar visual baseline, Explore navigation, route status and sitemap tests. Keep the original five-page/home-map route contracts in step 1 and defer new routes to the frontend PR. Preserve backend/photo/header improvements and unchanged visual snapshots/CI. Add missing-page 404 regression cases. Local build/typecheck and synthetic round-trip PASS; local browser/database tests BLOCKED by test DB authentication. GitHub acceptance pending. Exact job/tests/evidence: docs/CI_PR11.md (../CI_PR11.md from codex).

# 2026-10-08 — Plain heroes, native cursor and complete debugging

Authorized hero/cursor/navigation cleanup implemented. Removed custom cursor code/styles, remaining hero diffusion/reflections, reduced overlays/inner heights, integrated inner navbar, separated Explore discovery from Destinations with compatibility redirects, corrected manual slide readiness/filter shrink/planner group text. Home three sections and published content preserved; no DB changes. Files/root causes/evidence: ../CHANGELOG.md and requested audits.

Final build/typecheck, 28 focused tests, synthetic round-trip, 43 production routes/47 assets, cache/preload/protection/redirect and declared-color/CSS checks PASS. Full suite 8/27 files PASS; infrastructure/historical baseline failures retained. Home gzip JS 110.0 → 109.6 KiB; Destinations 161.7 → 108.4 KiB with map moved to Explore. Browser/Lighthouse/image visual acceptance remain blocked/unverified. BUG-049–053 tracked. History preserved.

# 2026-10-08 — Full-screen hero and performance delivery

Authorized Home overlay header/100dvh hero, responsive photo candidates and matching preload, visibility/readiness slideshow, deferred dialogs/plain navbar, nonblocking fonts, coalesced cursor work, precomputed gzip and factual llms.txt. No DB writes; three Home sections preserved. Optional WebP generator prepared but external downloads blocked.

Final build/typecheck PASS; 17 tests PASS; 42 production routes, database, preload and gzip/cache/equality checks PASS. Home initial gzip JS 152.5 → 110.0 KiB; CSS 17.6 → 17.8 KiB. Lighthouse registry EACCES and Chrome WinError 10054 prevent metrics/rendered acceptance. Details/files/problem-root cause-implementation-verification in ../PERFORMANCE_AUDIT.md, ../LIGHTHOUSE_BEFORE_AFTER.md, ../HERO_REDESIGN.md, ../IMAGE_OPTIMIZATION.md and ../CHANGELOG.md. BUG-046–048. Historical entries retained.

# 2026-10-08 - Continued hero audit tooling

Updated scripts/audit-glass-ui.py for current open hero wrappers, computed surface/pseudo/active-nav metrics, Journal screenshots and selectable browser. Python compile PASS; fresh 43-route HTTP audit PASS; Edge retry BLOCKED before rendering. No application source/content change; latest build/16 tests preserved without claiming rerun. See FINAL_QA.md and continued-edge report.

# 2026-10-08 - All-page hero removal verification

Completed shared open PageHero, retained CTA banner and 404 photographic header. Removed unused glass-hero selectors/token and hero-panel geometry/filter overrides while preserving generic Glass3D. Build/typecheck PASS; 16 relevant tests PASS; CSS parse PASS; 43 live route shells/content API PASS. Before/after browser retries blocked with zero screenshots; seven widths/both themes remain manual acceptance. Full details in HERO_GLASS_REMOVAL.md and FINAL_QA.md. Historical entries retained.

# 2026-10-08 - Remove all large page hero glass wrappers

User-authorized public markup changes: PageHero now uses plain te-page-hero-copy, preserving its breadcrumbs/chips/eyebrow/title/description/image. This applies to Journal, Tours, Destinations/Explore, Experiences, About/Contact, Plan, Photography Credits and all destination/experience/tour/article detail pages. Retained CTASection banner also uses a plain text wrapper; Home already has no text panel. Shared source CSS removes obsolete panel padding/font/filter rules, adds a directional page-level gradient, theme-stable foregrounds and shared reading width. Compact glass chips/buttons/navbar/cards remain; routes/data/images unchanged. Files: src/components/PageHero.tsx, src/components/CTASection.tsx, src/index.css, src/styles/glass.css, src/styles/palette.css. Verification pending below/FINAL_QA.md; history retained.

# 2026-10-08 - Hero/navigation verification result

Build PASS; final public-ui nine tests PASS, photo three and scroll three PASS; live route shells 43/43 and database/API healthy; four CSS grammar parses PASS. Initial new Navbar test failed because its server-render test harness lacked matchMedia; supplied and restored a test-local stub, rerun passed. Browser capture remains blocked with zero rendered checks; visual acceptance is manual. Details in FINAL_QA.md; implementation entry/history below retained.

# 2026-10-08 - Cinematic home hero and navigation repair

User-authorized public markup changes: removed the homepage hero Glass3D text panel; preserved its headline, description, imagery and CTA routes. Added a directional hero gradient and solid champagne emphasis; retained smaller glass controls and dedicated page heroes. Navigation now uses NavLink with pathname/section matching and an explicit active data attribute, with hover color separate from the active underline. Same-page section changes update URL/history. Added previous/next slideshow controls and independent hover/focus pause states. Files: Navbar.tsx, SiteLink.tsx, HeroSection.tsx, activeNavigation.ts, index.css, glass.css, palette.css and public-ui.test.ts. Verification results will be recorded in FINAL_QA.md. Historical entries preserved.

# 2026-10-08 - Runtime restoration verification

Documentation/evidence only: verified restored development database, healthy API and 43 public route shells. Recorded the single Jaffna same-photo thumbnail/original fixture difference without modifying content. Retried browser capture (blocked before rendering) and recorded desktop-browser policy rejection. No application source changes; previous source checks retained with their actual scope.

Follow-up verification update (2026-10-08): final build/typecheck PASS; 21 relevant tests PASS; 22 fixed color pairs PASS; four CSS files parse. Browser retry BLOCKED. Content API now FAILS with local database unavailable on 5433; user will restore the local instance. See FINAL_QA.md; prior API-ready evidence is historical, not the current runtime state.

## 2026-10-08 - Glass follow-up: positioned controls, interaction states and hero crossfade

Problem -> root cause: the earlier shared button appearance rule also set unlayered position:relative, which overrides Tailwind absolute utilities on modal/menu close controls. An over-specific hover rule defeated pressed/forced-color states and weakened reduced-transparency fallbacks. Hero carousel transition-opacity/transition-transform utilities competed for transition-property.

Files changed: src/index.css, src/styles/glass.css, src/components/HeroSection.tsx; scripts/audit-glass-ui.py and glass/button/hero/bug/status/QA reports.

Fix: moved button positioning into the component layer so absolute/fixed utilities can win; restricted normal hover state specificity with :where and excluded aria-disabled sheen; solid fallback context values stay solid during hover; pressed transform and forced-color hover can win. Carousel now uses one te-hero-slide rule with explicit opacity 700ms / transform 7s transitions and data-active state. Reduced-motion rules still suppress animation. Photographic tint remains neutral .42; blur stays confined to the panel and the image receives no blur/filter. No additional glass layers, darker hero rectangle, image/content/route changes or database writes.

Verification: final executed results recorded at the top of FINAL_QA.md. Software-rendering browser retry was BLOCKED with WinError 10054 before any viewport; no screenshots or rendered interaction PASS. Findings tracked as BUG-039-041. Historical entries preserved.

## 2026-10-08 ? Premium glass color and hero/button debugging

Problem: overlapping palette/overlay/button definitions produced muddy photographic panels, unrelated gold/emerald actions, and fragile hover/visibility behavior. Root causes: duplicated unlayered CSS, a higher-specificity home secondary override, opaque inverse button fills, nested backdrop ownership and independent component utility colors.

Fix: palette.css now owns semantic colors and photo/action context tokens using the requested Travel Eye light/dark palette. Removed superseded rules in index.css and consolidated appearance in glass.css. Glass3D retains edge reflections, underside depth and noise; the surface owns one backdrop filter (14px heroes/16px navbar/8px cards; mobile heroes 10px; saturation 112?118%, brightness 1). Photo panels use neutral charcoal instead of strong emerald. Ordinary primary actions use emerald; photographic/inverse actions use pearl; secondary/outline/icon variants share reflective borders and 220ms hover transitions. Button geometry uses Tailwind's component layer so responsive hidden utilities win. Breadcrumbs moved inside the PageHero panel. Normalized map, form, planner, footer, navbar, 404, WhatsApp and modal actions; removed individual icon scaling and conflicting fill/hover utilities. Corrected dark filter hover labels and selected count/map badge contrast. Existing routes, accurate images/content and three-section Home preserved.

Files: src/index.css; src/styles/{palette,glass,glass3d}.css; components PageHero, HeroSection, Navbar, ThemeToggle, CTASection (retained unused), Footer, InquiryForm/InquiryModal, SearchModal, PlanCard, QuickSearch, ToursSection, TravelPlanner, HiddenGemsSection, PhotoStorySection, InteractiveMapSection; pages DestinationsPage/NotFoundPage; audit scripts and reports.

Verification: relevant rendering/data/action checks and fixed-token contrast math pass; final build is recorded in FINAL_QA.md. HTTP route shells 43/43 PASS with content API 200. Browser attempts via Chrome/Edge Node CDP, Python websocket and direct headless capture all blocked; zero before/after screenshots or rendered viewport passes. Visual acceptance explicitly NEEDS MANUAL VERIFICATION. No dependency, route or database changes in this UI pass. Details: GLASS_UI_AUDIT.md, BUTTON_AUDIT.md, HERO_AUDIT.md and FINAL_QA.md. Historical entries retained.

## 2026-10-08 — Authorized homepage/routes/Tropical Glass change

User explicitly requested changes to frozen public structure. Home is now three sections with four previews. Unique map, planner and journal content relocated; existing detail/list content and inquiry preserved. Centralized twelve-color palette and layered Glass3D with accessibility fallbacks; original requested custom snippet was unavailable. Shared guarded image compatibility fixes active legacy content and share metadata, preserving owner edits; two story geography labels corrected. Build/typecheck and focused rendering/data tests pass; browser/database/external-delivery blockers remain explicit. Full details: ../ROUTE_AUDIT.md, ../HOMEPAGE_RESTRUCTURE.md, ../DESIGN_SYSTEM.md, ../IMAGE_AUDIT.md and ../FINAL_QA.md. Historical entries preserved.

## 2026-10-07 - Map selection and season follow-up

The quick-jump row now scrolls horizontally to reveal the selected destination without moving the page. Its accessible group name identifies the location controls. Map bounds now refresh when the season or published destination list changes, even when the category stays the same. Existing full-width location labels and public layout are preserved.

Validation: typecheck and client production build passed; map-marker and public-page markup tests passed 9/9. Rendered browser geometry and interactive map behavior remain unverified. Vite reported nonfatal annotation warnings in the installed Zod dependency.

## 2026-10-07 - Map location quick-jump labels

Fixed shrinking location buttons and desktop overflow by bounding the quick-jump row on both sides and keeping buttons at their full text width. Restored a visible scrollbar and added selected-state and keyboard-focus cues. Validation: production build/typecheck PASS; public-ui and map-marker tests 9/9 PASS; local content API HTTP 200 with 20 destinations. Visual browser layout not automated in this run.


## 2026-10-06 - complete alignment pass evidence

Shared global container, header height, content-driven hero variants, section headers, reading columns, CTA groups and grid gaps now govern every public route and the admin shell. Inner-hero width override removed (BUG-029). Article/404 and previously centered section axes corrected structurally. Theme selectors do not alter geometric tokens. Expanded markup tests cover every published dynamic slug and existing hash/filter routes. Build/typecheck/public rendering PASS. Fresh HTTP audit: 142/142 PASS. Real rendered geometry, click navigation, overflow and no-theme-shift proof remain NEEDS MANUAL VERIFICATION: Chrome still disconnects even with GPU disabled. Full checklist: docs/ALIGNMENT_AUDIT.md.
# Current evidence - 2026-10-06 quality pass

The authoritative current ledger is [BUG_REPORT](../BUG_REPORT.md); final evidence is [FINAL_QA](../FINAL_QA.md). Build passes; local database is available; photo migration applied. Browser checks remain blocked and Belilena unresolved. Earlier entries below are preserved as dated history and are superseded where the current ledger records newer evidence.

# Changelog

## 2026-10-08 - Liquid Glass presentation

Implemented the user's authorized public design enhancement using shared glass/theme tokens, bounded photographic hero/contact panels, navbar, button reflections, selected card metadata, native scrollbars and accessible scroll-to-top. No routes, content, image changes, dependencies or database writes. Implementation inventory: ../GLASS_IMPLEMENTATION.md; design: ../GLASS_DESIGN_SYSTEM.md.

Verification: 16 focused tests PASS across four files. Existing full suite executed: 5/24 files PASS; local test DB rejects the password, browser bundling is restricted and historical Git baselines are unavailable. Chrome and Edge viewport audits are BLOCKED by DevTools disconnect; Firefox/Safari NOT TESTED. Rendered geometry, contrast, scrollbar hover and touch behavior remain unverified. Full evidence: ../FINAL_QA.md.

## 2026-10-08 - Jaffna photo loading (BUG-031)

Correct Jaffna's exact legacy seed image in the public mapper without changing admin edits. Retry saved image sources after responsive failures before using the placeholder, with distinct credited-original fallback. Files: src/components/TravelImage.tsx, src/lib/image-retries.ts, src/lib/destination-photo.ts, src/lib/mappers.ts, server/test/image-retries.test.ts and issue/status documentation. Four focused regression tests PASS. Browser verification blocked by Chrome disconnect; no database writes. Existing public layout preserved.

## 2026-10-06 — Re-audit with current evidence and implementation findings

**Type:** Documentation

**Files changed:**

- `AGENTS.md`
- `docs/codex/AUDIT_REPORT.md`
- `docs/codex/BUGS.md`
- `docs/codex/CHANGELOG.md`
- `docs/codex/IMPROVEMENTS.md`
- `docs/codex/PROJECT_STATUS.md`

### What changed

Added a current audit ahead of the retained historical report; preserved BUG-001–003 and added BUG-004–015. Updated issue counts and corrected current health claims. Added recommendations and audit-continuity instructions while retaining repository rules and changelog history. No application source, configuration or database files were edited.

### Why

The previous dashboard's build/frontend claims could not be reproduced in this execution environment. Static review also found incomplete newsletter/planner behaviors, ignored timing, accessibility gaps, cache/revision defects and security follow-ups omitted from the earlier report.

### User-visible effect

No direct user-visible change.

### Related issues

`BUG-001` through `BUG-015`.

### Verification

Node 22.23.2; npm.cmd ls --depth=0 and offline npm ci dry-run passed (not a clean install). npm.cmd run typecheck and verify:roundtrip passed; the latter uses synthetic model conversion, not a live DB. Standard build/dev failed at Vite/esbuild filesystem access restrictions. Existing built backend exited on missing DATABASE_URL. npm.cmd test completed: 2/19 files passed; 17 failed/cancelled with missing test DB, bundler restrictions and browser hook failures. Git metadata absent. No lint script available. Live UI/CRUD/auth/DB, mobile layouts and external integrations were not verified.

Historical verification text below is retained as history; the current audit/status above supersede its health conclusions.

## 2026-10-06 — Initial audit and project documentation
**Type:** Documentation

**Files changed:**

- `AGENTS.md`
- `docs/codex/AUDIT_REPORT.md`
- `docs/codex/BUGS.md`
- `docs/codex/IMPROVEMENTS.md`
- `docs/codex/PROJECT_STATUS.md`

### What changed
Created the repository’s initial Codex documentation set: the audit report, bug tracker, project status dashboard, improvement backlog, and permanent repository instructions.

### Why
This project required an initial evidence-based review before any major fixes. The repo had to be audited against the README, runtime behavior, environment requirements, and actual test/build output.

### User-visible effect
No direct user-visible change. This is repository documentation and audit tracking only.

### Related issues
`BUG-001`, `BUG-002`, `BUG-003`

### Verification
Verified by running `npm run typecheck`, `npm run build`, `npm run dev:server`, and `npm test` in the current workspace and comparing the results against the repository configuration.

## Map-name follow-up - 2026-10-06

Mobile map cards and spotlight label layout updated; names/data preserved. Final build/typecheck PASS; public-page and map-marker tests: nine checks PASS across two files; fresh HTTP route/protection audit: 142/142 PASS; all 33 emitted local JS/CSS assets return correct MIME/status; live content API returns 20 intact destination names. Rendered layout remains NEEDS MANUAL VERIFICATION because Chrome disconnects. Full details in ../CHANGELOG.md.

BUG-031 validation: final build/typecheck PASS (nonfatal Zod annotation warnings); four regression tests PASS. Live API-to-mapper check produces the corrected Jaffna original and Vite serves the correction with HTTP 200. Rendered visual confirmation remains blocked.

Liquid Glass final validation (2026-10-08): final client/server production build/typecheck PASS, with nonfatal Zod annotation warnings. Sixteen focused tests and ten local HTTP delivery checks PASS. Browser and full-suite acceptance remain blocked as documented.
