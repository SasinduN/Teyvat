# 2026-10-12 — Simple point-to-point ride requests

Authorized public booking redesign: `/booking` becomes Book Your Ride with seven essential inputs, conditional return fields, manual pickup/drop-off, existing destination suggestions, click-only GPS, compact live summary and scoped Green & Pearl/Sky Blue dark/light styles. Guests provide their callback number in a separate native dialog; authenticated identity is resolved by the server. Added strict ride API/validation, safe retries, pending receipts and admin ride labels. Existing tour CTAs use the preserved tour form and contact/itinerary schema. Migration 0015 supports manual ride destinations without deleting legacy fields. Navigation/footer labels updated.

Build/typecheck and initial focused API/schema/browser checks passed; final evidence and limitations are recorded in FINAL_QA.md. Only configured vehicles/capacities are offered; no pricing, fleet availability, reverse geocoding or production email delivery is claimed. Historical entries follow.

## 2026-10-11 — PR #37 credit filtering and regression alignment

Exclude superseded photo credits from the corrected public payload. Update existing map-provider, used-photo-credit and share-image tests for the authorized restored behavior. Initial CI: 35/39 files passed; follow-up acceptance pending. Local database tests blocked by guarded test-database authentication (28P01). Existing checks and visual baselines retained.

## 2026-10-11 — Fix local map and restore expected photos

Missing/blank CARTO keys now select attributed OpenStreetMap tiles. Restored the original local folder's exact-record Sri Lanka photo corrections, 40 existing WebP assets and photography credits without overwriting admin selections or changing public markup. Share metadata uses the same corrected images. Build and 11 focused tests pass; Chrome verified loaded map tiles/markers and sampled public images. Full database/booking/authenticated-admin checks not run. Details: docs/codex/CHANGELOG.md, BUG-055/056. Build annotation/chunk warnings remain.

## 2026-10-08 — PR #11 route-split CI repair (BUG-054)

The backend-only upload prematurely changed frontend navigation and advertised four missing React index pages, failing one Navbar visual baseline, Explore navigation, route status and sitemap tests. Keep the original five-page/home-map route contracts in step 1 and defer new routes to the frontend PR. Preserve backend/photo/header improvements and unchanged visual snapshots/CI. Add missing-page 404 regression cases. Local build/typecheck and synthetic round-trip PASS; local browser/database tests BLOCKED by test DB authentication. GitHub acceptance pending. Exact job/tests/evidence: docs/CI_PR11.md (../CI_PR11.md from codex).

## 2026-10-08 — GitHub upload, step 1 of 2

Split the existing complete-site upload into sequential pull requests at the user's request. Step 1 contains the Express backend, PostgreSQL migrations, shared data/photo/route contracts, required content/planner helpers, server checks and build configuration. Step 2 supplies the public/admin frontend, assets, remaining tests/tooling and documentation. Existing changelog history is preserved. No database writes or new public UI edits were performed for this split. The original upload CI failed browser design-baseline and map/CSP checks; splitting alone does not resolve those failures.

# 2026-10-08 — Complete debugging, plain heroes and native cursor

Problem → roots: custom cursor injected pointer/RAF work; residual hero metadata/actions inherited glass and stacked overlays; Explore used the Destinations page with a hash; manual slides could reveal an unloaded image; flex category labels could shrink/clip.

Fix: deleted cursor component/import/mount/CSS; plain hero metadata/clean controls, lighter directional gradients and Champagne accent; transparent unscrolled header on inner pages with stable geometry and shorter inner hero minima. Existing map/QuickSearch/hidden gems moved to dedicated /explore, catalogue retained at /destinations, old map/query/hash links preserved. Shared explicit active/current nav semantics and 44px targets. Manual slide readiness/source resets, eager 404 photo, nonshrinking filters/visible scrollbar, correct planner group text semantics. Home remains three sections, accurate existing content/credits/CTAs retained; no DB writes/migrations.

Files: PublicLayout/removed TravelCursor; HeroSection/PageHero/CTASection/Navbar/NotFoundPage/DestinationsPage/new ExplorePage/DestinationExplorer/TravelPlanner; index.css/glass.css/palette.css; App/shared paths/meta/server pages; affected public/browser tests, bundle/HTTP/image/browser audit tooling and llms.txt; requested audit reports.

