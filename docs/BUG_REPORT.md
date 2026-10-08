# Complete website debugging follow-up — 2026-10-08

## BUG-049 — Unwanted animated cursor

Status: SOURCE FIX VERIFIED; native browser interaction NEEDS MANUAL VERIFICATION. Root cause: TravelCursor mounted for every public page and installed RAF/pointer/scroll work. Deleted component/import/mount and all cursor-specific CSS. Source search clean; native control cursor rules retained. Files/evidence: PublicLayout.tsx, index.css, BUTTON_AUDIT.md.

## BUG-050 — Residual hero glass and heavy overlay composition

Status: FIX IMPLEMENTED; visual acceptance NEEDS MANUAL VERIFICATION. Root cause: glass classes on HeroChip/Home caption and inherited action backdrop/reflections; stacked photo gradients and large inner minimum heights. Plain metadata/controls, lighter neutral directional gradients, Champagne accent, shared transparent top navbar and compact inner heights implemented. Files: PageHero/HeroSection/CTASection/NotFoundPage/Navbar, index.css/glass.css/palette.css. Build/markup PASS; seven widths and actual contrast NOT VERIFIED. See HERO_AUDIT.md.

## BUG-051 — Explore and Destinations share one page identity

Status: FIX IMPLEMENTED; route/markup/history VERIFIED; rendered redirects/clicks NEEDS MANUAL VERIFICATION. Root cause: Explore's hash link activated its underline while the page retained Destinations identity. Existing discovery tools moved to /explore; catalogue stays at /destinations. Server/client compatibility redirects preserve old links/query/hash/state. Explicit current target removes NavLink hash ambiguity. Files/details: NAVIGATION_AUDIT.md. Production statuses/redirects and active-target tests PASS.

## BUG-052 — Manual slideshow can reveal unloaded photograph

Status: FIX IMPLEMENTED by source review; browser timing NEEDS MANUAL VERIFICATION. Root cause: manual controls set current index before image load, and readiness reset only on slide count. HeroSection now holds pending selection until load, exposes busy state and resets on source changes. Existing automatic visibility/reduced-motion/hover/focus/manual pause retained. Build/markup PASS; no browser timer proof.

## BUG-053 — Destination filter labels can shrink and selected edge clips

Status: FIX IMPLEMENTED; rendered responsive acceptance NEEDS MANUAL VERIFICATION. Root cause: nowrap flex buttons lacked shrink-0; selected scale and hidden scrollbar obscured boundaries. Added shrink-0, visible scrollbar and color-only selection transitions. Existing query/filter/pressed/count behavior preserved. File: DestinationsPage.tsx; source/build PASS.

Known blockers remain: guarded test database authentication, Chrome/Edge rendering, missing Git baseline, unavailable Lighthouse, external image generation and unverified Belilena photo/fine editorial captions. Do not close these based on HTTP or fixture tests. Historical IDs/resolutions below retained.

# Performance and full-screen hero findings — 2026-10-08

## BUG-046 — Home header surface and capped viewport

Status: FIX IMPLEMENTED; rendered acceptance NEEDS MANUAL VERIFICATION. Root cause: shared glass header plus clamp(42rem,95svh,56rem). Home-only transparent fixed header, stable height, 100dvh/content-driven hero and short-height spacing implemented. Build/markup PASS. Files/verification: HERO_REDESIGN.md.

## BUG-047 — Delayed photo discovery and oversized delivery

Status: PARTIAL FIX IMPLEMENTED; modern assets/external delivery BLOCKED. Root cause: content gate before image element; Wikimedia lacked srcset. Matched server preload, responsive candidates/original-to-thumbnail delivery and ready/visible slideshow implemented. Tests/HTML PASS; actual LCP identity NOT VERIFIED. WebP pipeline downloads denied. Files/verification: IMAGE_OPTIMIZATION.md.

## BUG-048 — Uncompressed bundles and eager interaction code

Status: FIX IMPLEMENTED; Lighthouse/timing acceptance NOT VERIFIED. Root cause: Express static identity delivery and navbar motion/eager dialogs. Precomputed gzip and code splitting implemented. HTTP equality/cache/MIME/Vary PASS; Home gzip JS 152.5 → 110.0 KiB. No TBT claim. Files/verification: PERFORMANCE_AUDIT.md.

