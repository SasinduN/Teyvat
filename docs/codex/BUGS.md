# BUG-076 — Unknown saved URLs bypass named destination correction — FIX IMPLEMENTED 2026-10-14

FOUND BY STATIC ANALYSIS: publicPhoto corrected only recognized seed URLs, leaving unrelated CMS primary images visible under existing destination names. The owner requested exact named-location imagery. All 20 mapped destination covers now resolve by stable ID to the existing credited local photograph regardless of stored URL. The same helper serves public content and share metadata. This intentionally supersedes unknown-primary-image preservation for these 20 IDs; galleries, new destination IDs and other collections retain their prior behavior. Admin rows are not rewritten. Not evidence that every deployed image was wrong. Verification recorded in PROJECT_STATUS.md; production content/rendering not inspected.

# BUG-072 — Book Your Ride H1 inherits regular weight — FIX IMPLEMENTED 2026-10-13

Static source: ride H1 lacked font-bold/explicit weight and overrode shared heading-page sizing. Shared supported 700 display weight, leading/tracking and layout tokens now apply. Build and focused regressions pass; rendered measurements/screenshots and exact form-fixture limits: ../TYPOGRAPHY_AUDIT.md and ../FINAL_QA.md.

# BUG-073 — Exact seed URL matching and external photo delivery — FIX IMPLEMENTED 2026-10-13

Static source: complete-URL equality let sizing/query order bypass named seed correction; generic seed sources reused across places; independent IntroSection stock paths; local Sigiriya variants not registered; unmapped Commons URLs violate production image policy. Known host/path seed identity and shared same-photo local assets/metadata now cover all 20 main destinations. Unknown owner images preserved; no DB writes. The reported Ella beach mismatch was NOT REPRODUCED in active local API/Chrome; deployment-specific CMS content remains uninspected. Evidence: ../DESTINATION_IMAGE_AUDIT.md. Extends BUG-033 without erasing historical evidence.

# BUG-074 — Photo subject/geography contradicts original labels — FIX IMPLEMENTED 2026-10-13

Verified source/pixels: Gal Oya cover depicted Ekgal Oya reservoir. Guarded replacement now depicts identified Gal Oya National Park/Senanayake Samudraya. Original scene captions falsely described train/fog, dusk, resting leopard and evening rituals; corrections are guarded by photo identity and exact original copy. Extends BUG-034. Existing Belilena issue remains OPEN: no licensed identified photo; unverified seed now honest placeholder. Source/rights/manual gaps: ../DESTINATION_IMAGE_AUDIT.md.

# BUG-075 — Local booking-attempt schema lacks action — RESOLVED LOCALLY 2026-10-13

Follow-up owner-authorized repair: migration 0016 upgrades the legacy IP-only table, retaining counters/windows for session/create/change and restoring the composite primary key. Applied to guarded local DB. Real Chrome 5173 form initialization and actual session/history HTTP 200 verified without fixtures; 18 focused tests pass. Car and SUV now enabled locally with owner-confirmed 5 passengers/3 bags each; browser confirms enabled request button. Build/typecheck and migration idempotence pass. No live ride submission or production deployment verified. The original image-audit evidence below is historical.

VERIFIED read-only: public.booking_attempts columns are ip, attempts, window_started; current guest-session limiter inserts/conflicts on ip/action. Local server logs PostgreSQL 42703 from overLimit; actual booking screenshots show Something went wrong / Loading ride options. Catalogue and ride-account GETs return 200. No schema, credentials, booking backend, migrations or test guards changed during this scoped image/type task. Form-layout QA uses browser-only successful session and empty history with real catalogue/account reads; not live persistence verification. Repair this local database compatibility issue in a separate authorized backend/environment task.

# BUG-071 — Map becomes dark with the website theme — RESOLVED IN LOCAL CHROME 2026-10-13

