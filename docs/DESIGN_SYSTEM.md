# 2026-10-08 — Tropical Glass update

The user's structural/design request authorizes this change to the frozen public UI. `src/styles/palette.css` centralizes all twelve supplied light/dark colors and maps existing semantic/legacy tokens to them. Light uses pearl/mist surfaces, emerald/teal interactions and champagne highlights; dark uses forest-night/glass surfaces, lagoon interaction, soft-gold highlights and ivory/muted text. Gold text on light surfaces uses a darker mixed token for readability. Theme selectors change color/effect tokens, not spacing or dimensions.

`src/styles/glass3d.css` extends the existing glass system with non-interactive `::before` backdrop/tint and `::after` locally authored SVG noise/edge reflections, layered shadows, and hero/card/navbar/button/floating variants. Hero photography remains outside the bounded content panel. Desktop/mobile blur is restrained; supported browsers use real backdrop filters. Solid surfaces are the fallback. Forced-color/reduced-transparency/reduced-motion styles preserve interaction. This is CSS inspired by translucent interfaces, not Apple's proprietary renderer.

The user's original custom `.glass3d` source was unavailable in the repository/conversation. A clarification received the task again without that source. Implementation therefore uses the existing system and requested layers; it does not claim verbatim preservation of an unseen snippet.

Existing glass-subtle/medium/strong/button/navbar/hero/floating variants remain. Shared buttons keep primary/secondary/outline colors, reflective hover, visible focus and disabled states. Navbar and hero panels, selected photo captions, homepage journey CTA and floating controls use Glass3D. Native Firefox/WebKit scrollbar styling remains progressive enhancement; native scrolling is preserved and native thumbs do not claim backdrop-filter support.

Container/spacing system remains shared. Homepage discovery grid is one column at 320px, two from small widths, four at XL. Journey CTA stacks below 1024px. Navigation uses the existing XL desktop breakpoint/mobile drawer. Browser contrast, crop, overflow and theme geometry acceptance remain BLOCKED; see FINAL_QA.md.

# Travel Eye design system

2026-10-06. Tokens are centralized in src/index.css; public and admin surfaces consume semantic variables. Existing editorial content remains intact.

## Colors

| Token | Light | Dark |
|---|---|---|
| --background | #faf8f3 | #0e1b16 |
| --background-secondary | #eee9df | #14271e |
| --surface | #fffefb | #1b3026 |
| --surface-glass | warm white 90% | forest 92% |
| --text-primary | #202e28 | #f1f0e7 |
| --text-secondary | #4a5c51 | #c0ccbf |
| --text-muted | #68766b | #a4b4a4 |
| --brand-primary | #153e2f | #b4dcc2 |
| --brand-secondary | #24674d | #3b8060 |
| --accent | #b58a36 | #e0be72 |
| --accent-text | #7b591c | #e0be72 |
| --accent-hover | #d7b66b | #eed298 |
| --border | #e0ddd2 | #31483a |
| --border-strong | #b8baab | #50634d |

Inverse forest surfaces remain #102c22/#0b211a in both themes. Gold buttons use dark on-accent text #142d22. Accent-text separates readable small gold lettering from decorative gold. Legacy physical forest/gold tokens remain for compatibility; no new random palette.

## Typography, spacing and layout

Playfair Display/Cormorant Garamond headings; Plus Jakarta Sans controls and body; system/Georgia fallbacks. Hero mobile type uses clamp(2.5rem, 10vw, 3.7rem); bounded headline and supporting copy preserve editorial hierarchy. Section spacing clamp(3.5rem, 7vw, 6rem). Main container min(100% - 2 * gutter, 80rem), gutter clamp(1rem, 3vw, 2.5rem). Tailwind breakpoints retained: 640, 768, 1024, 1280, 1536px. Desktop navbar starts at 1280px to prevent intermediate collisions. Discovery grid: one mobile column, two tablet columns, four explicit desktop columns. Cards use intentional family ratios and flex CTA alignment, not arbitrary fixed text heights.

## Surfaces and interaction

Card radius 1.5rem; restrained forest shadows with deeper hover shadow. Shared Button variants primary/secondary/outline/ghost plus named icon/text controls. Controls retain 44px minimum interactive targets where applicable; loading and disabled states remain explicit. Warm primary glow and forest hover feedback use transforms/opacity, roughly 180-280ms. Image hover scale stays restrained; CTA arrows move subtly. Navbar active indication, hero caption/discovery surfaces and small interface overlays use glass; ordinary cards remain solid. Hero photography stays visible beneath layered forest gradients.

## Theme

External head module initializes saved light/dark choice or system preference before React. Manual choice is stored under travel-eye:theme. Storage failure is tolerated. System and storage listeners synchronize initial preference and cross-tab changes. Root data-theme and color-scheme drive every semantic surface, including forms/admin. Inverse image overlays retain light text. No unsafe inline script or weakened script CSP. Browser flash, complete component contrast and interactive persistence NEEDS MANUAL VERIFICATION.

## Cursor and motion

Native cursor remains available. Decorative inner dot 6px and follower ring approximately 32px, expanding to approximately 48px on interactive targets. Warm gold/forest treatment responds to theme. Refs and requestAnimationFrame interpolate transforms; idle frames stop; pointer entry and scroll re-evaluate hit targets. Layers use pointer-events none and z-index 120/121. Fine hover pointers only; disabled for touch/coarse pointers, reduced motion and forced colors; hidden over text entry/selection and maps. No React state updates on every move.

Existing Framer Motion provides restrained logical-group reveals, generally 450-700ms, once per view. CSS transitions use cubic-bezier(.22, 1, .36, 1). Reduced-motion disables cursor interpolation and movement/reveal transitions. Hero has a pause control; redundant bouncing scroll cue removed.

## Accessibility and images

Focus-visible uses a clear 3px outline with offset; associated form labels and named icon controls. Shared modal hook manages focus trap, Escape, inert background, scroll lock and focus return. Keyboard tests need a working browser. Images use cover and curated object-position, eager first hero, lazy below-fold images and async decoding. Failed curated derivative retries the same original photograph, then a factual local fallback; failure is still detectable through data-image-state. Credits expose source, author and license; fallback is never considered proof of a working image.

Supporting variables centralize inverse-raised, emerald-edge, sand highlights, gold-deep and white. Theme-aware danger/success/warning values preserve readable feedback. Gold CTA foreground is always on-accent.

## Alignment architecture

The complete alignment pass supersedes earlier independent hero/container dimensions. One te-container uses --container-max and --page-gutter. --header-height, --hero-content-max, --content-reading-width, --section-space, --heading-space and --grid-gap govern structure. PageHero has content-driven compact/detail variants. te-section-header, te-reading-column and te-cta-group are reusable layout primitives. The hero child width:100% override and fixed percentage-height dependencies were removed. Structural geometry is identical across theme selectors; browser proof remains pending. Full route checklist: ALIGNMENT_AUDIT.md.