Exact failed SEO/accessibility-tree audits were unavailable. Existing browser/test-DB blockers and historical findings remain below.

# BUG-045 continued verification - 2026-10-08

Source fix remains implemented. Fresh 43/43 route-shell audit and API health PASS. Updated stale audit selector to inspect the open hero wrappers; Edge retry also resets before first viewport. Rendered acceptance remains NEEDS MANUAL VERIFICATION; no new application defect established by this continuation. Historical findings below preserved.

# BUG-045 - Large glass panels on shared page heroes - 2026-10-08

Status: FIX IMPLEMENTED; visual acceptance NEEDS MANUAL VERIFICATION. Problem: Journal/Tours and other page headings were enclosed in large dark blurred rectangles. Root cause: shared PageHero glass3d/glass-hero wrapper and inherited surface/filter/pseudo-element rules; retained CTA banner used the same pattern. Files changed: PageHero.tsx, CTASection.tsx, NotFoundPage.tsx, index.css, glass.css, palette.css, public-ui.test.ts. Fix: plain reading-width wrappers, shared directional photograph gradient, theme-stable foregrounds, obsolete panel CSS removed; small glass components retained. Verification: build PASS, 16 focused tests PASS, all page types/published fixture detail slugs no-panel assertions PASS, CSS parse PASS, 43 route shell HTTP checks PASS. Browser before/after captures BLOCKED before any rendered checks. Detailed root cause/route coverage: HERO_GLASS_REMOVAL.md (../HERO_GLASS_REMOVAL.md from codex).

# Hero/navigation source fixes - 2026-10-08

## BUG-042 - Navigation indicator and section URL state

Status: FIX IMPLEMENTED; rendered acceptance NEEDS MANUAL VERIFICATION. Root cause: presence-based aria-current CSS, shared hover underline, broad hash exclusion, and same-page section URL interception. Fix/files/evidence: NAVIGATION_BUG_REPORT.md (or ../NAVIGATION_BUG_REPORT.md from codex). NavLink explicit active state and section priority; static routes and memory history PASS. Reported visual Home underline could not be reproduced because browser rendering is blocked.

## BUG-043 - Heavy homepage glass text panel

Status: FIX IMPLEMENTED; visual acceptance NEEDS MANUAL VERIFICATION. Root cause: full-panel glass classes and inherited reflection/filter layers. Fix: plain text wrapper, directional photograph overlay, ivory/solid champagne typography, existing container alignment and small retained glass controls. Files/evidence: HERO_DEBUG_REPORT.md. Build and no-panel/Home/CTA markup tests PASS.

## BUG-044 - Slideshow hover and focus pause conflict

Status: FIX IMPLEMENTED by source inspection; rendered timing NEEDS MANUAL VERIFICATION. Root cause: mouse/focus handlers shared one boolean, so mouse leave could resume with focus still inside. Fix: separate hover/focus state; add named previous/next controls using current index with wrap-around. File: src/components/HeroSection.tsx. Control markup/build PASS; actual timer/keyboard/mobile interaction not tested in browser.

# Database restored - 2026-10-08

This entry supersedes the earlier runtime outage below; historical evidence is retained.

VERIFIED: frontend http://127.0.0.1:5173/ returns HTTP 200; backend http://127.0.0.1:8081/api/health reports database up; proxied content API returns HTTP 200. Public route delivery audit passes 43/43 HTML shells. These checks verify delivery, not rendered navigation.

The strict live-fixture comparison passes eight of nine collections. Its destination comparison reports one difference: Jaffna uses the 1280px Wikimedia thumbnail of the same Full_view_of_nallur_front.JPG photograph, while the fixture expects its original URL. Fieldwise comparison found no other destination differences. Existing CMS/database content was preserved. Evidence: docs/qa-results/glass-ui/restored-content-differences.json and the refreshed route/content reports.

