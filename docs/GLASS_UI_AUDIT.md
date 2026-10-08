# Database restored - 2026-10-08

This entry supersedes the earlier runtime outage below; historical evidence is retained.

VERIFIED: frontend http://127.0.0.1:5173/ returns HTTP 200; backend http://127.0.0.1:8081/api/health reports database up; proxied content API returns HTTP 200. Public route delivery audit passes 43/43 HTML shells. These checks verify delivery, not rendered navigation.

The strict live-fixture comparison passes eight of nine collections. Its destination comparison reports one difference: Jaffna uses the 1280px Wikimedia thumbnail of the same Full_view_of_nallur_front.JPG photograph, while the fixture expects its original URL. Fieldwise comparison found no other destination differences. Existing CMS/database content was preserved. Evidence: docs/qa-results/glass-ui/restored-content-differences.json and the refreshed route/content reports.

Browser software-rendering retry remains BLOCKED by WinError 10054 before any completed viewport or screenshot. Opening the desktop browser was rejected by execution policy because sandbox approval is disabled. All rendered glass balance, photographic contrast, themes, seven-width responsive checks, hover/focus/hit-testing, image decoding and browser-console acceptance remain NEEDS MANUAL VERIFICATION. Review the running site at http://127.0.0.1:5173/.

No application source changed during restoration verification. Previously executed final build, 21 focused tests, 22 fixed-color checks and CSS parsing remain the latest source validation; they were not rerun in this documentation-only pass. Full database test-suite acceptance is separate and was not tested here.

# Follow-up final evidence - 2026-10-08

Build/typecheck PASS; 21 regression tests PASS; 22 fixed color pairs PASS; four CSS files parse. Software rendering browser retry still BLOCKED; zero screenshots/viewport checks. Final API recheck exposes a changed local runtime prerequisite: configured database on 5433 ECONNREFUSED, content API 500; user will restore it. Existing database-ready reports below are historical. Website shell/style delivery remains 200. Full current evidence and acceptance ledger: FINAL_QA.md.

# Follow-up source audit - 2026-10-08

The user reiterated the same glass/hero/button scope, including keeping the photograph attractive and avoiding an overly dark rectangle. Existing palette/source fixes were re-read before further changes. No new global color system or glass layer was added.

| Problem | Root cause | Files changed | Correction | Evidence |
| --- | --- | --- | --- | --- |
| Close controls lose intended absolute positioning | Unlayered `.te-button` position:relative overrides layered position utilities | index.css, glass.css | Position joins geometry in the component layer | FOUND BY STATIC ANALYSIS; browser geometry NEEDS MANUAL VERIFICATION |
| Pressed, forced-color and solid-fallback states lose to hover | Excessive :not specificity in normal hover rule; hover variables retained transparency | glass.css | :where eligibility, explicit disabled eligibility, contextual solid hover tokens; existing active/system-color states win | FOUND BY STATIC ANALYSIS; pointer and accessibility emulation NEEDS MANUAL VERIFICATION |
| Hero background changes may snap instead of fade | Two transition utilities compete for transition-property/duration | HeroSection.tsx, glass.css | One carousel rule owns opacity/transform transitions | Static review; rendered fade NEEDS MANUAL VERIFICATION |

Palette matches the supplied light/dark values. Diffusion is a surface backdrop-filter, not an image filter. The neutral .42 photo tint, bounded padding, reflected border, fine noise, inset depth and controlled shadow are retained. Headline/subtitle/button alignment still uses te-container/header-height. Gold remains selective; hero primary is pearl, secondary transparent. Photography is not replaced or subjected to global blur. The full original Glass3D snippet is still unavailable; only the supplied filter fragment can be compared.

Software-rendering retry (`python scripts/audit-glass-ui.py --stage before --software-rendering --output docs/qa-results/glass-ui/followup-before`) also failed with WinError 10054, completing zero viewport checks. This capture attempt occurred after the first positioning/state repair; no pre-fix image comparison is claimed. Screenshot/contrast/crop/hover/touch/overflow acceptance remains NEEDS MANUAL VERIFICATION at 320/375/430/768/1024/1440/1920px in both themes. This source audit supersedes no historical rendered pass because none exists.

# Glass UI audit — 2026-10-08

Audit recorded before application styling changes. The user explicitly authorized public design refinements. Routes, accurate photographs, CMS content and the three-section homepage are preserved.

## Baseline findings — FOUND BY STATIC ANALYSIS

