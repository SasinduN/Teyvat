# Cinematic homepage hero - 2026-10-08

## Problems, root causes and changes

The homepage headline/description/CTAs lived inside glass3d glass3d--hero glass-hero te-hero-panel, attaching a dark tinted background, blur, border, shadow and pseudo-element reflection/noise to the entire text block. Files: src/components/HeroSection.tsx, src/styles/glass.css, src/styles/palette.css, src/index.css. Fix: replaced that wrapper with a plain te-hero-copy layout container, without any glass class, background, border, blur, shadow or pseudo layers. Dedicated page hero panels and other site glass remain intact.

Text now sits directly over the photographs. A semantic home-only directional gradient provides contrast behind the left-aligned text and fades toward the scenery; no photograph filter or backdrop blur. Existing serif headline/copy preserved; Different Eye. uses solid champagne, with restrained title/description text shadow. Existing container, header-height clearance, responsive headline sizing, reading width and CTA wrapping govern geometry. Small caption/buttons retain light neutral glass. Slideshow controls moved to the reserved bottom area, with previous/next buttons alongside pause/resume.

Slideshow hover/focus previously shared one interaction boolean, allowing mouse leave to cancel an active keyboard pause. Independent hovered/focused states now pause rotation until both are clear. Timer cleanup and reduced-motion pause remain; existing 700ms crossfade is preserved. Manual controls wrap indexes and derive displayed title/caption from the same current record as the photograph.

## Content and functionality

Hero CTAs remain /destinations (Explore Sri Lanka) and /plan (Plan Your Journey). Home still has exactly three sections and four destination links. No content, photos, routes or database records were overwritten. Live API contains Ella Nine Arches Bridge, Sigiriya Rock Fortress and a credited Mirissa sunset photograph, with matching place labels. This is URL/credit/data verification, not rendered crop or image-decode verification. Existing admin-provided text preserved.

## Verification

VERIFIED: build/typecheck PASS, no-glass wrapper and CTA/control markup assertions PASS, all public page type markup PASS, three-section Home PASS, four CSS files parse with zero errors. Public UI tests cover all published fixture detail page types. Photo correction/owner-edit preservation tests PASS.

NEEDS MANUAL VERIFICATION: photograph contrast, image positioning/quality/decode, actual slideshow timing and transitions, control hit-testing, CTA clicking/focus/mobile behavior, light/dark appearance, navbar clearance, console and overflow. Width matrix: 320,375,430,768,1024,1440,1920px in both themes. Browser retry returned WinError 10054 with zero checks/screenshots. No valid before/after rendered comparison is available; the zero-check attempt marked before was also run after edits and is not a baseline.