Verification: final build/typecheck PASS; 28 focused tests PASS; synthetic non-photo round-trip PASS; 43 production routes/47 assets and negative/protection/redirect checks PASS; DB up; 22 fixed-color pairs PASS; four CSS files parse. Full suite 8/27 files PASS with 19 test-DB/browser/bundler/Git-history failures retained. Home gzip JS 110.0 → 109.6 KiB; Destinations 161.7 → 108.4 KiB because discovery loads on Explore. No Lighthouse metrics, screenshot/visual/interaction or all-image acceptance claims; Chrome/Edge disconnect and Lighthouse availability remain blocked. Belilena photograph remains unverified. Details: WEB_AUDIT.md, HERO_AUDIT.md, NAVIGATION_AUDIT.md, IMAGE_AUDIT.md, BUTTON_AUDIT.md, PERFORMANCE_AUDIT.md, FINAL_QA.md; evidence qa-results/web-debug. History preserved below.

# 2026-10-08 — Full-screen hero and performance delivery

User-authorized public change: Home transparent fixed header over a 100dvh/content-driven photographic hero; short-screen spacing, direct serif/ivory/champagne typography and compact mobile Plan control. Three Home sections, existing routes/copy/CTAs/credits preserved. Slideshow now observes viewport/tab visibility and image readiness. Shared responsive Wikimedia/Unsplash candidates and matching database-driven Home preload; optional hashed WebP pipeline. Deferred dialogs, plain navbar markup, immediate hero copy, nonblocking CSP-safe fonts, coalesced cursor measurements. Prebuilt gzip assets with negotiated MIME/Vary/immutable caching. Factual llms.txt added. No database changes.

Files: HeroSection/Navbar/PublicLayout/TravelImage/TravelCursor/ScrollToTop; index.css/glass.css/index.html/theme-init; shared responsive-image/optimized-photos; server app/pages; build-server/bundle-report/optimize-photos/verify-performance-delivery; responsive tests and requested reports.

VERIFIED: final build/typecheck PASS (two nonfatal Zod warnings); 17 tests PASS; 42 production routes/database/preload/gzip-cache checks PASS. Home initial gzip JS 152.5 → 110.0 KiB (~27.9% smaller), CSS 17.6 → 17.8 KiB. Entry HTTP JS 342,624 identity / 105,538 gzip bytes. Lighthouse BLOCKED (registry EACCES), browser before/after BLOCKED (WinError 10054), photo generation BLOCKED. No score/LCP/TBT/CLS/image-saving claims; responsive visual acceptance NEEDS MANUAL VERIFICATION. See PERFORMANCE_AUDIT.md, LIGHTHOUSE_BEFORE_AFTER.md, HERO_REDESIGN.md and IMAGE_OPTIMIZATION.md. BUG-046–048 tracked; history preserved below.

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

## 2026-10-08 — Three-section Home and Tropical Glass

- Fixed excessive Home composition at its source: fourteen rendered blocks become cinematic hero, four destination previews and journey CTA.
- Relocated map/search/hidden gems to Destinations, saved journey builder to new `/plan`, journal/photo stories to new `/journal`; existing full listings, details, prices and inquiry retained.
- Updated navigation/hero links, tour-map URL selection, saved Home hash redirects, Express metadata/sitemap, and guarded client/server share-image corrections.
- Centralized supplied light/dark palette and Glass3D pseudo-layers, owned SVG noise, restrained blur, reflections/shadows and accessible fallbacks. Original user Glass3D snippet was unavailable; existing glass system used.
- Applied 58 exact legacy primary-photo corrections and two galleries without database writes; corrected two seeded story geographic labels without overwriting owner edits.
- Added Home/content relocation and photo-guard regression tests; updated browser route/planning/map tests to relocated URLs. Historical screenshot baseline remains historical and has no current visual-parity acceptance claim.
- Build/typecheck, focused markup/image/control tests and API mapper checks pass. Full suite, external image delivery and browser acceptance retain separately recorded blockers in FINAL_QA.md.

# Travel Eye engineering changelog

## 2026-10-08 - Liquid Glass presentation

