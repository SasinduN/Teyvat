# Current hero cleanup — 2026-10-08

Problem → root cause: large text panels were already removed, but HeroChip and Home caption still used glass classes; action variants inherited backdrop blur/reflections; stacked left/bottom/top gradients obscured photography. Some inner heights were unnecessarily large.

Files: HeroSection.tsx, PageHero.tsx, CTASection.tsx, NotFoundPage.tsx, index.css, glass.css, palette.css, Navbar.tsx. Fix: plain text metadata/eyebrows; no glass classes on hero content; hero actions have no backdrop/reflection/noise/pseudo-sheen/shadow; shared neutral directional gradients reduced to .62/.32/transparent for Home and .60/.22/transparent for inner pages, with a localized .48 top gradient for navigation. Champagne Gold photographic accent #D6B46E. No image blur or global glass removal. Transparent unscrolled navbar now also integrates with inner heroes; stable header height and scrolled frosted treatment remain. Home keeps 100vh/100dvh minimum/content-driven height; inner compact heights 22–28rem and detail heights 26–36rem, content can exceed minima on short screens. No negative margin strategy.

Home remains three sections/four previews, with original headline/copy/CTAs/location label/controls. Explore now owns map/hidden gems; other index/detail heroes use shared PageHero. Contact is the existing About section; retained CTASection is also plain. 404 hero now loads its photograph eagerly with 100vw/high priority.

Manual slideshow selections retain the current image and caption until requested image load, exposing aria-busy while pending. Readiness resets when source URLs change, not only when slide count changes. Visibility/reduced-motion/hover/focus/manual-pause behavior retained.

Verification: production build and 28 focused checks PASS; source search shows no custom cursor or hero glass metadata. Browser Chrome before/after and Edge after BLOCKED before any viewport. All seven widths/both themes/short landscape, cropping, contrast, header overlap, button positions and real slideshow timing NEEDS MANUAL VERIFICATION. Declared color math does not verify text contrast against photographs. Historical evidence below retained.

# Continued hero QA - 2026-10-08

VERIFIED: fresh live route audit delivers 43/43 public HTML shells with content API HTTP 200; API health reports database up. Source search confirms PageHero, Home and NotFound text wrappers contain no glass classes and no wrapper-specific backgrounds/blur/border/shadow/pseudo layers. These remain source/HTTP observations.

Fixed audit-script continuity: scripts/audit-glass-ui.py now targets te-page-hero-copy/te-hero-copy instead of deleted te-hero-panel, captures wrapper background/image/shadow/border/pseudo-content and active-nav metrics, includes Journal/Experiences/Plan screenshots, and accepts an explicit Chrome/Edge selection. Python compile check PASS. No application source or content changed in this continuation; prior application build/16 tests remain latest validation and were not rerun unnecessarily.

Alternative Edge software-rendering attempt BLOCKED with WinError 10054 before first viewport. Zero screenshots, zero rendered checks, no browser-console observation. Evidence: qa-results/hero-glass-removal/continued-edge/report.json. Seven requested widths/both themes, photographic readability/crops, actual alignment/overflow, navbar/mobile/search/theme/button/slideshow interaction and browser history/refresh remain NEEDS MANUAL VERIFICATION. Chrome was blocked in the preceding pass. No claim of rendered acceptance.

# Current all-page open hero update - 2026-10-08

Supersedes the previous large-glass page-header design; historical entries below retained. User-authorized PageHero wrapper and retained CTA banner are plain content containers now. Shared page gradient/reading width/theme-stable ivory/gold text replaces full-panel glass; NotFoundPage also reuses the open photographic treatment. Compact chips, buttons, navbar Glass3D and cards preserved. All PageHero callers are covered, including Journal, Tours and all detail page types. No route/data/photo replacement or database changes.

VERIFIED: build/typecheck/client/server PASS; 16 focused tests across three files PASS; four CSS grammar parses PASS; all 43 live public HTML shells PASS; content API 200/database up. Home remains three sections. Browser before/after retries both BLOCKED by WinError 10054 with zero rendered viewports/screenshots. All photographic contrast/crops, alignment/navbar clearance, interactions/mobile navigation, themes and overflow at 320,375,430,768,1024,1440,1920px remain NEEDS MANUAL VERIFICATION. No lint script; full guarded DB/browser suite not run. See HERO_GLASS_REMOVAL.md for component/route coverage and evidence boundaries.

# Database restored - 2026-10-08

This entry supersedes the earlier runtime outage below; historical evidence is retained.

VERIFIED: frontend http://127.0.0.1:5173/ returns HTTP 200; backend http://127.0.0.1:8081/api/health reports database up; proxied content API returns HTTP 200. Public route delivery audit passes 43/43 HTML shells. These checks verify delivery, not rendered navigation.

The strict live-fixture comparison passes eight of nine collections. Its destination comparison reports one difference: Jaffna uses the 1280px Wikimedia thumbnail of the same Full_view_of_nallur_front.JPG photograph, while the fixture expects its original URL. Fieldwise comparison found no other destination differences. Existing CMS/database content was preserved. Evidence: docs/qa-results/glass-ui/restored-content-differences.json and the refreshed route/content reports.