Owner requested the basemap remain light. FOUND BY STATIC ANALYSIS: keyed provider selected dark_all in dark mode, and Explore applied a different dark-only tile filter. Shared selection now retains Voyager/OSM light tiles and the existing light tint; theme toggles no longer reset tile URLs. Site theme, controls and marker behavior preserved. VERIFIED: production build/typecheck and 15 focused tests PASS, including Chrome map/theme toggle regression. Detailed limits: ../FINAL_QA.md. No production deployment yet.

# BUG-070 - WhatsApp decorative shadow and inherited focus glow - RESOLVED 2026-10-12

User requested official green/white flat styling. Static inspection found a gold border and decorative shadow; rendered testing additionally found the shared public focus rule restored a 6px shadow. Scoped WhatsApp CSS now removes both while preserving a visible 3px theme-aware outline, 56px touch target and all shared collisions. Final 16 focused tests PASS across three files, including 18 width/theme appearance checks. Evidence: ../FINAL_QA.md. No unrelated shadows removed.
# BUG-069 - PR #39 CI harness expectations and screenshot setup - FIXED 2026-10-12

FOUND BY CI run 38206020761: missing screenshot directory (ENOENT), obsolete baselines for four owner-authorized cleanup sections, and stale WhatsApp colour exception. Fixes create the output directory, pin changed sections to 4129cd4 and remove the exception without relaxing comparisons. Local run also revealed a blinking-caret difference in unchanged SearchModal; screenshot-only caret normalization added. Original application behavior preserved. Verification and explicit Windows cleanup limitation: PROJECT_STATUS.md. Remote rerun pending.
# BUG-068 - Floating booking CTA obscures card content - RESOLVED 2026-10-12

Owner reported Discover Experience and destination-card overlap. Separate fixed controls plus incomplete keep-clear selectors left card photos/text/actions unprotected. A shared FloatingActions stack now owns spacing and visibility, protects complete cards and important controls and safely transfers focus before hiding a focused link. Booking/chat destinations, feature flag and other current-main safeguards preserved. Exact PR-branch verification: ../FINAL_QA.md; full mechanics: ../FLOATING_CTA_ALIGNMENT_FIX.md. Prior records/resolutions retained below.

# BUG-060 — WhatsApp floats over the open mobile navigation

Status: RESOLVED in Chrome, 2026-10-12. Static inspection found the shared z-index and later floating-button DOM could place WhatsApp above the mobile navigation, with no menu keep-clear target. Added #mobile-navigation to its overlap protection. Rendered tests verify both floating links hide while the actual menu is open; independent messages, links and settings remain. Source/QA: ../FLOATING_BOOKING_CTA.md and ../FINAL_QA.md.

# BUG-061 — Windows Chrome startup port-file lock

Status: OPEN test-harness limitation, 2026-10-12. A browser run failed in its before hook with EBUSY reading DevToolsActivePort while Chrome was starting. Existing launch helper checks existence then reads without retrying transient file locks. The subsequent standalone WhatsApp rerun passed all eight tests. Application behavior is not implicated; startup-driver hardening is outside this public UI task. Failed attempt evidence retained in ../FINAL_QA.md.

# BUG-058 — Cached hero photograph never becomes ready again

Status: RESOLVED in Chrome, 2026-10-12. QA reproduced Previous stuck busy although the first image was decoded (naturalWidth 1280). Static comparison confirms the unchanged pre-existing source-reset effect could clear readySlides after onLoad, with no second event for a cached DOM image. Preserve verified matching-image readiness during reset; retain image-load gating. Previous, Next, pause holding the frame and automatic resume all passed after the fix. Initial browser failures and diagnostic evidence are in ../FINAL_QA.md.

# BUG-059 — Header controls clipped at 320px

Status: RESOLVED in Chrome, 2026-10-12. The 320px screenshot showed the last mobile header control clipped. Compact container/logo/gap spacing below 376px retains all controls and 44px touch targets. Rules are unlayered so utility gap does not override them; the container uses full width with 8px insets to avoid adding padding to an already inset column. Verified all four controls fit at 320px and the eight-width suite passes. No navigation action removed.