Browser software-rendering retry remains BLOCKED by WinError 10054 before any completed viewport or screenshot. Opening the desktop browser was rejected by execution policy because sandbox approval is disabled. All rendered glass balance, photographic contrast, themes, seven-width responsive checks, hover/focus/hit-testing, image decoding and browser-console acceptance remain NEEDS MANUAL VERIFICATION. Review the running site at http://127.0.0.1:5173/.

No application source changed during restoration verification. Previously executed final build, 21 focused tests, 22 fixed-color checks and CSS parsing remain the latest source validation; they were not rerun in this documentation-only pass. Full database test-suite acceptance is separate and was not tested here.

# BUG-001 current environment follow-up - 2026-10-08

Status: BLOCKED again for the current live environment. The configured development database on localhost:5433 now returns ECONNREFUSED; only the PostgreSQL 18 service is currently listed, and localhost:5432 rejects existing credentials. Public content API returns HTTP 500. The user will restore the 5433 database; restoration is not yet verified. Earlier resolved setup history remains preserved. No database/credential change, production fallback or test guard bypass applied.

# Glass follow-up findings - 2026-10-08

## BUG-039 - Shared button position overrides absolute controls

Severity: Medium. FOUND BY STATIC ANALYSIS. Root cause: unlayered position:relative added to .te-button beats layered Tailwind absolute on menu/modal close controls. Files changed: src/index.css, src/styles/glass.css. Fix: positioning moved into @layer components, alongside button geometry. Verification: CSS cascade review; markup/build checks recorded in FINAL_QA.md. Status: FIX IMPLEMENTED; rendered placement NEEDS MANUAL VERIFICATION. This corrects a defect in the previous styling pass.

## BUG-040 - Hover specificity defeats interaction/accessibility states

Severity: Medium. FOUND BY STATIC ANALYSIS. Root cause: chained :not selectors give normal hover greater specificity than active/forced-color rules; reduced transparency's hover still referenced translucent colors. File changed: src/styles/glass.css. Fix: zero-specificity eligibility with :where; stronger pressed state; aria-disabled sheen exclusion; solid context hover tokens. Verification: static cascade review; browser interaction/media emulation NEEDS MANUAL VERIFICATION. Status: FIX IMPLEMENTED.

## BUG-041 - Hero carousel transitions compete

Severity: Low. FOUND BY STATIC ANALYSIS. Root cause: independent transition-opacity and transition-transform utilities set the same property with incompatible durations. Files changed: src/components/HeroSection.tsx, src/styles/glass.css. Fix: one slide rule with explicit opacity/transform durations, data-active and existing reduced-motion fallback. Verification: source/markup checks; rendered crossfade NEEDS MANUAL VERIFICATION. Status: FIX IMPLEMENTED.

Browser software-rendering retry also resets its WebSocket before completing a viewport; the existing browser blocker remains. No claim of balanced photographic contrast, no-overflow, zero console errors or all-image decode is made without rendered evidence.

# Current glass debugging ? 2026-10-08

These source fixes were explicitly authorized. Earlier IDs and evidence remain historical. Each implementation status below is scoped; rendered acceptance remains NEEDS MANUAL VERIFICATION.

## BUG-035 ? Conflicting glass/palette/hero appearance

Severity: Medium. Problem: competing palettes and dark overlays produced inconsistent photographic lenses. Root cause: color tokens redefined in index.css/palette.css; different glass implementations, dark inverse fills and duplicated hero overrides. Files changed: src/index.css, src/styles/palette.css, src/styles/glass.css, src/styles/glass3d.css, src/components/PageHero.tsx, src/components/HeroSection.tsx, src/components/CTASection.tsx. Fix: single semantic token owner, neutral photo channels, unified bounded hero lens, direct surface backdrop, retained inset edges/noise, breadcrumbs inside protected panel. Verification: four CSS files parse; build/typecheck PASS; all public fixture page types render. Status: FIX IMPLEMENTED; visual balance/crops/contrast NEEDS MANUAL VERIFICATION.

## BUG-036 ? Button styling and hover conflict

