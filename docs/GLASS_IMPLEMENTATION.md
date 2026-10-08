# 2026-10-08 — Routing/palette follow-up

Home now has exactly three main sections; map/planner/journal content was relocated as documented in HOMEPAGE_RESTRUCTURE.md and ROUTE_AUDIT.md. palette.css and glass3d.css load after index.css, with glass.css between them. Glass3D panels add a backdrop pseudo-layer, tint, own SVG noise and edge reflection, with non-interactive pseudo-elements. Original custom CSS was not supplied, so the existing implementation was the starting point. See DESIGN_SYSTEM.md for semantic tokens and FINAL_QA.md for current evidence.

# Travel Eye glass implementation

2026-10-08. Authorized by the user's Liquid Glass implementation request. Public presentation changes were called out before editing; no rebuild, route changes, content edits, image substitutions, database writes or dependencies were required.

| File/component | Change |
| --- | --- |
| `src/main.tsx` | Load glass stylesheet after existing base styles |
| `src/styles/glass.css` | Theme tokens, seven glass variants, opaque fallbacks, button reflections, native scrollbar styles and accessibility media queries |
| `HeroSection` | Bounded content lens inside existing global container; photographic carousel and caption remain |
| `PageHero` | Shared content lens for lists, About, destination/tour/experience/article details and credits; breadcrumbs remain outside the lens |
| `CTASection` | Contact content lens and existing shared button variants; layered photo gradient |
| `Navbar` | Glass header with existing 40px scroll threshold exposed as `data-scrolled`; mobile drawer and CTA use shared surfaces |
| `QuickSearch` | Strong forest glass; fields, labels and submit logic preserved |
| `PageCards`, `ToursSection`, `DestinationSpotlight`, `FeaturedExperiences` | Selective photo badges and metadata glass; image frames and links preserved |
| `WhatsAppButton` | Glass styling; existing overlap protection preserved |
| `ScrollToTop`, `PublicLayout` | Accessible native button at bottom left, opposite WhatsApp; hidden initially, near protected controls/footer or while dialogs are present |
| `scripts/audit-glass.ts` | Read-only Chrome/Edge audit covering all published public detail routes, seven requested widths and both themes; writes blocked evidence if browser fails |

Scroll-to-top appears after more than 600px or 80% of viewport height, whichever is larger. A passive scroll listener schedules one animation-frame check. It respects `.leaflet-control-zoom` and `[data-keep-clear]`, avoids the footer, observes content insertion, and cleans up all listeners/observers. Clicking focuses the page heading and calls native `scrollTo`; reduced motion uses instant scrolling. Invisible controls leave the tab order. Inquiry, search and mobile navigation dialogs suppress it.

Hero panels stay inside the existing container, have `width:100%` with bounded maximum widths (52rem home, 46rem inner pages), and use fluid padding. Small-screen hero title sizing is adjusted for panel padding. Theme changes never alter these geometric properties. No overflow-hiding hack was added to the page.

Home, inner-page and contact gradients are lightened beside the bounded content lens to reveal more of the original photography. The panel retains its readable forest tint, with bottom gradients connecting to the existing section backgrounds.

Validation evidence is recorded in `docs/FINAL_QA.md` and `docs/qa-results/glass-audit.json`; local delivery checks are in `docs/qa-results/glass-http-checks.json`. The scroll-to-top action has three regression tests in `server/test/scroll-to-top.test.ts`; its implementation is shared through `src/lib/scrollToTop.ts`. A server-rendered markup test is not evidence of rendered contrast, touch behavior or viewport geometry. Firefox and Safari are unavailable in this Windows environment; their CSS paths remain unverified here.