# BUG-057 — Production policy blocks the booking GPS button

Status: RESOLVED in local production checks, 2026-10-12. Static inspection found global `Permissions-Policy: geolocation=()` prevented the user-triggered booking GPS flow in the production document. Permit `geolocation=(self)` for /booking only; retain denied permissions elsewhere, click-only acquisition and manual fallback. Rendered GPS success/denial and production header regression checks passed; evidence is recorded in ../FINAL_QA.md. Physical device permissions NOT TESTED. Historical bug IDs/resolutions retained below.

# BUG-056 PR #37 follow-up — 2026-10-11

Initial GitHub CI passed 35/39 files; stock-photo/CARTO-only expectations failed in browser-csp, browser-theme, image-credits and pages tests. An actual defect also retained superseded stock-photo credits in the corrected public payload. Filter by final used photos and add a database regression. Existing tests updated for authorized provider/photo behavior; no checks skipped or visual baselines replaced. Follow-up implementation complete; GitHub acceptance pending. Local database test connection BLOCKED by 28P01.

# BUG-055 — Local map displays watermark tiles without a CARTO key

Status: RESOLVED for the local runtime, 2026-10-11. The cloned environment has no VITE_CARTO_KEY; CARTO requires one. Added an attributed OpenStreetMap fallback for missing/blank keys, preserving keyed light/dark CARTO styles. Production CSP allows the exact fallback host. VERIFIED: three tile-selection/CSP tests, five marker tests, build, and Chrome map rendering with 20 markers and nine loaded tiles. Keyed CARTO live requests NOT TESTED.

# BUG-056 — Cloned site shows older stock photos instead of local corrections

Status: RESOLVED for checked local pages, 2026-10-11. GitHub migration 0013 reverted named Wikimedia photos to stock seeds; the original folder's exact-record corrections and WebP assets were absent from the clone. Restored corrections at the public API boundary, copied 40 existing assets, preferred local variants, supplied source/licence credits, and aligned share metadata. Exact admin replacements remain intact; no database photo writes. VERIFIED: three photo tests and browser image decoding across Home, Explore, Destinations, Ella detail, Experiences, Tours, Journal and Photo Credits. Authenticated admin actions and other detail pages NOT TESTED.

# BUG-054 — Backend/frontend route split breaks CI and navigation

Status: FIX IMPLEMENTED; GitHub acceptance pending. PR #11 advertised routes absent from its frontend and changed frozen Navbar links. Restored step-1 route contracts and deferred new routes to step 2; kept visual baselines and all checks. Local build/typecheck/round-trip PASS; local test DB authentication BLOCKED. Exact failure evidence and root cause: ../CI_PR11.md.

# Complete website debugging findings — 2026-10-08

BUG-049 custom cursor: component/listeners/RAF/CSS removed; source verified. BUG-050 residual hero glass/overlay/height: plain metadata/actions, lighter directional gradients and inner header integration implemented; rendered acceptance pending. BUG-051 route identity: separate Explore discovery page and Destinations catalogue with legacy compatibility, active/current matching implemented; HTTP/markup/history PASS. BUG-052 manual slide readiness: pending image gating/source resets implemented; rendered timing pending. BUG-053 shrinking/scaled filters: shrink-0/visible scrollbar/color-only transitions implemented; responsive acceptance pending.

Detailed problem → root cause → files → fix → evidence in ../BUG_REPORT.md and requested audit reports. 28 focused tests PASS; full suite 8/27 files PASS, with 19 infrastructure/baseline failures retained. No DB credentials/migrations/test guards changed. Existing Belilena, browser/Lighthouse and guarded DB blockers remain. Historical findings retained below.

# Full-screen/performance findings — 2026-10-08