User-authorized public presentation enhancement: bounded hero/contact panels, forest glass navigation with scroll opacity, reflective gold/emerald buttons, selective card metadata, native themed scrollbars and floating glass controls. Added accessible scroll-to-top with focus transfer, reduced-motion support and protected-control/footer/dialog avoidance. Preserve content, routes, images and existing action handlers. Theme tokens change colors only; unsupported blur, reduced transparency and forced colors have fallbacks. No new dependencies or database changes.

Source: src/styles/glass.css, main.tsx, HeroSection, PageHero, CTASection, Navbar, QuickSearch, PageCards, DestinationSpotlight, FeaturedExperiences, ToursSection, WhatsAppButton, ScrollToTop, PublicLayout and lib/scrollToTop.ts. Added scripts/audit-glass.ts and three scroll-to-top action tests. Design and coverage: GLASS_DESIGN_SYSTEM.md, GLASS_IMPLEMENTATION.md, FINAL_QA.md.

Validation: 16 focused tests PASS across four files (public rendering, map markers, image retry and scroll-to-top action). Full existing suite run before adding the new action file: 5/24 files PASS; 19 fail/cancel due to local test-database authentication, bundler filesystem restrictions and missing Git baseline history. Chrome and Edge glass viewport audits BLOCKED by DevTools disconnect; Firefox/Safari NOT TESTED. No visual, cross-browser or full-suite acceptance claimed.

## 2026-10-08 - Jaffna photo loading (BUG-031)

Correct only Jaffna's exact legacy seed URL to the existing credited Nallur original at the public mapper boundary. Preserve admin photo edits. TravelImage retries the saved URL after responsive failure, then a distinct credited original; catalog metadata also recognizes original URLs. Existing public layout preserved. Four focused regression tests PASS; browser verification blocked by Chrome disconnect. No database writes.

## 2026-10-06 ? Existing-site refinement

### Added
- Route map and eight required audit/design/QA documents.
- Local source snapshot in .audit-baseline for review in this downloaded copy without Git history; environment secrets excluded.

### Fixed
- Pending implementation; baseline retained.

### Improved
- Architecture, route, interaction and design inventory recorded before changes.

### Changed
- No application code changed at this checkpoint.

### Accessibility
- Dialog, input label, focus and motion defects identified.

### Performance
- Eager below-fold image loading identified.

### Images
- No images replaced; geographic verification pending browser access.

### Responsive
- Eight requested widths queued; rendered verification blocked by Chrome GPU startup.

### Files Modified
- docs/SITE_MAP.md, WEB_AUDIT.md, BUG_REPORT.md, CHANGELOG.md, DESIGN_SYSTEM.md, IMAGE_AUDIT.md, RESPONSIVE_AUDIT.md, FINAL_QA.md.

### Checkpoint ? shared accessibility and presentation
- Added reusable button variants, native-pointer-safe desktop follower and scoped palette/focus/motion rules.
- Added modal background isolation, focus containment/restoration, Escape and scroll locking; search now trims terms and shows all matches.
- Added skip link and reduced-motion configuration; hero keeps its original copy, gets fluid type, layered overlay, selective caption glass and slideshow pause.
- Page heroes can grow with content; editor record cache receives the saved row.
- Files: src/hooks/useModalFocus.ts, components/Button.tsx, TravelCursor.tsx, HeroSection.tsx, SearchModal.tsx, InquiryModal.tsx, PageHero.tsx, pages/PublicLayout.tsx, admin/pages/RecordEditorPage.tsx, index.css.
- Browser verification pending; Chrome GPU startup remains blocked.

### Checkpoint ? real form behavior
- Newsletter now persists normalized unique emails through a same-origin API and additive migration; success follows the server, with validation, atomic IP throttling and retry states. No marketing email is sent by this task.
- Enquiry fields have associated labels, autocomplete and length bounds; failures and successful submission are announced.
- Quick search season now filters published destination best-time ranges; map list no longer truncates matches. Unknown seasonal wording stays discoverable.
- Unconfigured footer URLs render as plain text rather than inert anchors.
- Programmatic section scrolling respects reduced motion.
- Files: shared/newsletter-schema.ts, shared/api.ts, db/migrations/0009_newsletter.sql, server/src/routes/newsletter.ts, server/src/app.ts, components/InquiryForm.tsx, Footer.tsx, QuickSearch.tsx, InteractiveMapSection.tsx, pages/HomePage.tsx, lib/travelTiming.ts, routeFocus.ts.