1. `index.css`, `palette.css`, `glass.css` and `glass3d.css` independently define palette/surface/button rules. Import order masks obsolete theme values; specificity lets `.te-hero .te-button--secondary` defeat the intended shared secondary treatment. Hero overlays occur four times in index.css and again in glass.css.
2. Primary actions are globally champagne gradients; secondary actions are almost opaque emerald (`.93`), including over photographs. An outline action inside glass inherits an opaque emerald fallback while its label is forced white. Contextual color is not owned by one system.
3. Final import order lets `.glass3d--hero` supply a `.58` dark tint; ordinary `.glass-hero` uses the `.78` inverse surface. Both are stacked over another dark photographic overlay. Two different hero implementations therefore produce different darkness. Background selectors and variants should have a single owner.
4. Glass3D disables the parent's backdrop-filter and places the diffusion on a negative-z pseudo-element. This is difficult to inspect and couples blur to stacking contexts. The layer's actual rendered appearance is NOT VERIFIED. All pseudo-elements currently disable pointer events; no static evidence of a click-blocking layer.
5. Old forest/gold scrollbar, theme toggle, hover brightness, button and overlay rules remain underneath subsequent overrides. Fixed gold hover shadows and hard-coded emerald fills detach actions from their context.
6. Form, footer, search, planner and tour actions carry redundant Tailwind fill/hover/transform utilities alongside semantic variants. The 404 actions bypass variants; contact uses ordinary glass while other heroes use Glass3D.
7. Homepage badge is one unwrappable flex text run at narrow widths; hero actions carry independent icon scaling. Navbar and heroes share container/header geometry but require rendered clearance checks.
8. Current light secondary text and dark secondary brand differ from the requested `#526B64` / `#63C9B8`. Noise exists at `/images/glass-noise.svg`; original full user Glass3D snippet is absent. The supplied filter fragment is reference only, not a current live rule (`3.1` saturation was not found).

## Architecture and route inventory

Only four CSS files exist under src. main.tsx imports index, palette, glass, Glass3D in that order. `PageHero` covers list/detail/About/journal/planner/credits pages; `HeroSection` covers Home; `CTASection` is retained but currently unused; `/about#contact` is an inline contact section in AboutPage; 404 has its own hero. Actual public routes: `/`, `/destinations`, `/destinations/:slug`, `/experiences`, `/experiences/:slug`, `/tours`, `/tours/:slug`, `/journal`, `/journal/:slug`, `/plan`, `/about`, `/photo-credits`, wildcard. Contact is `/about#contact`, not a new `/contact` page. Admin remains `/admin/*`. Shared paths own CTA destinations and old homepage hash redirects.

## Executed baseline

- Website/API running locally on 5173/8081 with the development database on local port 5433; startup previously corrected configuration and applied existing migrations.
- Chrome and Edge Node CDP audit: BLOCKED by DevTools disconnect. Python websocket-client transport also fails with WinError 10054 before any viewport completes. Evidence: `qa-results/glass-audit.json`, `qa-results/glass-ui/before/report.json`.
- Before screenshots: unavailable; zero captured. No visual contrast, hover, crop, geometry or browser-console acceptance is claimed.

## Planned source corrections

Make palette.css the only color-token owner. Keep structural geometry in index.css; move all button appearance/hover rules into glass.css. Use neutral frosted surfaces, a bounded charcoal photographic lens and one live backdrop-filter on each Glass3D surface. Preserve inset edge reflection, underside shade and noise. Emerald primary actions on ordinary surfaces; pearl primary actions and transparent secondary/outline actions in photo/inverse contexts. Remove obsolete selectors rather than append overrides. Use the same semantic variants for 404, forms and floating controls. Maintain responsive padding, native scrolling, focus, reduced-motion/transparency and forced-color fallbacks.

Final fix inventory and acceptance evidence will be recorded after execution in BUTTON_AUDIT.md, HERO_AUDIT.md and FINAL_QA.md.

## Completed fixes and executed evidence

Implemented the source corrections described above. Moved PageHero breadcrumbs into the lens; normalized actual photo/inverse actions to pearl and ordinary actions to emerald; reduced primary reflection strength to preserve contrast; corrected Tailwind visibility cascade, modal/map/save/WhatsApp action variants, dark filter hover and count/badge foregrounds. Important source findings are tracked as BUG-035?038. Files and Problem ? Root cause ? Fix ? Verification mapping are in BUTTON_AUDIT.md and HERO_AUDIT.md.

Final build/typecheck PASS; 32 relevant tests across seven files PASS; 22 sampled fixed color pairs PASS at 4.5:1; all four CSS files parse; 43 route shells/content API PASS; synthetic fixture round-trip PASS. Actual browser appearance, photograph contrast, hover, cropping, console, clicks and seven-width matrix are NEEDS MANUAL VERIFICATION. Direct screenshot also failed with a GPU fatal exit. No screenshots were captured. No app dependencies, route changes or database writes in the UI pass.