BUG-046: Home shared glass surface/capped viewport — FIX IMPLEMENTED; rendered acceptance NEEDS MANUAL VERIFICATION. BUG-047: delayed initial photo discovery/oversized images — PARTIAL FIX IMPLEMENTED; external fetch/modern assets BLOCKED, actual LCP node unknown. BUG-048: uncompressed bundles/eager navbar/dialog JS — FIX IMPLEMENTED; HTTP/bundle evidence PASS, Lighthouse/TBT unverified.

Detailed problem → root cause → files → implementation → verification in ../BUG_REPORT.md, ../HERO_REDESIGN.md, ../IMAGE_OPTIMIZATION.md and ../PERFORMANCE_AUDIT.md. Final build/17 tests/42 production routes PASS. No database writes or test guard changes. Existing IDs/history retained below.

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

# BUG-001 runtime restoration verified - 2026-10-08

Status: RESOLVED for the current development runtime. Following the user restoring PostgreSQL on port 5433, API health reports database up, content returns HTTP 200, and 43/43 public route shells pass. Earlier outage evidence remains historical. No credentials or database configuration changed in this verification. This does not resolve or verify the separate guarded test-database authentication issue. Browser rendering remains BLOCKED.

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

## 2026-10-08 — Homepage/routing and active legacy photos

BUG-032: Excessive Home composition fixed with three sections; markup verified. BUG-033: Active backend legacy photos now receive exact named corrections in client/share-image resolver; guard tests and API-to-mapper comparison verified. BUG-034: Two photo-story geographic labels corrected; fine caption/visual review remains open. Belilena remains unresolved. Existing BUG-001/002 and browser execution restrictions remain blockers. See ../BUG_REPORT.md and ../FINAL_QA.md; no production database substitution or writes were performed.

# Current evidence - 2026-10-06 quality pass

The authoritative current ledger is [BUG_REPORT](../BUG_REPORT.md); final evidence is [FINAL_QA](../FINAL_QA.md). Build passes; local database is available; photo migration applied. Browser checks remain blocked and Belilena unresolved. Earlier entries below are preserved as dated history and are superseded where the current ledger records newer evidence.

# Bug Tracker

## 2026-10-08 - Current validation of existing environment blockers

BUG-001 remains open: environment values now exist, but the configured local test-database password is rejected; 16 of 24 existing test files encounter database authentication failure. BUG-002 remains open: the browser inquiry baseline still fails because this downloaded copy lacks Git history. Browser-image and boundary checks encounter existing esbuild filesystem restrictions. Separate Chrome/Edge glass checks disconnect during DevTools commands. These are VERIFIED prerequisite failures, not evidence of rendered glass defects. Native scrollbar appearance, geometry and browser interactions remain NOT TESTED/BLOCKED.

## BUG-031 - Jaffna legacy photo and skipped responsive-source retry

**Status:** Fix implemented; rendered verification pending
**Severity:** Medium
**Area:** Public photographs

User reported Jaffna's missing photograph. VERIFIED: local API serves the legacy Unsplash URL, not the credited replacement in migration 0010. The credited Nallur original was fetched through the web tool; direct shell HTTPS is blocked. FOUND BY STATIC ANALYSIS: TravelImage skipped the saved source after a responsive candidate failed, immediately showing a placeholder for photos without a catalog entry.

Fix: map only Jaffna's exact legacy seed image to its already-credited original, preserving admin replacements and other destinations. Retry the saved source after responsive failure, then a distinct credited original before the placeholder. Keep existing layout. Browser rendering is BLOCKED by Chrome disconnecting during a DevTools command. No database writes performed.

## 2026-10-07 - Map follow-up findings

- Selected quick-jump buttons could remain outside the horizontally visible row. Fixed by scrolling the row to the selected button; browser geometry has not been verified.
- Season/content changes updated markers but skipped map framing when the category was unchanged. Fixed by also tracking the filtered destination list before skipping a fit. Found by static analysis; interactive browser behavior has not been verified.