### Checkpoint ? planner and navigation
- Planner now honors style/region using published destination facts, supports a 16-day sample for 15+, preserves original default sample itineraries, persists a journey on this device and reports storage errors. Saved preferences restore after reload. Day 10 formatting fixed; sample/availability limits explained.
- Selection groups expose pressed state; selecting new preferences clears stale previews.
- Navigation gets active-route state, passive initial scroll handling and an accessible mobile drawer; full desktop links move to 1280px to prevent tablet collisions.
- Files: components/TravelPlanner.tsx, Navbar.tsx, lib/planner.ts.

### Checkpoint ? photography, cards and responsive rhythm
- Shared TravelImage preserves original URLs and subjects, adds native lazy loading/async decoding and responsive Unsplash variants. Page/home hero images remain eager/high priority; unseen carousel slides do not initially load.
- Related card variants receive restrained elevation and 1.035x image zoom; original metadata, prices, durations and routes are preserved.
- Tour price/day badges wrap instead of overlapping; route actions wrap on narrow screens.
- Existing once-only scroll reveals are retained and marked for reduced-motion visibility.
- Files: components/TravelImage.tsx and public image-bearing components/pages; index.css. No photos replaced or database content edited.

### Checkpoint ? development/build configuration
- Vite scripts now use the supported runner config loader, removing the failing config-bundle step under restricted Windows filesystem access. Standard dev/build commands remain the entry points. Dependencies unchanged.
- Files: package.json. Production build verification underway.

### Checkpoint ? server bundle
- Client production bundle now succeeds with the runner loader. The separate esbuild CLI still failed ancestor resolution, so server build now uses the already-installed Vite/Rollup SSR pipeline with browser plugins disabled and dependencies external. No new dependency.
- Files: scripts/build-server.mjs, package.json. Full build and built-server smoke checks pending.

### Checkpoint ? concurrency and animation performance
- Admin/settings/inquiry reads and writes return lossless microsecond UTC revision strings and compare them exactly, closing the stale-version tolerance window without changing global pg timestamp parsers.
- Intro statistics use frame-paced eased counting rather than thousands of millisecond interval renders; reduced-motion displays final numbers.
- Mobile navigation drawer sits above the header and exposes active route state.
- Files: server/src/revision.ts, routes/admin.ts, inquiries.ts, components/IntroSection.tsx, Navbar.tsx and reveal-bearing components.

### Checkpoint ? secondary dialogs and touch gallery
- Newly found BUG-016: hidden-gem/photo cards were mouse-only and their dialogs lacked keyboard lifecycle. Added keyboard activation and the shared focus-isolation hook, accessible close names and scrolling panels.
- Category cards on home are now native buttons; experience-page cards remain links. Touch photo captions stay visible; gem enquiry actions wrap.
- Files: components/HiddenGemsSection.tsx, PhotoStorySection.tsx, ExperiencesSection.tsx, index.css.

### Checkpoint ? remaining shared controls
- Admin mobile drawer now has focus containment, Escape/close control and responsive dismissal; boot loading/errors are announced and reduced-motion safe. Detail CTAs use the shared button styling.
- Corrected duplicate test URL and bogus optional CARTO placeholder in .env.example; only that exact dummy map key was cleared locally.
- Newsletter attempt rows join the existing 24-hour housekeeping sweep.
- Added bounded Chrome DevTools requests/disconnect rejection and a repeatable route/viewport/image audit script, plus behavioral regression coverage for newsletter, preferences, seasons and exact revisions.
- Files: admin/components/AdminLayout.tsx, components/SiteStatus.tsx, PlanCard.tsx, TravelCursor.tsx, index.css, .env.example, server/src/auth/sweep.ts, server/test/chrome.ts, engineering.test.ts, scripts/audit-site.ts.

### Checkpoint - regression evidence and discovery repeatability
- Added markup rendering checks for every public page type, preserved tour metadata, complete search results and form-label associations; these are not browser/layout tests.
- Added read-only live-content comparison: all nine published collections match the original content with the already-approved 0007 route conversion.
- Repeating the same quick search now reapplies its category/location after manual map changes; empty seasonal results have a recovery explanation (BUG-021).
- Same-page navigation respects reduced motion; map configuration can be imported for non-Vite markup checks without changing browser behavior.
- Files: server/test/public-ui.test.ts, scripts/verify-live-content.ts, scripts/audit-site.ts, components/SiteLink.tsx, InteractiveMapSection.tsx, pages/HomePage.tsx, lib/mapTiles.ts, README.md, docs/SCHEMA.md.