Severity: Medium. Problem: primary/secondary/outline actions and their hover colors belonged to different systems. Root cause: global gold fills, higher-specificity home secondary fill, redundant utility gradients/colors and independent icon transformations. Files changed: shared CSS plus HeroSection, Navbar, ThemeToggle, Footer, InquiryForm, PlanCard, QuickSearch, ToursSection, TravelPlanner, HiddenGemsSection, InteractiveMapSection, InquiryModal, SearchModal, PhotoStorySection and NotFoundPage. Fix: contextual primary/secondary/outline/icon variants, stable labels, 220ms transitions, no icon scaling; remaining reset/quote/save/WhatsApp/close/map actions normalized. Verification: 22/22 sampled fixed color pairs meet 4.5:1 mathematical contrast; 32 relevant regression tests PASS. Status: FIX IMPLEMENTED; actual hover/click/focus/touch NEEDS MANUAL VERIFICATION.

## BUG-037 ? Semantic button display defeats responsive visibility

Severity: Medium. FOUND BY STATIC ANALYSIS: unlayered `.te-button {display:inline-flex}` overrides layered Tailwind `hidden` regardless of source order, risking navbar duplicates/overflow. Files changed: src/index.css, src/components/Navbar.tsx. Fix: base display/sizing in `@layer components`, below utility layer; shared icon targets do not shrink. Verification: CSS/layer review and build PASS; no completed browser viewport. Status: FIX IMPLEMENTED; 320?1920px navigation geometry NEEDS MANUAL VERIFICATION.

## BUG-038 ? Dark filter hover and badge label contrast

Severity: Medium. FOUND BY STATIC ANALYSIS: white/gold labels on the requested pale dark-theme teal accent have insufficient contrast. Files changed: palette.css, DestinationsPage.tsx, InteractiveMapSection.tsx, TravelPlanner.tsx. Fix: neutral filter hover surface with main foreground, light/dark on-secondary count token, controlled inverse-raised map category badge. Verification: static review/build/markup PASS; filtered/selected rendered colors NEEDS MANUAL VERIFICATION. Status: FIX IMPLEMENTED.

Existing browser blocker BUG-017 remains relevant: Node CDP disconnect, Python WebSocket reset and direct Chrome GPU fatal exit. These are not new application runtime defects. No zero-console-error or all-image-loading claim is made. Existing Belilena/editorial photograph questions remain open; photos were preserved in this pass. Test database/full backend integration and external R2/Resend are not retested by the UI pass.

# Current follow-up — 2026-10-08

## BUG-032 — Excessive homepage composition

Status: FIX IMPLEMENTED; markup VERIFIED; browser interactions BLOCKED.
Root cause: fourteen explicitly rendered Home blocks, not duplicated React Router Outlets. Home now renders three sections/four discovery links. Unique map, planner and journal content was relocated; existing full listings/details are retained. ROUTE_AUDIT.md and HOMEPAGE_RESTRUCTURE.md record route/link changes. Dedicated markup tests pass.

## BUG-033 — Legacy backend bypasses credited photo migration

Status: FIX IMPLEMENTED; API-to-mapper and guard tests VERIFIED; rendered loading BLOCKED.
The active API still serves old seeds. Shared exact-record compatibility corrections now cover 58 primary references/two galleries and server share images; admin replacements are preserved. No database writes. Jaffna retains the BUG-031 original-image correction. Loading/crops are not signed off.

## BUG-034 — Photo-story location and fine caption associations

Status: GEOGRAPHIC LABEL FIX IMPLEMENTED; fine caption review remains OPEN.
Tea-worker source is Nuwara Eliya versus old Hatton label; fishermen source is Ahangama versus old Koggala/Weligama label. Both labels now use guarded corrections preserving owner edits. Several editorial captions still imply unverified time, color or animal pose. Exact fine-caption review remains outstanding; Belilena remains the earlier tracked open image issue. See IMAGE_AUDIT.md.

Current blockers supersede historical health claims below: configured test database rejects authentication; Chrome/Edge DevTools disconnect; downloaded workspace has no Git history. No all-browser or full-suite PASS is claimed.

# Travel Eye bug report

## BUG-031 - Jaffna legacy photo and image retry