# 2026-10-06 — Evidence-based re-audit

Existing BUG-001–003 are retained as historical records. BUG-001 is an environment blocker, not proof of a code defect. BUG-002 is confirmed by missing Git metadata and static baseline dependencies; the current browser run did not reach every baseline comparison. BUG-003 remains LOW as an onboarding/documentation follow-up, not evidence that failing to follow setup instructions is an application bug. No bugs were fixed in this task.

## BUG-004 — Database TLS connections do not authenticate the server

**Status:** Open  
**Severity:** HIGH  
**Area:** Security  
**Files:** `shared/pg-connection.ts`

### Problem
Every non-disable sslmode becomes rejectUnauthorized: false; even verify-full is weakened.

### Expected
TLS must verify the intended database server with a trusted CA.

### Actual
Encryption is enabled without certificate validation.

### Reproduction
Static analysis: call connectionTargetFor with sslmode=verify-full and inspect its ssl result. No interception was attempted.

### Proposed Fix
Support verified TLS and an explicit, narrowly scoped development exception.

### Resolution

## BUG-005 — Newsletter reports success without subscribing

**Status:** Open  
**Severity:** MEDIUM  
**Area:** Functional / UX  
**Files:** `src/components/Footer.tsx`

### Problem
handleSubscribe only changes React state and clears the email; there is no subscription API or storage.

### Expected
Success should follow a persisted subscription.

### Actual
A valid email produces a welcome message without recording it.

### Reproduction
Static analysis: submit the footer form; inspect handleSubscribe and the server route inventory.

### Proposed Fix
Implement subscription persistence and failure handling, or clearly disable the unavailable feature.

### Resolution

## BUG-006 — Planner ignores preferences and misrepresents saving

**Status:** Open  
**Severity:** MEDIUM  
**Area:** Functional / UX  
**Files:** `src/components/TravelPlanner.tsx`, `src/pages/HomePage.tsx`

### Problem
getSampleItinerary branches only on duration; style and region do not affect stops. The 15+ option returns seven days. Save sets local state and opens an enquiry via openInquiry.

### Expected
Either generate a matching itinerary and save it, or describe the output as a sample enquiry starting point.

### Actual
Personalized route and saved-plan claims exceed the implementation.

### Reproduction
Static analysis: compare Relax/South Coast with Wildlife/Far North; inspect the duration fallback and onSavePlan callback.

### Proposed Fix
Agree on intended scope, implement supported preferences and persistence, or correct the labels and duration options.

### Resolution

## BUG-007 — Public modals lack keyboard and dialog accessibility

**Status:** Open  
**Severity:** MEDIUM  
**Area:** Accessibility / UX  
**Files:** `src/components/InquiryModal.tsx`, `src/components/SearchModal.tsx`, `src/pages/PublicLayout.tsx`

### Problem
Modal containers lack dialog semantics, focus trapping/restoration and Escape handling; icon-only close buttons lack accessible names.

### Expected
Keyboard and assistive technology users can identify, use and close a dialog without tabbing behind it.

### Actual
Mouse backdrop/close handlers exist; required keyboard lifecycle is absent.

### Reproduction
Static analysis of modal components and their parent; browser keyboard behavior NOT TESTED.

### Proposed Fix
Add dialog semantics, accessible names, initial focus, focus containment, Escape dismissal and trigger focus restoration.

### Resolution

## BUG-008 — Public form controls lack associated labels

**Status:** Open  
**Severity:** MEDIUM  
**Area:** Accessibility  
**Files:** `src/components/InquiryForm.tsx`, `src/components/QuickSearch.tsx`, `src/components/Footer.tsx`, `src/components/SearchModal.tsx`

### Problem
Visible labels are siblings without htmlFor/input IDs; search and newsletter rely on placeholders.

### Expected
Each input/select has a persistent accessible name.

### Actual
Labels are not programmatically associated with controls.

### Reproduction
Static analysis: inspect label and input/select attributes; accessible-name browser audit NOT TESTED.