## 2026-10-06 - Full quality pass: layout and themes

### Added
- Persistent system-aware light/dark theme, external early theme initialization and navigation toggle.
### Fixed
- Shared 1280px container replaces inconsistent primary content edges; discovery form has explicit mobile/tablet/desktop grids.
- Failed sections display a recovery action instead of disappearing.
### Improved
- Hero aligns to the page grid with controlled text widths, left-aligned CTAs and photographic gradients.
### Changed
- Public and admin surfaces/text now consume semantic color tokens, preserving forest/gold identity.
### Accessibility
- Theme button has a state-specific accessible name; storage failures do not prevent theme switching.
### Files Modified
- src/index.css, src/components, src/pages, src/admin, src/main.tsx, src/lib/theme.ts, src/theme-init.ts, index.html.
### Verification
- Pending typecheck, build and regression; visual review remains blocked by Chrome startup.

### Checkpoint - location photography and recovery
- Added credited Wikimedia registry with verified location descriptions and source/license URLs; no generated destination photos.
- Added shared same-photograph original retry and explicit local fallback for unexpected failures. Fallbacks remain detectable in QA.
- Added Photography credits page and footer link. Removed unverifiable stock author portraits from the UI, preserving author names and roles as initials.
- Unified secondary-page containers and moved the long introduction after tours so home discovery follows the hero/search directly.
- Corrected hardcoded intro/CTA photography to Sri Lankan tea country and Mirissa.
- Files: shared/travel-photos.json, photo-corrections.ts, image-hosts.ts, TravelImage.tsx, AuthorAvatar.tsx, PhotoCreditsPage.tsx, Footer.tsx, JournalSection.tsx, ArticlePage.tsx, IntroSection.tsx, CTASection.tsx, HomePage.tsx, PageHero.tsx, secondary pages, App.tsx, site-paths.ts, server/src/pages/pages.ts, public/images/photo-unavailable.svg.
- Named-photo database migration and browser loading/crop verification pending; Belilena remains explicitly unresolved rather than using another cave.

### Checkpoint - guarded database corrections, cursor and map
- Applied migration 0010 to the local development database: 58 named primary images and two galleries corrected only when matching original seed URLs. Removed two mismatched gallery frames; record data, prices and durations preserved. Read-only origin audit passed for all 68 remaining stored references.
- Rechecked cursor hit targets during scrolling and pointer entry, raised layers above dialogs and changed the inner dot to 6px; browser movement/hover verification pending.
- Added an OpenStreetMap basemap fallback when CARTO is unset, preserving keyed CARTO and attribution; browser caching and interactive-only loading are retained. OSM tile policy reviewed; no prefetch/offline feature.
- Chromium profile cleanup now reports its own failure without replacing the original browser failure.
- Extended route QA with photo credits, 390/820 widths, both themes and detectable image fallback states.
- Files: db/migrations/0010_location_photography.sql, scripts/generate-photo-migration.ts, TravelCursor.tsx, shared/map-tiles.ts, src/lib/mapTiles.ts, server/src/security-headers.ts, server/test/security.test.ts, chrome.ts, scripts/audit-site.ts.

### Checkpoint - regression and contrast
- New guarded-database regression passed: image migration preserves all non-image tour data, owner-edited URLs and repeated application.
- All nine live collections match original content with the reviewed image corrections applied.
- Theme preference tests passed for saved choice, system fallback and blocked storage; map/CSP host assertions updated for exact new hosts.
- Separated accent text from accent surfaces for readable light/dark labels and gold-button foregrounds. Corrected an ES2020-incompatible string method found by typecheck.
- Files: server/test/quality-pass.test.ts, scripts/verify-live-content.ts, generate-photo-migration.ts, index.css and semantic text consumers.

### Checkpoint - existing TLS security finding
- Database TLS now verifies certificates for require/verify modes, with a narrow explicit localhost-only no-verify development exception. Unsupported modes fail clearly. Remote self-signed deployments require a trusted CA. Local non-TLS PostgreSQL setup is unchanged.
- Files: shared/pg-connection.ts; policy regression tests to follow.