Browser software-rendering retry remains BLOCKED by WinError 10054 before any completed viewport or screenshot. Opening the desktop browser was rejected by execution policy because sandbox approval is disabled. All rendered glass balance, photographic contrast, themes, seven-width responsive checks, hover/focus/hit-testing, image decoding and browser-console acceptance remain NEEDS MANUAL VERIFICATION. Review the running site at http://127.0.0.1:5173/.

No application source changed during restoration verification. Previously executed final build, 21 focused tests, 22 fixed-color checks and CSS parsing remain the latest source validation; they were not rerun in this documentation-only pass. Full database test-suite acceptance is separate and was not tested here.

# Follow-up hero correction - 2026-10-08

Problem: carousel transition utilities competed, risking an abrupt photograph swap. Root cause: transition-opacity and transition-transform both set transition-property, with independent durations. Files: HeroSection.tsx/glass.css. Fix: a single te-hero-slide declaration owns opacity 700ms and transform 7s; data-active owns current state; reduced motion continues to disable transitions. Verification: static source review and public rendering checks; actual fade, crop and text/photo balance NEEDS MANUAL VERIFICATION.

The photograph itself has no blur or additional filter. The existing floating neutral lens remains .42 opacity and retains diffusion, soft edge reflection, rounded corners, comfortable padding and shallow depth. No darker rectangle or extra glass effect was introduced. Surface matching over actual beach/forest/cultural photographs remains a visual review task, not inferred from a token or compilation result. Shared layout and the three-section Home remain unchanged.

# Hero audit ? 2026-10-08

Public UI changes were explicitly authorized. Photographs, routing and factual copy preserved.

| Hero/location | Baseline problem / root cause | Files changed / fix | Verification |
| --- | --- | --- | --- |
| Home HeroSection | Strong dark overlay plus inverse lens; secondary specificity conflict; independent icon scaling; narrow badge | index.css/palette.css/glass.css/glass3d.css/HeroSection.tsx: one neutral overlay, bounded 14px lens, pearl primary and transparent secondary, compact wrapping badge, stationary icons | Home remains 3 sections / 4 discovery links in rendered markup; hero hrefs remain /destinations and /plan. Rendered visual NEEDS MANUAL VERIFICATION |
| All PageHero routes | Different inherited glass tint; breadcrumbs outside protected reading area | PageHero.tsx and shared styles: breadcrumb nav moved inside bounded panel, higher-opacity breadcrumb text; same lens/depth as Home | All public page types/published fixtures render one h1; actual alignment/readability NEEDS MANUAL VERIFICATION |
| Photo credits (no image) | Photo component assumes photographic context | Shared fallback remains inverse-deep, with readable ivory/pearl foregrounds | Markup pass; browser NEEDS MANUAL VERIFICATION |
| 404 and unpublished/missing slugs | Independent gold CTA styles | NotFoundPage.tsx: shared primary/secondary variants; existing subdued photo/heading structure retained | Missing-page markup pass; production HTTP status verified separately when running built API |
| /about#contact | Actual route is an inline enquiry section, not CTASection | InquiryForm and icon controls use shared variants; contact structure retained | Labels/markup pass; form submission/visual NEEDS MANUAL VERIFICATION |
| CTASection | Unused legacy component has darker ordinary `.glass-hero` than other heroes | CTASection.tsx: same Glass3D extension; no route renders it, no section added to Home | Static review only |

## Photo, color and geometry contract

The picture is not filtered globally. The overlay uses neutral photo channels (24 30 32), with lower opacity than superseded dark/green gradients. Diffusion is restricted to the panel/navbar/badges. The panel uses `.42` neutral charcoal tint, delicate white reflection, bounded padding and depth/noise; glare/readability over actual bright photographs is still unverified. No image URL, object position or caption was replaced without evidence; original object-cover/object-center behavior is retained. Crop/subject suitability must be reviewed manually rather than guessed.

Hero blur is 14px desktop / 10px mobile; navbar 16px; cards 8px; saturation 118% light / 112% dark; brightness 1. The supplied `blur(3px) brightness(.72) saturate(3.1)` fragment is a design reference, not current code. Full original user snippet was not present in the repository. Edge highlight, underside shade and fine noise remain. Diffusion now belongs to the surface; pseudo-elements do not intercept pointer events.

The existing `te-container`, header-height, section spacing and hero content widths remain the alignment system. Hero content starts after header-height + shared spacing. Panels are width:100% with bounded max-width and min-width:0. Buttons wrap, icons do not shrink, and no new hard-coded offsets were introduced. Geometry is identical between themes. These are source findings, not measured bounding rectangles.

## Required rendered matrix

320, 375, 430, 768, 1024, 1440 and 1920px, light and dark, every actual public route including published details. Check headline/subtitle/breadcrumb readability; image decode/crops; hero/nav clearance; panel bounds; CTA wrapping/44px targets; hover/focus; mobile drawer; scroll and hash arrival; no horizontal overflow/theme shifts. Every item is **NEEDS MANUAL VERIFICATION** because no browser completed a viewport. No before/after image comparison was possible: both capture stages have zero screenshots. HTTP 200 and static React rendering do not establish visual correctness.