### Proposed Fix
Use stable IDs and htmlFor, or enclosing labels; add explicit names to search/newsletter controls.

### Resolution

## BUG-009 — Record editor can reopen a stale saved record

**Status:** Open  
**Severity:** MEDIUM  
**Area:** State / CRUD  
**Files:** `src/admin/pages/RecordEditorPage.tsx`, `src/lib/queryClient.ts`

### Problem
onSuccess invalidates collections/counts/public content but not the individual record query. Record data remains fresh for five minutes.

### Expected
Reopening an edited record shows its latest saved values and version.

### Actual
Cached previous values/version can reopen immediately after a successful save and provoke a later 409.

### Reproduction
Static analysis: open an existing record, save a change, immediately reopen it; inspect record query key versus invalidation keys.

### Proposed Fix
Set the returned row into its record cache or invalidate that specific record after save.

### Resolution

## BUG-010 — Timestamp tolerance can accept an obsolete version

**Status:** Open  
**Severity:** MEDIUM  
**Area:** Concurrency / Data integrity  
**Files:** `server/src/routes/admin.ts`, `server/src/routes/inquiries.ts`, `db/migrations/0001_init.sql`

### Problem
Optimistic concurrency accepts timestamps within plus/minus one millisecond. Two updates with sufficiently close timestamps can accept the old version.

### Expected
Any obsolete revision is rejected.

### Actual
Distinct database revisions can fall inside the accepted time window.

### Reproduction
Static analysis of versionMatches and inquiry PATCH. Concurrent database reproduction BLOCKED.

### Proposed Fix
Use an incrementing revision or lossless timestamp string with exact equality.

### Resolution

## BUG-011 — Destination search hides matches and fails to trim terms

**Status:** Open  
**Severity:** LOW  
**Area:** Functional / UX  
**Files:** `src/components/SearchModal.tsx`

### Problem
Count uses all matches, rendering slices to six; filtering lowercases but does not trim a nonempty query.

### Expected
Matching destinations remain reachable and incidental spaces do not alter results.

### Actual
Extra matching records have no show-more action; a padded query can yield no matches.

### Reproduction
Static analysis: inspect filtered.length, filtered.slice(0, 6), and searchTerm.toLowerCase().

### Proposed Fix
Trim the query and render all results or provide pagination/show-more.

### Resolution

## BUG-012 — Planner formats day ten as Day 010

**Status:** Open  
**Severity:** LOW  
**Area:** UI  
**Files:** `src/components/TravelPlanner.tsx`

### Problem
Day labels concatenate a zero with every day number.

### Expected
Day 10 should be shown consistently with Day 01.

### Actual
The ten-day sample renders Day 010.

### Reproduction
Static analysis: select the 9–14 day sample; inspect Day 0{item.day}.

### Proposed Fix
Use String(day).padStart(2, '0') or unpadded day numbers.

### Resolution

## BUG-013 — Previously exposed database credential has unconfirmed rotation

**Status:** Open  
**Severity:** HIGH  
**Area:** Security / Operations  
**Files:** `docs/LAUNCH-CHECKLIST.md (item 2)`, `CLAUDE.md`

### Problem
Launch checklist explicitly records prior Postgres password exposure and an unchecked rotation action. Current credential validity/rotation cannot be established from this copy.

### Expected
Exposed credentials are revoked and replacement credentials are confined to approved secret storage.

### Actual
The repository documents unresolved rotation; current exposure is NOT CONFIRMED.

### Reproduction
Static documentation evidence only. No secret values found or printed, and no production access attempted.

### Proposed Fix
Owner should confirm rotation, revoke the exposed credential if still active, and review access logs before launch.

### Resolution

## BUG-014 — Unset footer URLs retain link-like presentation

**Status:** Open  
**Severity:** LOW  
**Area:** UX / Incomplete content  
**Files:** `src/components/Footer.tsx`, `src/admin/pages/SettingsPage.tsx`, `shared/content-schema.ts`