### Checkpoint - small-screen navigation and redundant motion
- Logo scales with mobile controls so logo, theme, search and menu fit the 320px grid.
- Removed the repetitive bouncing scroll cue, which overlapped the floating discovery bar; Explore remains the direct discovery action.
- Files: Logo.tsx, HeroSection.tsx, index.css. Rendered alignment still needs browser verification.

### Checkpoint - final test contract updates
- Final regression identified outdated image-host error text, the newly added credits route missing from sitemap expectations, and an incorrect initials expectation. Updated assertions to the actual reviewed behavior; no runtime errors suppressed. Re-running the affected files.
- Files: server/test/media.test.ts, pages.test.ts, public-ui.test.ts.

### Checkpoint - mandatory audit records
- Images: recorded all original visible record references, their decisions and source credits; Belilena explicitly remains OPEN.
- Responsive: created both-theme route/width matrix and explicitly marked blocked measurements.
- UI/UX: documented discovery hierarchy, shared containers, themed controls and failure states.
- Files Modified: docs/IMAGE_AUDIT.md, WEB_AUDIT.md, SITE_MAP.md, RESPONSIVE_AUDIT.md.

### Checkpoint - design and bug history
- Added: complete current bug ledger, design-token documentation and current-evidence links over preserved historical audit files.
- Removed: no useful page or tour data removed; only redundant scroll cue and unverifiable visible stock portraits removed in earlier checkpoints.
- Dark Mode / Cursor / Accessibility / Performance: documented implemented behavior and outstanding browser verification explicitly.
- Changed: README now describes reviewed photo corrections, keyless maps, theme persistence and certificate validation.
- Files Modified: docs/BUG_REPORT.md, DESIGN_SYSTEM.md, qa-results/bug-summary.json, docs/codex trackers, README.md, .gitignore.

### Checkpoint - remaining color consumers
- Fixed: final gold CTA now uses dark on-accent text in both themes.
- Dark Mode: error/success feedback has readable theme-specific tokens.
- Changed: remaining component hex values now consume centralized semantic/supporting variables, including gold gradients and forest overlays.
- Files Modified: src/index.css, src\components\CTASection.tsx, src\components\DestinationSpotlight.tsx, src\components\ExperiencesSection.tsx, src\components\FeaturedExperiences.tsx, src\components\Footer.tsx, src\components\HeroSection.tsx, src\components\HiddenGemsSection.tsx, src\components\InquiryForm.tsx, src\components\InteractiveMapSection.tsx, src\components\Logo.tsx, src\components\Navbar.tsx, src\components\PageCards.tsx, src\components\PageHero.tsx, src\components\PhotoStorySection.tsx, src\components\PlanCard.tsx, src\components\QuickSearch.tsx, src\components\RouteMap.tsx, src\components\SearchModal.tsx, src\components\ToursSection.tsx, src\components\TravelPlanner.tsx, src\components\WhatsAppButton.tsx, src\pages\DestinationPage.tsx, src\pages\DestinationsPage.tsx, src\pages\ExperiencePage.tsx, src\pages\NotFoundPage.tsx, src\pages\PublicLayout.tsx, src\admin\components\AdminLayout.tsx, src\admin\components\fields.tsx, src\admin\components\ImagePicker.tsx, src\admin\components\PageCrash.tsx, src\admin\components\RecordForm.tsx, src\admin\components\TourStopsField.tsx, src\admin\components\ui.tsx, src\admin\pages\CollectionPage.tsx, src\admin\pages\DashboardPage.tsx, src\admin\pages\InquiriesPage.tsx, src\admin\pages\LoginPage.tsx, src\admin\pages\MediaPage.tsx.

- Follow-up: destructive admin buttons use a theme-specific on-feedback foreground so pale dark-theme error colors retain contrast. Files: src/admin/components/ui.tsx, src/index.css.

### Checkpoint - production smoke and payload measurements
- Verification: 63 live published records across nine collections match preserved content plus reviewed image corrections.
- Performance: bundle report measured 180.9 KB gzipped initial home JS, 15.4 KB CSS, with Leaflet 42.5 KB loaded on demand; no animation dependency added.
- Production smoke caught a QA process started before the rebuild retaining obsolete HTML asset hashes. Restarting after the final build and repeating smoke checks.
- Accessibility: 11 explicit solid token pairs meet 4.5:1; overlays and full page contrast need browser review.
- Files Modified: qa-results/content-preservation.json, token-contrast.json, production-smoke.json, CHANGELOG.md.