Status: FIX IMPLEMENTED; rendered verification pending.
Local API verified to serve Jaffna's old Unsplash seed URL. The mapper now replaces only that exact Jaffna seed image with the existing credited Nallur original; admin replacements and other records are preserved. TravelImage now retries the saved source after a responsive failure and avoids duplicate original requests. Four focused regression tests PASS. External original fetched by web tool; shell HTTPS and Chrome rendering are BLOCKED. No database changes.

2026-10-06. Historical IDs are retained; this ledger records current evidence without deleting old findings. FIXED is scoped to the recorded test, not a blanket browser sign-off.

Total: 30; Critical: 0; High: 4; Medium: 20; Low: 6.

## BUG-001 - Local test environment missing

Page: Setup
Component: Setup
Severity: High
Problem: Database/environment unavailable
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Database/environment unavailable
Root Cause: Missing local database readiness and environment configuration
Fix: Local PostgreSQL configured and migrated
Files Changed: README.md, .env.example, migrations
Verification: Database-backed tests and live API passed
Status: FIXED

## BUG-002 - Git-dependent screenshot baseline unavailable

Page: Browser baseline
Component: Browser baseline
Severity: Medium
Problem: Snapshot has no Git metadata
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Snapshot has no Git metadata
Root Cause: Browser baseline depends on missing Git metadata
Fix: Preserved original .audit-baseline; do not fabricate Git history
Files Changed: server/test/browser-home-baseline.test.ts
Verification: No Git repository; baseline browser test cannot be signed off
Status: OPEN

## BUG-003 - Onboarding environment readiness unclear

Page: README
Component: README
Severity: Low
Problem: Setup readiness/duplicated example entries unclear
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Setup readiness/duplicated example entries unclear
Root Cause: Setup lacked explicit readiness guidance
Fix: Clarified setup and environment examples
Files Changed: README.md, .env.example
Verification: Static documentation review and successful local database startup
Status: FIXED

## BUG-004 - TLS server authentication disabled

Page: Database connection
Component: Database connection
Severity: High
Problem: All TLS modes disabled certificate verification
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): All TLS modes disabled certificate verification
Root Cause: TLS builder set rejectUnauthorized false for every SSL mode
Fix: Require trusted certificates; explicit local-only no-verify exception
Files Changed: shared/pg-connection.ts, server/test/connection-policy.test.ts
Verification: connection-policy tests: 2 PASS; remote trusted-CA deployment not tested
Status: FIXED

## BUG-005 - Newsletter false success

Page: Footer/API
Component: Footer/API
Severity: Medium
Problem: Success shown without persistence
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Success shown without persistence
Root Cause: Client displayed success without a persistence endpoint
Fix: Validated persisted subscription endpoint and honest errors
Files Changed: Footer.tsx, server newsletter endpoint, migration 0009
Verification: Engineering newsletter integration tests PASS; browser flow pending
Status: FIXED

## BUG-006 - Planner ignored preferences and fake save

Page: Home planner
Component: Home planner
Severity: Medium
Problem: Unrelated suggestions and nonpersistent saving
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Unrelated suggestions and nonpersistent saving
Root Cause: Planner used fixed suggestions and nonpersistent save presentation
Fix: Published-content preference selection and guarded local storage
Files Changed: TravelPlanner.tsx, shared planner helpers
Verification: Planner logic tests PASS; rendered interaction pending
Status: FIXED

## BUG-007 - Modal keyboard lifecycle missing

Page: Public dialogs
Component: Public dialogs
Severity: Medium
Problem: No complete focus trap, Escape and focus return
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): No complete focus trap, Escape and focus return
Root Cause: Dialogs omitted shared focus lifecycle handling
Fix: Shared modal focus lifecycle and inert background
Files Changed: useModalFocus.ts, SearchModal.tsx, BookingModal.tsx
Verification: Implementation reviewed; keyboard browser unavailable
Status: NEEDS MANUAL VERIFICATION

## BUG-008 - Form labels not associated

Page: Public forms
Component: Public forms
Severity: Medium
Problem: Visible controls lacked proper labels
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Visible controls lacked proper labels
Root Cause: Form labels were not associated with control IDs
Fix: Associated labels and named controls
Files Changed: InquiryForm.tsx, QuickSearch.tsx, Footer.tsx
Verification: Public UI markup label checks PASS
Status: FIXED

