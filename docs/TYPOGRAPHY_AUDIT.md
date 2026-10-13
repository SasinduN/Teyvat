# Typography audit — 2026-10-13

Active checkout: Teyvat-latest-20261012. Public presentation changes explicitly called out before editing.

## Root causes

Book Your Ride used font-heading but no font weight. Tailwind preflight leaves headings inheriting the regular weight. Other inner-page titles use PageHero with font-bold. ride-booking.css also replaced the shared heading-page clamp with a smaller independent 2rem/4vw/3rem rule. Tracking was missing. Its 1100px container disagreed with the shared 77.5rem page grid, and its intro replaced the shared reading-width token.

## Shared design

Existing Playfair Display remains the display font, with Cormorant Garamond and Georgia fallbacks. Existing Plus Jakarta Sans remains the body/button/label font. index.html already requests Playfair Display weights 400–900 and Plus Jakarta Sans 300–800, so 700 is supported by the actual variable font. No new font dependency or simulated shadow/stroke boldness. Existing font loading was retained; real font-load verification is reported in FINAL_QA.md.

New tokens in src/styles/tokens.css: heading-page-weight 700, heading-page-leading 1.12, heading-page-tracking -0.025em. Existing heading-page remains clamp(2rem,4vw,3.25rem). Both te-page-title and booking-page h1 consume the same family/size/weight/line-height/tracking. Ride-specific CSS controls only compact title margin (0.65rem), not a conflicting size.

Ride container now uses container-max, and intro uses content-reading-width. Heading and form share the existing te-container edges. The compact point-to-point workflow, seven ride fields, conditional returns and guest callback remain; no contact/tour fields were added.

## Main-page audit

| Page | Heading system | Treatment |
|---|---|---|
| Home | te-hero-title | Distinct larger hero clamp and -0.035em tracking retained |
| Explore | PageHero / te-page-title | Shared inner-page H1 |
| Destinations | PageHero / te-page-title | Shared inner-page H1; cards retain smaller hierarchy |
| Experiences | PageHero / te-page-title | Shared inner-page H1 |
| Tours | PageHero / te-page-title | Shared inner-page H1 |
| Book Your Ride | booking-page h1 | Supported 700 display weight; shared inner-page scale; compact spacing |
| Journal | PageHero / te-page-title | Shared inner-page H1 |
| About | PageHero / te-page-title | Shared inner-page H1 |
| Contact | /about#contact | About H1 plus section H2; no duplicate page H1 introduced |

H2/H3, card titles, body text, labels and buttons retain intentional hierarchy. Variable body-font weights 550/600/650 are supported. Booking’s smaller form headings remain intentional. Shared heading colors remain brand-primary on ordinary surfaces and on-inverse over photographs, including dark mode. Palette, theme toggle and light map behavior preserved.

## Files modified

Typography: src/styles/tokens.css, src/index.css, src/styles/booking.css, src/styles/ride-booking.css. Existing PageHero semantics/heading markup retained; its image element now uses the shared renderer. All other photo-related changes are recorded in DESTINATION_IMAGE_AUDIT.md.

## Responsive and QA evidence

Requested widths: 320,375,390,768,1024,1440,1920 CSS pixels, light/dark. First Chrome pass measured 126 heading layouts with no horizontal page overflow or clipped H1; ride weight was 700 at each width, with 32–52px responsive size and -0.025em tracking. Final built-site results supersede that preliminary pass and are recorded in FINAL_QA.md and docs/qa-results/image-typography/browser-audit.json.

Actual browser-toolbar 200% zoom is distinct from 200% root-text enlargement. Only completed observations are reported. Native browser connector inventory was empty; existing real headless-Chrome test harness was used. Cross-browser/physical-device/screen-reader testing and complete WCAG certification are not claimed.

Live booking-form initialization is BLOCKED by existing local booking_attempts missing action (BUG-075). Browser-only successful guest session/empty history fixtures permit form-layout checks while retaining real catalogue/account data; these are not live persistence tests. Original failure screenshots are retained as live-error-booking-*.png.

Final built-site heading assertions PASS: 126 width/theme observations, actual loaded display font, inner weight 700, no observed H1 clipping/page overflow. Four 200% root-text layout checks PASS. Actual toolbar zoom remains untested. Inspected mobile/dark desktop form screenshots are explicitly fixture-assisted; live booking initialization remains blocked by BUG-075.
