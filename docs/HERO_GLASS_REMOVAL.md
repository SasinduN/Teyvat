# Continued hero QA - 2026-10-08

VERIFIED: fresh live route audit delivers 43/43 public HTML shells with content API HTTP 200; API health reports database up. Source search confirms PageHero, Home and NotFound text wrappers contain no glass classes and no wrapper-specific backgrounds/blur/border/shadow/pseudo layers. These remain source/HTTP observations.

Fixed audit-script continuity: scripts/audit-glass-ui.py now targets te-page-hero-copy/te-hero-copy instead of deleted te-hero-panel, captures wrapper background/image/shadow/border/pseudo-content and active-nav metrics, includes Journal/Experiences/Plan screenshots, and accepts an explicit Chrome/Edge selection. Python compile check PASS. No application source or content changed in this continuation; prior application build/16 tests remain latest validation and were not rerun unnecessarily.

Alternative Edge software-rendering attempt BLOCKED with WinError 10054 before first viewport. Zero screenshots, zero rendered checks, no browser-console observation. Evidence: qa-results/hero-glass-removal/continued-edge/report.json. Seven requested widths/both themes, photographic readability/crops, actual alignment/overflow, navbar/mobile/search/theme/button/slideshow interaction and browser history/refresh remain NEEDS MANUAL VERIFICATION. Chrome was blocked in the preceding pass. No claim of rendered acceptance.

# All-page hero glass removal - 2026-10-08

## Problem and root cause

Journal and Tours both render the shared PageHero. Its glass3d glass3d--hero glass-hero te-hero-panel wrapper applied a dark translucent fill, backdrop diffusion, reflective border, rounded rectangle, inset/depth shadow and noise/reflection pseudo-elements around breadcrumbs/title/description. Every PageHero caller inherited it. The retained CTASection banner had the same large glass wrapper. Home had already been corrected. The independent NotFoundPage dimmed its entire photo to 20% and used a full dark gradient.

The user explicitly authorized these public markup changes. No screenshot attachment was accessible in this turn; the named Journal/Tours source was inspected first. No rendered screenshot comparison is claimed.

## Modified components and source styles

| File | Change and reason |
| --- | --- |
| src/components/PageHero.tsx | Replaced the large glass wrapper with plain te-page-hero-copy. All original props, breadcrumbs/links, image, chips, eyebrow, h1 and description remain. Added semantic breadcrumb/eyebrow classes. |
| src/components/CTASection.tsx | Removed glass from retained contact banner text/CTA group, preserving content, image and callback handlers. It is not currently mounted by public routes. |
| src/pages/NotFoundPage.tsx | Kept recovery links/content/photo, removed whole-image opacity dimming, reused page gradient and shared plain reading-width wrapper. |
| src/index.css | Isolated page hero stacking and defined the plain content width using existing content-reading-width/container tokens. Existing responsive heights, gutters and header clearance retained. Description width refined to 36rem. |
| src/styles/glass.css | Removed obsolete hero-panel geometry/font rules and unused glass-hero utility selectors/filter suppression. Added theme-stable photo foreground/eyebrow colors and restrained text shadows. Ordinary Glass3D, compact HeroChip and interactive surfaces preserved. |
| src/styles/palette.css | Replaced old page-overlay token with a neutral directional page-hero-overlay; removed unused glass-hero-bg. Gradient is stronger on the text side, fades toward scenery, and includes a gradual lower-edge fade for bottom-aligned content. Home gradient remains unchanged. |
| server/test/public-ui.test.ts | Added all-page no-large-glass assertions and direct preservation checks for hero content/image/crumb/chips and retained CTA banner. |

No plain hero wrapper has background, border, border radius, shadow, backdrop-filter or pseudo-element decoration. Removing the glass class application prevents the glass surface and pseudo-element rules from matching; no blanket override stack or new rectangular surface. Image rendering is unchanged apart from the intentional 404 opacity removal. Header foregrounds are theme independent; theme changes do not attach any glass classes.

## Route/component coverage

| Existing route | Header coverage |
| --- | --- |
| / | HeroSection already open; unchanged this pass; three-section Home verified |
| /journal and /tours | PageHero inspected first and corrected through shared component |
| /destinations, /destinations#explore-map | DestinationsPage / shared PageHero; Explore remains the existing map section |
| /experiences | ExperiencesPage / PageHero |
| /about, /about#contact | AboutPage / PageHero; Contact remains inline enquiry section |
| /plan | PlanPage / PageHero |
| /photo-credits | PhotoCreditsPage / PageHero without a supplied image; intentional solid page backdrop preserved |
| /destinations/:slug | DestinationPage / PageHero |
| /experiences/:slug | ExperiencePage / PageHero |
| /tours/:slug | TourPage / PageHero |
| /journal/:slug | ArticlePage / PageHero |
| unmatched/unpublished detail routes | NotFoundPage open photographic header and recovery links |

Admin headings and loading/error status headings have no photographic glass hero wrappers; left intact. Plan's below-hero content card and selected other cards remain outside this removal scope. Routes, accurate CMS content, published photos, prices/durations, inquiry/planning controls and navbar behavior were not rewritten.

## Executed verification

- VERIFIED: npm.cmd run build passes TypeScript, Vite client and server bundle. Two nonfatal installed Zod annotation warnings remain.
- VERIFIED: npm.cmd test -- public-ui public-photos scroll-to-top passes 16 tests: ten public UI, three photo preservation, three scroll/focus tests. Public UI checks render every public page type and all fixture-published detail slugs, assert no large glass hero wrapper, preserve all h1s, existing navigation/history matching, content and three-section Home.
- VERIFIED: all four CSS files parsed with tinycss2; zero grammar errors. Source search finds no glass-hero/te-hero-panel/glass3d--hero on any component/page; Glass3D remains elsewhere.
- VERIFIED: live route delivery audit 43/43 HTML shells and content API HTTP 200; API health reports database up. These are delivery checks, not actual rendered route visits.
- BLOCKED: before and after browser software-rendering capture each returns WinError 10054 before any rendered viewport; zero screenshots. Artifacts in qa-results/hero-glass-removal/{before,after}/report.json.
- NEEDS MANUAL VERIFICATION: Journal/Tours visual comparison, photographic contrast/visibility/crops, breadcrumbs/readability, navbar clearance, buttons/links/mobile menu, actual light/dark rendering, browser console and horizontal overflow. Width matrix: 320,375,430,768,1024,1440,1920px in both themes.
- NOT TESTED: full guarded DB/auth/CRUD/browser suite. No lint command exists in package.json. No database writes, credential edits, production fallback or test guard bypass.

Review the running app at http://127.0.0.1:5173/journal and http://127.0.0.1:5173/tours, then remaining routes. Implementation complete; rendered acceptance outstanding.