## BUG-009 - Saved editor row could remain stale

Page: Admin editor
Component: Admin editor
Severity: Medium
Problem: Cache retained pre-save row
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Cache retained pre-save row
Root Cause: Editor mutation did not replace the cached record
Fix: Cache exact returned saved row
Files Changed: RecordEditorPage.tsx
Verification: Database save works; reopen editor browser check blocked
Status: NEEDS MANUAL VERIFICATION

## BUG-010 - Revision precision lost

Page: Admin content/inquiries API
Component: Admin content/inquiries API
Severity: Medium
Problem: Timestamp tolerance accepted obsolete revisions
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Timestamp tolerance accepted obsolete revisions
Root Cause: Timestamp tolerance lost microsecond revision precision
Fix: Exact six-digit timestamp comparison and serialization
Files Changed: server content and inquiry repositories
Verification: Database integration rejects one-microsecond stale revision
Status: FIXED

## BUG-011 - Search hid published matches

Page: Search dialog
Component: Search dialog
Severity: Low
Problem: Result truncation and whitespace handling
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Result truncation and whitespace handling
Root Cause: Search sliced valid results and did not trim terms
Fix: Render all published matches and trim search
Files Changed: SearchModal.tsx
Verification: All 20 published destination links in SSR test PASS
Status: FIXED

## BUG-012 - Day ten formatted Day 010

Page: Planner
Component: Planner
Severity: Low
Problem: Leading zero applied to every day
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Leading zero applied to every day
Root Cause: Leading zero was concatenated instead of numeric padding
Fix: Two-digit padding only
Files Changed: TravelPlanner.tsx
Verification: Source reviewed; rendered output not tested
Status: NEEDS MANUAL VERIFICATION

## BUG-013 - Earlier credential rotation unconfirmed

Page: Environment
Component: Environment
Severity: High
Problem: Prior session recorded exposed credential concern
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Prior session recorded exposed credential concern
Root Cause: No evidence of earlier credential rotation
Fix: Confirm rotation outside this UI quality pass; no secret reproduced
Files Changed: Local environment; historical tracker
Verification: No evidence of credential rotation in this session
Status: OPEN

## BUG-014 - Unset footer URLs appeared clickable

Page: Footer
Component: Footer
Severity: Low
Problem: Unset links retained interactive presentation
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Unset links retained interactive presentation
Root Cause: Unset targets retained link-like presentation
Fix: Render honest non-link text for unset targets
Files Changed: Footer.tsx
Verification: Source reviewed; browser usability pending
Status: NEEDS MANUAL VERIFICATION

## BUG-015 - Travel timing ignored

Page: Quick discovery
Component: Quick discovery
Severity: Medium
Problem: Selected time did not affect discovery
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Selected time did not affect discovery
Root Cause: Selected season was not consumed by destination filtering
Fix: Season-aware destination filtering
Files Changed: QuickSearch.tsx, discovery helpers
Verification: Wrapped and multi-season logic tests PASS
Status: FIXED

## BUG-016 - Secondary dialogs lacked focus lifecycle

Page: Map/mobile/admin dialogs
Component: Map/mobile/admin dialogs
Severity: Medium
Problem: Dialog lifecycle inconsistent
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Dialog lifecycle inconsistent
Root Cause: Secondary dialogs omitted focus lifecycle handling
Fix: Apply shared focus management to secondary dialogs
Files Changed: InteractiveMapSection.tsx, Navbar.tsx, admin drawers
Verification: Keyboard browser check blocked
Status: NEEDS MANUAL VERIFICATION

## BUG-017 - Browser helper hung on disconnect

Page: Test helper
Component: Test helper
Severity: Medium
Problem: CDP requests could remain pending
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): CDP requests could remain pending
Root Cause: Pending CDP commands were not rejected on Chrome disconnect
Fix: Reject pending commands when Chrome disconnects
Files Changed: server/test/chrome.ts
Verification: Final browser failures return explicit disconnect errors rather than hang
Status: FIXED

## BUG-018 - Production build resolved inaccessible ancestor