### Problem
Optional legal/social URLs may be empty; footer still renders hover-styled anchors without destinations.

### Expected
Unavailable links are hidden or clearly unavailable; legal content is reachable before launch.

### Actual
Link-like actions can be inert. This is intentional current behavior documented by README, but creates a UX gap.

### Reproduction
Static analysis: clear an optional URL in settings and inspect conditional href mapping; live configuration NOT TESTED.

### Proposed Fix
Hide unavailable actions or render explicit plain text; supply approved legal pages/URLs.

### Resolution

## BUG-015 — Quick search silently ignores travel timing

**Status:** Open  
**Severity:** MEDIUM  
**Area:** Functional / UX  
**Files:** `src/components/QuickSearch.tsx`, `src/pages/HomePage.tsx`

### Problem
QuickSearch passes timing, but handleQuickSearch names it _timing and never uses it.

### Expected
Timing affects supported results, or is clearly described as informational.

### Actual
Season selection has no effect on search/filtering.

### Reproduction
Static analysis: compare timing selections with identical where/category; inspect handleQuickSearch.

### Proposed Fix
Implement a supported seasonal filter or remove/relabel the inactive control.

### Resolution

## BUG-001 — Local test environment is not configured
**Status:** Open
**Severity:** High
**Area:** Environment / Test setup
**Files:** `README.md`, `.env.example`, `server/src/env.ts`, `server/test/test-db.ts`

### Problem
The project requires `DATABASE_URL` and `TEST_DATABASE_URL` to be populated in a local `.env`, but the workspace does not currently include a usable environment file or a configured local Postgres database.

### Expected
A local developer environment should allow `npm run dev:server` and `npm test` to run against a valid local Postgres setup.

### Actual
`npm run dev:server` exits with `DATABASE_URL: Invalid input: expected string, received undefined`, and `npm test` refuses to run because `TEST_DATABASE_URL` is not set.

### Reproduction
1. Open the repo without a `.env` file.
2. Run `npm run dev:server`.
3. Run `npm test`.

### Proposed Fix
Create a valid `.env` from `.env.example`, point it to a local Postgres instance, create the required test database, and confirm the connection string meets the repository’s guard rules.

### Resolution

---

## BUG-002 — Browser baseline test needs a git repository
**Status:** Open
**Severity:** Medium
**Area:** Testing / CI
**Files:** `server/test/browser-inquiry.test.ts`, `scripts/run-tests.mjs`

### Problem
Several browser tests compare the rendered output against git baselines. The current workspace is not a valid Git repository, so the test fails before it can validate the page.

### Expected
The project should run in a normal Git checkout, and the baseline comparison should resolve the expected file versions from the repo.

### Actual
The test prints `fatal: not a git repository (or any of the parent directories): .git` and stops.

### Reproduction
1. Open the project in a non-Git working copy.
2. Run `npm test`.
3. Observe the browser-inquiry baseline check fail.

### Proposed Fix
Use a proper git clone of the project when running baseline browser tests, or replace the git-based comparison with a vendored fixture in CI.

### Resolution

---

## BUG-003 — README setup instructions are correct, but require database readiness before code validation
**Status:** Open
**Severity:** Low
**Area:** Documentation / onboarding
**Files:** `README.md`, `.env.example`

### Problem
The README describes the correct setup flow, but it relies on local Postgres configuration and a valid `.env` file that is not present in the current copy of the repo.

### Expected
Documentation should make the local database preconditions obvious and easy to satisfy.

### Actual
The environment is missing the required values, so development and tests are blocked before the project can be validated.

### Reproduction
Follow the README steps in a fresh environment without creating `.env` and without a local Postgres database.

### Proposed Fix
Keep the README explicit about required local database creation, env values, and port checks, and consider a minimal bootstrap script or checklist to reduce misconfiguration risk.

### Resolution

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
