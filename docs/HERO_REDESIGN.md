# Full-screen Home hero — 2026-10-08

Explicitly authorized public structure/style change. Problem → opaque shared navbar and capped hero made the photo appear below a separate bar. Root cause → shared glass surface and clamp(42rem,95svh,56rem).

Files: HeroSection.tsx, Navbar.tsx, PublicLayout.tsx, index.css, glass.css. Home now uses transparent unscrolled fixed navigation over the photograph and existing frosted styling on scroll. Height stays constant; no negative margin or spacer. Other pages retain readable existing header styling.

Hero uses minimum 100vh then 100dvh, with content-driven height on short screens. Header-safe top padding and reserved bottom space protect copy/CTAs/controls; short-height spacing rules added. Copy remains directly over photography with serif/ivory/champagne styling and directional gradients. No glass text rectangle or photo blur. Headline, description, both CTAs, location caption and previous/pause/next controls remain. Home still has three main sections and four destination previews.

The Plan control is a named compass button on narrow screens and a full text button from 640px. Below 375px, the Travel Eye wordmark stays visible while its decorative icon hides to reserve control space. Search/theme/menu remain separate and named. Active-navigation logic and focus hook retained.

Slideshow initially mounts only its first image. One low-priority next slide loads after the current photo completes; automatic advance waits for readiness. Timer suspends offscreen, in hidden tabs, with reduced motion, hover/focus or manual pause. Manual controls remain. Absolute image slots reserve geometry. Immediate heading/copy paint replaces delayed motion entrances; navbar dialog no longer uses the motion factory.

Verification: final build and 17 focused tests PASS. Rendered crop/contrast/heights/menus/hit testing/timers/screen-reader tree/overflow at seven widths, both themes and short landscape NEEDS MANUAL VERIFICATION. Chrome attempts completed zero viewports/screenshots.