Page: Build
Component: Build
Severity: Medium
Problem: Bundler subprocess failed in restricted environment
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Bundler subprocess failed in restricted environment
Root Cause: Bundler resolved through inaccessible parent directories
Fix: Vite runner loader and Rollup SSR server build
Files Changed: package.json, scripts/build-server.mjs
Verification: npm run build PASS
Status: FIXED

## BUG-019 - Header and badges wrapped poorly

Page: Navigation/cards
Component: Navigation/cards
Severity: Medium
Problem: Narrow intermediate layouts insufficient
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Narrow intermediate layouts insufficient
Root Cause: Header controls lacked intermediate responsive layout
Fix: Responsive header breakpoint, mobile logo and wrapping rules
Files Changed: Navbar.tsx, Logo.tsx, index.css
Verification: No rendered width measurement available
Status: NEEDS MANUAL VERIFICATION

## BUG-020 - Animation and image work excessive

Page: Counter/images
Component: Counter/images
Severity: Medium
Problem: Animation work and image requests unnecessarily heavy
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Animation work and image requests unnecessarily heavy
Root Cause: Oversized image requests and unbounded animation work
Fix: rAF animation, responsive image requests and loading strategy
Files Changed: TravelImage.tsx, WhyTravelEye.tsx
Verification: Source performance review; browser timing unavailable
Status: NEEDS MANUAL VERIFICATION

## BUG-021 - Repeated quick search could retain stale state

Page: Discovery
Component: Discovery
Severity: Low
Problem: Identical/repeated navigation did not update controlled filters
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Identical/repeated navigation did not update controlled filters
Root Cause: Repeated navigation did not synchronize controlled filter state
Fix: Sync repeated search and URL filter state
Files Changed: QuickSearch.tsx, DestinationsPage.tsx
Verification: Implementation reviewed; repeated click flow blocked
Status: NEEDS MANUAL VERIFICATION

## BUG-022 - Named photographs mismatched destinations/themes

Page: All named photography
Component: All named photography
Severity: High
Problem: Generic reused stock photos did not match locations
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Generic reused stock photos did not match locations
Root Cause: Seed records reused unrelated stock images across named locations
Fix: 58 exact primary corrections and two guarded gallery corrections
Files Changed: shared/travel-photos.json, photo-corrections.ts, migration 0010, IMAGE_AUDIT.md
Verification: Metadata mapping and migration tests PASS; Belilena OPEN; rendered review blocked
Status: IN PROGRESS

## BUG-023 - Homepage containers and hero lacked alignment

Page: Home
Component: Home
Severity: Medium
Problem: Inconsistent grid edges and weak hero alignment
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Inconsistent grid edges and weak hero alignment
Root Cause: Sections used inconsistent container widths and hero bounds
Fix: Shared fluid container, bounded hero text and discovery layout
Files Changed: HomePage.tsx, HeroSection.tsx, QuickSearch.tsx, index.css
Verification: Build/SSR PASS; visual widths blocked
Status: NEEDS MANUAL VERIFICATION

## BUG-024 - Missing complete persistent theme control

Page: All routes
Component: All routes
Severity: Medium
Problem: No usable light/dark preference system
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): No usable light/dark preference system
Root Cause: Missing shared semantic theme preference and initialization
Fix: Semantic themes, system default, saved choice and header toggle
Files Changed: theme.ts, ThemeToggle.tsx, theme-init.ts, index.css
Verification: Theme policy tests PASS; actual toggle/persistence browser blocked
Status: NEEDS MANUAL VERIFICATION

## BUG-025 - Cursor hover state stale after scrolling

Page: Desktop cursor
Component: Desktop cursor
Severity: Medium
Problem: Hover target could remain stale when page scrolled
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Hover target could remain stale when page scrolled
Root Cause: Cursor hover detection depended only on pointer movement
Fix: Re-hit-test pointer on scroll and pointer entry; theme-aware layers
Files Changed: TravelCursor.tsx, index.css
Verification: Capability guards and rAF reviewed; real movement blocked
Status: NEEDS MANUAL VERIFICATION

## BUG-026 - Keyless map lacked actual basemap

