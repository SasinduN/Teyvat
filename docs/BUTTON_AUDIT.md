# Current button and native-cursor audit — 2026-10-08

Problem → root cause → files → fix → verification:

- Custom pointer feature mounted in PublicLayout with RAF/pointer/scroll listeners → removed TravelCursor.tsx, import/mount and all te-cursor CSS. Native arrow/text/link behavior remains; button/role-button controls use pointer, disabled shared actions retain not-allowed. No dependency removed because animation library serves other features. Source search confirms zero custom cursor symbols, cursor:none, mousemove or pointermove listeners in src. Actual pointer/touch behavior NEEDS MANUAL VERIFICATION.
- Hero action variants inherited global glass backdrop/reflection/sheen → glass.css scopes plain appearance to Home/page/contact hero actions, including hover; no photograph blur. Outside-hero small glass controls remain. Existing CTAs, hover/focus/disabled semantics retained. Navbar links now have 44px minimum target height.
- Destination filter flex shrink and selected scaling could compress labels/clip edges → DestinationsPage uses shrink-0, visible horizontal scrollbar, color-only transition and no scaling. Existing URL/category/pressed/count semantics retained.
- Manual slideshow controls changed visible index before image readiness → HeroSection keeps current image/caption until requested image loads and sets aria-busy; next/previous/pause controls remain named and at least 44px. Source/build PASS; actual timers/clicks unverified.
- Planner used label elements for button groups without associated controls → descriptive p elements now accompany existing named groups. No planner preference/build/save behavior changed.

Reviewed source handlers for nav/hero/card links, search, modal close/Escape/focus isolation, map controls, planner build/local save/enquiry, form busy/error handling, footer subscription and theme persistence. Rendering/data/action tests PASS; no claim of real clicks, submissions, hover colors, focus traps, touch targets across all widths or external delivery. Full DB/browser suite errors retained. See WEB_AUDIT.md and FINAL_QA.md; historical checks below preserved.

# Follow-up control corrections - 2026-10-08

Problem -> root cause -> files -> fix -> verification:

- Modal/menu close controls: the earlier unlayered button position rule defeated absolute positioning utilities. index.css/glass.css now keep position in the component layer, allowing each control's absolute utility to win. Static cascade finding corrected; actual bounds NEEDS MANUAL VERIFICATION.
- Pressed/system-color/solid fallback: normal hover had greater specificity than fallback states. glass.css now uses :where for eligibility and maintains solid secondary hover values under reduced transparency. aria-disabled controls do not animate their sheen. Static cascade review only; every primary/secondary/outline/icon/ghost/text-link state, including touch/focus/pressed/disabled/forced-colors, NEEDS MANUAL VERIFICATION.

No click handler, destination, button label or geometry token changed in this follow-up. All earlier mathematical fixed-token evidence remains scoped to declared colors, not a rendered photographic backdrop.

# Button audit ? 2026-10-08

## Variant contract

| Variant | Ordinary surface | Photography/inverse context | Hover/focus |
| --- | --- | --- | --- |
| Primary | Emerald; white label in light, forest-night label in dark | Pearl; deep emerald label | Context fill, reflective edge, restrained glow, 1px lift |
| Secondary | Neutral frosted surface; main text | Transparent pearl wash; ivory label | Slightly stronger wash, same foreground |
| Outline | Transparent; main text, defined border | Transparent; ivory label, white reflective border | Gentle wash; same foreground |
| Icon | 44px circle with matching frosted surface | Same family; photographic modal close uses an opaque dark lens | No icon translation/scale; same hover/focus family |
| Ghost / text link | Minimal treatment, inherited or semantic text | Inherits context | Wash or underline, keyboard focus |

Shared focus outline remains 3px with 4px offset. Buttons have a 44px minimum target, standard 48px, large 56px; labels may wrap without changing hover geometry. Transitions are 220ms and disabled actions do not lift. Pseudo-elements use pointer-events:none. Reduced motion removes lift; reduced transparency uses a readable solid secondary fallback; forced colors use system foreground/background. Mobile menu visibility is governed by utilities because base display/padding now live in `@layer components`.

## Fix inventory: problem ? cause ? files ? fix ? evidence

| Problem | Root cause | Files changed | Fix | Verification |
| --- | --- | --- | --- | --- |
| Gold everywhere / opaque green secondary | Repeated global fills and hero-specific override | index.css, palette.css, glass.css | One contextual semantic family; selective gold highlights | Static source review; 22 fixed-color pairs pass 4.5:1 math |
| Bright reflection lowers teal-label contrast | Same strong sheen on every fill | palette.css, glass.css | White light-primary label; primary reflection/sheen .025 | Conservative hover endpoint 4.76:1 |
| Hidden navbar buttons may remain visible | Unlayered `.te-button` display defeats Tailwind utilities | index.css, Navbar.tsx | Geometry in component layer; shared icon variants | CSS cascade reasoning; rendered mobile visibility NEEDS MANUAL VERIFICATION |
| Conflicting fill/hover/scale utilities | Component styles compete with variants | HeroSection, Footer, InquiryForm, PlanCard, QuickSearch, ToursSection, TravelPlanner | Removed redundant colors/gradients/transforms; handlers untouched | Public page markup/action tests pass; actual hover NEEDS MANUAL VERIFICATION |
| Inconsistent raw actions | Map/404/quote/save/reset/WhatsApp/close controls bypass variants | InteractiveMapSection, HiddenGemsSection, TravelPlanner, InquiryForm, InquiryModal, SearchModal, PhotoStorySection, PlanCard, NotFoundPage, ThemeToggle | Same primary/secondary/outline/icon classes and existing href/handlers | Route delivery/markup and WhatsApp action tests pass; browser clicks pending |
| Dark filter labels lose contrast | White on new pale teal hover/selected surfaces | DestinationsPage, InteractiveMapSection, TravelPlanner | Neutral hover surface/text; explicit light/dark on-secondary count token; controlled map badges | Static review; rendered states NEEDS MANUAL VERIFICATION |

Whole destination/tour/experience cards remain one accessible link; no nested buttons introduced. Category, season and planner option chips retain selection semantics and compact layout. Native Leaflet controls and admin forms retain their established behavior. Every displayed type requires hover, touch and keyboard confirmation in the browser.

## Evidence limits

The fixed-token mathematical check does not measure photographs, image crops, anti-aliasing, backdrop compositing or runtime hover. Chrome/Edge/Python/direct capture failed before completing a viewport. No browser button type is marked visually verified. Source test coverage exercises existing action/route and markup behavior, not pointer hit-testing or touch. Run `python scripts/audit-glass-colors.py` for declared color evidence and `python scripts/audit-glass-ui.py --stage after` where Chrome can run (requires installed Python tinycss2/websocket-client respectively).