### Checkpoint - final test evidence
- Tests: 14/23 files pass; all 14 non-browser files pass. Nine browser files fail due to Chrome disconnection/missing baseline Git metadata. No browser PASS claimed.
- Accessibility: discovery glass keeps pale gold labels on its inverse forest surface in both themes.
- Files Modified: src/index.css, docs/CHANGELOG.md. Final build in progress.

### Checkpoint - QA documentation completed
- Added: FINAL_QA.md with actual build, test, route, asset, contrast, content and bundle results.
- Changed: preserved historical trackers now point to current evidence; bug root causes are explicit.
- Status: browser acceptance and Belilena remain open; no false completion claim.
- Files Modified: docs/FINAL_QA.md, BUG_REPORT.md, CHANGELOG.md.

- Final responsive ledger now lists all 131 recorded routes individually at all ten widths in both themes. Files: docs/RESPONSIVE_AUDIT.md.

### Final verification checkpoint
- Build: final production build PASS after all source changes; typechecking included.
- Tests: final full run 14/23 files PASS; only the nine browser files fail.
- Assets: fresh final process smoke checks PASS for health/content, credits, entry JS/CSS and local image fallback. Obsolete QA processes stopped.
- Remaining: browser acceptance blocked and Belilena unresolved; these are recorded without hiding failures.
- Files Modified: docs/FINAL_QA.md, CHANGELOG.md, qa-results/production-smoke.json, route-checks.json, responsive-checks.json.

- Final bundle report retained at qa-results/bundle-report.md; CSS is 15.5 KB gzipped after the last contrast correction. Files: docs/FINAL_QA.md, qa-results/bundle-report.md.

## 2026-10-06 - complete alignment pass

### Root causes
- PageHero last-child width:100% overrode the shared container; percentage/fixed height and layered hero rules competed. Article/404 content and centered section headings used independent grids.
### Changed
- One max-width/gutter/header/reading/section/grid token system. Content-driven compact/detail hero variants; left-aligned bounded headings and CTA groups; stable navbar height.
- Article reading column now starts on the global grid; 404 uses the inner hero system. Homepage section headings and final CTA use shared alignment. Admin main uses the same container within its sidebar shell.
- Removed extra intro text indentation and overlapping old hero layout declarations. Decorative overlays, modal positioning and cursor positioning retained intentionally.
### Files Modified
- src/index.css; PageHero.tsx, HeroSection.tsx, Navbar.tsx, PageCards.tsx, CTASection.tsx, IntroSection.tsx, WhyTravelEye.tsx, TravelPlanner.tsx, ExperiencesSection.tsx, PhotoStorySection.tsx, ToursSection.tsx, InteractiveMapSection.tsx, DestinationSpotlight.tsx, HiddenGemsSection.tsx, FeaturedExperiences.tsx, JournalSection.tsx; ArticlePage.tsx, NotFoundPage.tsx; AdminLayout.tsx.
### Verification
- Implementation complete for this checkpoint; build/SSR and rendered verification pending. No content or database values changed.

### Alignment checkpoint - verification coverage
- Added measurable container rectangles, scroll position and paired theme geometry comparison to the existing browser audit; no PASS is recorded if geometry shifts.
- Admin mobile toolbar now shares the same gutter token as its main content.
- Existing push/replace top reset, history restoration and hash-focus navigation were inspected and retained.
- Files Modified: scripts/audit-site.ts, AdminLayout.tsx, src/index.css.

### Alignment checkpoint - complete route markup coverage
- Expanded the existing public render regression to every published destination, experience, tour and article slug, plus contact/explore/planner/journal hashes and filtered search. Tests remain explicitly markup-only.
- Added an opt-in GPU-disabled Chrome launch to try recovering local QA; browser sandbox is retained and default CI behavior unchanged.
- Files Modified: server/test/public-ui.test.ts, server/test/chrome.ts.

