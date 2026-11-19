# Tours on phones: a row to swipe

Approved 19 Nov 2026. `/tours`, "Routes around the island" (`src/components/ToursSection.tsx`,
the "Tours" block of `src/styles/editorial.css`). No other page uses the component.

## Before

At 375 px each tour stacked as a full-width 3:2 photo, the category label, the title, days and
price, the full description, the "Route:" line and four controls (View Full Journey, Inquire,
Save, View route on map): about a screen a tour. Photo beside text only from 900 px.

## Phones (below 768 px)

- The list is a `<ul aria-label="Tour packages">` of `<li>`s at every width; below 768 px it's a
  row: native horizontal scrolling, `scroll-snap-type: x mandatory`, each card snapping to its
  start, no library and nothing moving the page. Up and down over it still scroll the page (no
  `touch-action`). `overscroll-behavior-x: contain`, no scrollbar.
- Cards are `min(85vw, 26rem)`, so the next one peeks in; a spacer after the last lets it snap
  to the start like the others. The row runs to the screen's edges, its cards in line with the
  page's text.
- Each card: the 3:2 photo (no jump while it loads), title, days and price, the description
  clamped to two lines, then View Full Journey, Inquire and Save, at the bottom of every card so
  the cards are the same height. No category label, route line or "View route on map" on
  phones: the full journey page shows the route and its map.
- Under the row: "2 / 6" and dots that follow the card most in view (`IntersectionObserver`,
  the row as root). A dot tap goes to its tour. The dots are pointer-only: `tabindex="-1"`, the
  group `aria-hidden`, and a tap leaves no focus there.
- Keyboard and screen readers: Previous tour and Next tour, out of sight until one has keyboard
  focus (then both show), `aria-disabled` at the ends so focus stays. The counter reads "Tour 2
  of 6"; a polite live region says "Tour 3 of 6: <title>" after an arrow or a dot, never while
  swiping. Focus moving into a card brings it to the row's start. Nothing advances on its own;
  with reduced motion, arrows and dots jump instead of scrolling smoothly.
- The floating Book a ride / WhatsApp stack isn't changed (nothing new in `AVOID`). The card's
  buttons and the controls keep out of its column instead (`--tour-float-clear`: 1rem from the
  right, 56 px wide, 8 px clear), so it never covers them on a card at rest.

## 768 px and up

Unchanged: stacked from 768 to 899 px, photo beside text from 900 px. The phone controls are
`display: none`.

## Tests

- `browser-tours-swipe`: the swipe (real touch events), the snap, the counter and dots, a dot
  tap with and without reduced motion, the arrows and the live region, Tab into a card, the
  floating stack's column at 320/375/414 px and 100/120%, no sideways page overflow and a clean
  text audit at 320/375/414 px, 100/120%, both themes; at 1280 px no sideways scroll, photo
  beside text, no controls.
- `browser-home-baseline`: a section can now have a `phoneBaseline`. ToursSection's 1280 px
  stays held to `d233e32` (desktop pixel-identical); only its 390 px moves to this design.
