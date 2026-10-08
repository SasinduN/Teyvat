# 2026-10-08 — Tropical palette

The current centralized palette is src/styles/palette.css; Glass3D layers/variants are in src/styles/glass3d.css. Exact supplied colors, semantic aliases, theme brightness/saturation, native scrollbar behavior and fallbacks are documented in DESIGN_SYSTEM.md. Earlier values below are historical implementation context.

# Travel Eye glass design system

2026-10-08. CSS interpretation of translucent glass, not Apple's proprietary rendering technology. The existing forest, gold, ivory, typography, imagery and routes remain the foundation.

`src/styles/glass.css`, imported after the existing styles, owns glass variables and progressive enhancement. Light surfaces use warm ivory, forest text and charcoal shadows. Dark surfaces use charcoal/forest-black, muted emerald and pale gold. Photography surfaces use a dark forest lens in both themes for white text. Theme selectors only change color/shadow tokens; dimensions, padding, borders and typography are shared.

| Variant | Use |
| --- | --- |
| `glass-subtle` | Small image badges, hero chips |
| `glass-medium` / `glass` | Selected experience metadata and tour footers |
| `glass-strong` | Existing quick-search panel |
| `glass-button` | Reusable standalone surface; existing `te-button` variants receive equivalent styling |
| `glass-navbar` | Fixed navigation and mobile drawer |
| `glass-hero` | Bounded homepage, shared inner-page and contact panels |
| `glass-floating` | WhatsApp, scroll-to-top and spotlight arrow surfaces |
| `glass-inverse` | Forest lens for pale text over photographs |

Primary buttons keep a readable gold fill; secondary buttons keep an emerald/forest fill; outlines adapt to their surface. Fine-pointer hover adds a small elevation, edge glow and 3px reflection shift over 240ms. Ghost and text links retain their lighter interaction roles. Existing visible focus rings, disabled and loading behavior remain.

Blur is 14px generally, 10px on hero panels and 8px on small image badges. Mobile lowers hero blur to 8px. Hero child buttons/chips do not add another backdrop blur. No animated blur, distortion, mouse-tracking gradients or new animation dependencies are introduced. Image cards retain their photography; selected badges and metadata provide the glass accents.

Native scrollbars have a rounded 10px WebKit thumb with reflective gold/emerald shading; Firefox gets standard thin scrollbars with theme colors. Native scrolling and touch gestures remain. Gallery scrollbars are restored rather than replaced with a fake scrollbar. Operating systems may hide overlay scrollbars until scrolling; native scrollbars do not reliably support backdrop filtering.

Unsupported backdrop filters use solid readable surfaces. Both prefixed and standard properties are supplied. Reduced transparency uses solid fills; reduced motion disables elevation/reflection movement and smooth scroll-to-top. Forced colors use system colors and native scrollbar colors. The scrollbar hover gradient and blur appearance still require browser visual review.