### Alignment checkpoint - route ledger
- Added ALIGNMENT_AUDIT.md covering all concrete public/admin routes plus redirect/error targets, fields and ten-width checks. Recorded source-inspected scroll behavior and intentional modal/admin/reading exceptions.
- Updated DESIGN_SYSTEM.md with alignment tokens and shared primitives.
- Files Modified: docs/ALIGNMENT_AUDIT.md, DESIGN_SYSTEM.md, CHANGELOG.md.

### Alignment checkpoint - final evidence and history
- Build and all published public markup checks PASS; fresh route/protection audit 142/142 PASS.
- GPU-disabled browser attempt still disconnects; every responsive/theme/click check remains NEEDS MANUAL VERIFICATION.
- Registered BUG-029 without deleting older bugs. Updated status, QA, site map and historical tracker links.
- Files Modified: docs/BUG_REPORT.md, codex/BUGS.md, codex/PROJECT_STATUS.md, codex/CHANGELOG.md, FINAL_QA.md, SITE_MAP.md, qa-results/bug-summary.json.

- Verification refinement: paired theme measurements include form controls and section titles, with temporary motion suppression to isolate layout changes. Recorded mathematically expected grid edges for all ten widths without claiming browser measurements. Browser route-click regression attempted and blocked by Chrome. Files: scripts/audit-site.ts, docs/ALIGNMENT_AUDIT.md, qa-results/alignment-expected-grid.json.

### Alignment final checkpoint
- Latest production build, final typecheck and expanded four-test public markup suite PASS.
- Fresh preview restarted at localhost:8087; public shells, health and current entry JS/CSS HTTP smoke PASS.
- No content, destination, price, route or database value changed in this alignment pass.
- Rendered acceptance remains blocked and recorded explicitly; no claim of perfect verified alignment.
- Files Modified: docs/ALIGNMENT_AUDIT.md, CHANGELOG.md, qa-results/alignment-production-smoke.json.

- Alignment bundle measured: shared public entry 144.4 KB JS / 15.7 KB CSS gzipped. FINAL_QA.md updated with the latest scope and preview.

## 2026-10-06 - names below map

### Fixed / UI/UX / Responsive
- API names verified intact. Mobile map card no longer forces badges and long destination CTA into one cramped row; badges wrap as complete labels and the CTA takes its own mobile row.
- Thumbnail text uses available flexible width, region/season metadata wraps, and destination names break at spaces rather than within words.
- Spotlight category labels wrap independently; best-season information has a separate line and destination typography is fluid.
- Gold map CTA uses its correct dark foreground in both themes.
### Files Modified
- src/components/InteractiveMapSection.tsx, DestinationSpotlight.tsx, src/index.css.
### Verification
- Source/API checked. Build and public rendering checks pending; actual rendered geometry remains subject to the known Chrome blocker.

- Follow-up: desktop gold map CTA also uses readable on-accent text; mobile thumbnail is 64px to leave sufficient width for full place names at 320px. Both Explore labels use the shared word-boundary rule. File: InteractiveMapSection.tsx.

- Registered BUG-030 and updated alignment audit/history without deleting old findings. Files: docs/BUG_REPORT.md, codex/BUGS.md, ALIGNMENT_AUDIT.md, qa-results/bug-summary.json.

### Map-name final verification
- Final build/typecheck PASS; public-page and map-marker tests: nine checks PASS across two files; fresh HTTP route/protection audit: 142/142 PASS; all 33 emitted local JS/CSS assets return correct MIME/status; live content API returns 20 intact destination names. Rendered layout remains NEEDS MANUAL VERIFICATION because Chrome disconnects.
- Latest preview restarted at localhost:8087.
- Files Modified: docs/BUG_REPORT.md, codex/BUGS.md, FINAL_QA.md, CHANGELOG.md, qa-results/map-name-debug.json; route/viewport audit evidence refreshed.

2026-10-08 BUG-031 validation: final full build/typecheck and four regression tests PASS. Live API-to-mapper check produces the corrected Jaffna URL and Vite serves the correction. Nonfatal Zod annotation warnings remain; rendered visual confirmation is blocked.

Liquid Glass final validation (2026-10-08): final client/server production build and TypeScript checks PASS, with nonfatal Zod annotation warnings. All 16 focused tests PASS; 10 local HTTP delivery checks PASS. Full-suite and browser limitations remain as recorded above.