Page: Map
Component: Map
Severity: Medium
Problem: No CARTO key prevented working tile background
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): No CARTO key prevented working tile background
Root Cause: Basemap assumed an optional CARTO key was available
Fix: Use attributed OSM tile fallback while retaining keyed CARTO
Files Changed: shared/map-tiles.ts, mapTiles.ts, security-headers.ts
Verification: Map provider logic tests PASS; external tiles untested
Status: NEEDS MANUAL VERIFICATION

## BUG-027 - Failed content section silently disappeared

Page: Shared section
Component: Shared section
Severity: Medium
Problem: Errors returned null with no recovery UI
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Errors returned null with no recovery UI
Root Cause: Error boundary returned null rather than recovery UI
Fix: Accessible error state and retry control
Files Changed: Section.tsx
Verification: Build/SSR PASS; forced client error interaction pending
Status: NEEDS MANUAL VERIFICATION

## BUG-028 - Stock author portraits implied incorrect identity

Page: Journal/articles
Component: Journal/articles
Severity: Low
Problem: Unverifiable stock faces represented named authors
Expected Behavior: Accurate, reliable and usable behavior for the described feature.
Actual Behavior (baseline): Unverifiable stock faces represented named authors
Root Cause: Stock portrait fields were shown as real author likenesses
Fix: Preserve credit through initials; retain stored fields
Files Changed: AuthorAvatar.tsx, JournalSection.tsx, ArticlePage.tsx
Verification: Author SSR check preserves initials and has no img
Status: FIXED

## BUG-029 - Inner hero ignores global container width

Page: Every PageHero list/detail/about/credits route
Component: PageHero / shared CSS
Severity: Medium
Problem: Inner hero content spans the viewport while navigation and sections use the global grid.
Expected Behavior: Hero breadcrumbs, title and subtitle share the navbar/section container edges.
Actual Behavior (baseline): A later width:100% declaration replaced the te-container width on the final hero child.
Root Cause: .te-page-hero > div:last-child overrode the shared width, combined with competing fixed/percentage-height rules.
Fix: Remove the override and legacy height dependencies; use container-bound content and token-driven compact/detail variants.
Files Changed: src/components/PageHero.tsx, src/index.css
Verification: Build and expanded public markup tests PASS; real bounding rectangles blocked by Chrome disconnection.
Status: NEEDS MANUAL VERIFICATION

## BUG-030 - Place labels below map break in narrow layouts

Page: Home /#explore-map and destination spotlight
Component: Mobile map detail card / DestinationSpotlight
Severity: Medium
Problem: User reported broken names below the map; constrained rows compressed category/season labels and long Explore destination text.
Expected Behavior: Full destination names remain readable; metadata wraps independently and CTAs fit mobile width.
Actual Behavior: A non-wrapping category/CTA row and competing thumbnail/text widths left insufficient room; spotlight metadata also shared one crowded row.
Root Cause: Fixed thumbnail and non-shrinking long CTA competed with badges; metadata lacked wrapping boundaries. Global word-break fallback could split labels.
Fix: Separate mobile action row, wrapping whole badges/metadata, flexible text column, smaller mobile thumbnail, word-boundary place-name styling, fluid spotlight title and readable gold CTA foreground.
Files Changed: src/components/InteractiveMapSection.tsx, src/components/DestinationSpotlight.tsx, src/index.css
Verification: Final build/typecheck PASS; public-page and map-marker tests: nine checks PASS across two files; fresh HTTP route/protection audit: 142/142 PASS; all 33 emitted local JS/CSS assets return correct MIME/status; live content API returns 20 intact destination names. Rendered layout remains NEEDS MANUAL VERIFICATION because Chrome disconnects.
Status: NEEDS MANUAL VERIFICATION

### BUG-030 follow-up - 2026-10-07

Static analysis found the map quick-jump row removed its right bound on desktop and allowed its location buttons to shrink. Fixed both constraints, exposed horizontal scrolling, and added pressed-state/focus cues. Production build/typecheck and all nine public-ui/map-marker checks PASS. Local content endpoint returns HTTP 200. Rendered visual verification remains pending.
