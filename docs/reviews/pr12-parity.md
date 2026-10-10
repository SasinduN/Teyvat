# #12 parity audit: 10 October 2026

The goal: the live site looks and behaves like #12 (merged as `b46de13`,
reverted by #13), apart from the differences we keep on purpose.

## How this was made

- **Reference:** #12's screenshots in `docs/reviews/ui-review-2026-10-09/`
  (`*-after.jpg`), and #12's own build: `npm run screenshots -- --base
  b46de13 --dark` built `b46de13` and `main` (`1477d65`) side by side, each on
  a scratch database. Every page type, 1280 px and 375 px, light and dark,
  plus the phone menu, the enquiry form and the map with a place picked from
  Quick Jump. (The script now covers `/explore`, `/plan`, `/journal` and that
  map state; it didn't before.)
- **Code:** `git diff b46de13 1477d65 -- src` for every component, page and
  stylesheet #12 touched.
- **The map in the browser:** `/explore` and a tour page on `main`, light and
  dark, with a listener for `securitypolicyviolation` and console errors,
  while clicking through Quick Jump and zooming in and out.

Photos differ between the two builds because #12 used the Wikimedia photos
(hardcoded overrides) and `main` uses the rows' own photos. That isn't a
design difference and isn't listed. A few seed photos 404 locally; production
reads its photos from R2.

## The map: what's actually missing

On `main` the map has everything #12's had: the Map Guide legend with the
location count, the category marker icons (inline SVG from Lucide, no
`data:` URLs), the filter chips with counts, the side panel (photo, region,
rating, best time, elevation, top experiences, Open in Google Maps, Explore
<place>), Quick Jump, and marker ↔ panel syncing.

**No CSP violations and no console errors** on `/explore` or a tour page,
in either theme, while picking places and zooming (20 markers, legend
present, tiles loaded). The `data:` tile images #12 tripped over were fixed
in PR 0 (`src/lib/leaflet.ts`).

So the gaps are in how it looks, not what it has (rows M1–M8 below). **Not
verified: production.** If the live map shows no tiles, check that
`VITE_CARTO_KEY` is set in Railway and was set **before the last build** (Vite
inlines it at build time); without it CARTO serves "API key required" tiles.

## Decisions

"Restore" means bring #12's version back in this PR. "Keep main" says why
not.

### Glass (every surface)

| # | Surface | #12 | main (before this PR) | Changed by | Decision |
|---|---|---|---|---|---|
| G1 | Glass base | tint + a faint reflection gradient, blur 14 px, saturate 118 %, brightness 1; inset top highlight and bottom shade | tint only, blur 14 px, saturate 118 %; inset top highlight | PR 2 (#22) | **Restore**: reflection, bottom shade; blur 16 px desktop |
| G2 | Phone blur | 10 px | 8 px | PR 2 | **Restore** 10 px (still modest) |
| G3 | Depth (`glass3d`): inner edge light and grain (`/images/glass-noise.svg`) on the Plan Your Journey box, the plan page's box and card captions | yes | no | PR 2 / PR 4 (#24) | **Restore** as `.glass--3d` (same-origin SVG: CSP unchanged) |
| G4 | Navbar, scrolled | `photo / .93`, blur 16 px | `photo / .9`, blur 14 px | PR 2 | **Restore** |
| G5 | Navbar, at the top of a page | transparent; the hero's own top gradient (`.48`) under it | its own dark gradient (`.82 → .3`) | PR 2 | **Restore** transparent; the photo carries a band along its top (`.62 → .38` at 5.5 rem → clear at 12.5 rem, `--photo-top-shade`) |
| G6 | Hero secondary button ("Explore Sri Lanka") | pearl tint `.1`, pearl edge, no sheen | dark tint `photo / .55` | PR 4 | **Restore**. The slide controls beside it sit where the photo is clear, so they get dark glass (`photo / .58`) instead of the pearl tint (1.0:1 measured) |
| G7 | Destination card caption | dark glass `photo / .58`, blur 8 px, grain | dark glass `photo / .9`, blur 14 px | PR 4, PR 5 (#26) | **Restore** `.58`, 12 px blur and grain; the card's own gradient is darker only under the caption (`/60` at 45 %, was `/40`), which is what keeps its gold label at AA |
| G8 | Rating / days / price chips on photos | `photo / .58`, blur 8 px | `photo / .9` | PR 4, PR 5 | **Restore partly**: `photo / .78` with blur (`--glass-inverse-subtle`). At `.58` small gold text on a bright photo measured 2.8–3.8:1; a gradient can't sit under a chip at the top of a photo |
| G9 | Explore search bar | dark glass `photo / .9` + blur, the container's width | solid teal (`--brand-secondary`), narrower, pre-#12 layout | never ported (PR 3, #23) | **Restore** |
| G10 | Map legend, Key, Quick Jump, route chip | `surface / .88`, blur 12 px | `pearl / .82` (dark: `surface / .95`), blur 14 px | PR 3, PR 5 | **Keep main** in the dark theme (`.95`, no reflection): at #12's `.86` the lagoon text measured 2.5–3.5:1 on bright tiles. Light `.82` with #12's reflection |
| G11 | Map side panel | solid `--inverse-surface` | same | — | no difference |
| G12 | `/plan` options panel | `white / 5 %`, `backdrop-blur-xl` | same | — | no difference |
| G13 | Plan Your Journey box (home), "Let us take care of the details" (`/plan`) | `pearl / .82` + reflection + depth + grain | `pearl / .82` | PR 4 | **Restore** reflection and depth (G1, G3) |
| G14 | Modals (enquiry, search, hidden gem, photo story) | `black / .8–.9` backdrop, `backdrop-blur-md/lg`, solid panel | same | — | no difference |
| G15 | Reduced transparency, no `backdrop-filter` | solid | solid | — | **Keep**: required |
| G16 | Phone menu | solid | solid | — | **Keep**: required |

### Buttons and colour

| # | Where | #12 | main | Decision |
|---|---|---|---|---|
| B1 | Primary button on the page | deep emerald, white text, reflection and sheen, lifts and glows on hover | gold, dark text, flat | **Restore** |
| B2 | Primary on photos and dark sections (header "Plan Your Trip", hero "Plan Your Journey", Build My Journey, Subscribe, map "Explore <place>", phone menu) | pearl, emerald text | gold | **Restore** |
| B3 | Primary, dark theme | lagoon `#3AB5A3`, dark text | gold | **Restore** |
| B4 | Icon buttons (theme, search, menu, close) | round, pearl edge, light tint | bare icons (`ghost-inverse`) | **Restore** |
| B5 | Buttons not using the shared style (planner, hidden gem "Include in My Journey", map buttons, footer Subscribe, Request Custom Quote) | `te-button` | gold Tailwind fills | **Restore** `te-button` |
| B6 | Dark `--background-secondary` | `#17332F` | `#10231F` | **Restore** (text on it measured) |
| B7 | Dark `--brand-secondary` | lagoon soft `#63C9B8` | `#1F7F72` | **Keep main**: it's a fill under white text (chosen chips, Quick Jump); `#63C9B8` under white is 2:1 |
| B8 | Dark glass tints | `surface / .54`, strong `.86`, edge `.2`, highlight `.25` | `.58`, strong `.95`, edge `.16`, highlight `.12` | **Restore** `.54`, edge and highlight; **keep** strong `.95` (G10); a fainter reflection in dark (`.04`) |
| B9 | Small gold text on photos | `--accent` gold | paler `--accent-on-photo` | **Keep main**: AA |
| B10 | Faint text (`/50`, `/60` opacities) | yes | `--text-secondary`, `/75` | **Keep main**: AA |

### Layout, type and sections

| # | Page | #12 | main | Decision |
|---|---|---|---|---|
| L1 | Every section heading (`section h2`) | `clamp(1.9rem, 3.6vw, 3.1rem)`, balanced wrapping | Tailwind sizes per component (smaller on detail pages: "About Ella", "Plan a trip to Ella", "Start Somewhere Beautiful") | **Restore** |
| L2 | Section spacing | `clamp(3.5rem, 7vw, 6rem)` | `py-24` (6 rem) | **Restore** |
| L3 | Explore, map header | left-aligned stack, "Explore Sri Lanka" | centred, "Find Your Place on the Map" | **Restore** the layout; **keep main's** heading text: one `<h1>` per page and no heading repeating it (decided on #23) |
| L4 | Map Guide | "Season: …" line when a season is chosen | none | **Restore** |
| L5 | Quick Jump | every place on the map, row as wide as the map | first six, row shrinks to fit | **Restore** |
| L6 | Map, no results | "No destinations match…" message | none | **Restore** |
| L7 | Map phone card | photo beside text, chips wrap, full-width button | chips scroll sideways, small gold button | **Restore** |
| L8 | Map side panel chips | dark raised chips | teal chips | **Restore** |
| L9 | Planner (`/plan`) | left-aligned stack, `te-container`; copy "…build a sample journey from our published destinations…" | centred, "intelligent route engine" copy | **Restore** |
| L10 | Planner options | labelled groups (`role="group"`), `aria-pressed`; changing an option hides the old sample | `<label>`s with no control, no pressed state | **Restore** |
| L11 | Planner sample itineraries | fixed text for the default choices | built from the published destinations | **Keep main**: content comes from the database, never code |
| L12 | Hidden gems, photo stories, journal: containers and headers | `te-container`, `te-section-header` | `max-w-7xl`, centred or Tailwind headers | **Restore** |
| L13 | Hidden gem and photo story cards | keyboard-openable (`role="button"`, Enter/Space), dialogs with a focus trap and Escape | mouse only; dialogs without focus handling | **Restore** (uses `useModalFocus`, as the enquiry modal does) |
| L14 | Journal author | initials (`AuthorAvatar`) | the author's photo | **Keep main**: photos come from the rows (decided in PR 4) |
| L15 | Intro collage photos | Wikimedia, hardcoded | Unsplash | **Keep main**: no Wikimedia |
| L16 | Search modal | every match (the list scrolls) | first six | **Restore** |
| L17 | Skip link ("Skip to content"), `MotionConfig reducedMotion="user"` | yes | no | **Restore** |
| L18 | Scrollbars | thin, teal glass thumb | 8 px teal | **Restore** |
| L19 | Card hover: photo zoom, gold edge glow | yes | lift only | **Restore** |
| L20 | Tour, experience and map-panel photo gradients | `black / .7` to transparent | `black / .9` via `.55` over the whole photo | **Restore** the top of the photo clear: dark only up to the label and title (`/85` → `/70` at 40 % → clear at 75 %) |
| L21 | Hero and page-header overlays | `.62 → .32 (42 %) → transparent (82 %)` | `.8 → .78 (55 %) → .5 → .15` | **Restore** the clear right side: `.8` under the copy (to 37 rem past the container's edge, 47 rem on page headers), then fading out over 30 rem. #12's own overlay failed AA (2.0–4.3); this one passes `browser-hero-contrast` |
| L22 | Phone hero overlay | the same left-to-right gradient | a full-width top-to-bottom one | **Keep main**: the copy spans the width on a phone |
| L23 | Navbar links | from 1280 px (`xl`) | from 1024 px (`lg`) | **Keep main**: the links fit from 1024 px, so laptops get them instead of a menu |
| L24 | Footer social icons | dimmed bare icons ("Coming soon" spans) | round buttons; an unset link has no `href` | **Keep main**: CLAUDE.md's site-settings rule |
| L25 | Footer: "Photography credits", no consent line | | "Photo Credits", consent line and unsubscribe | **Keep main** (#14) |
| L26 | Navbar "Plan Your Trip" on phones | a pearl compass button beside theme, search and menu | only in the menu below 640 px | **Restore** (the logo shrinks a little below 640 px, as in #12) |
| L27 | Explore's search bar position | right under the header, no gap | 40 px gap | **Restore** |

### Keep (intentional, from the brief)

| Rule | Where it shows |
|---|---|
| Strict CSP, no Wikimedia, no `'unsafe-inline'` | the grain is a same-origin SVG file; no `data:` images |
| Photos from the database / R2, never hardcoded | `TravelImage`, `travel-photos.json` and the photo overrides stay out |
| No new "Travel Eye" strings | `brand-strings.test.ts` |
| AA contrast | `browser-contrast`, `browser-hero-contrast`, `browser-glass` run unchanged |
| Modal focus trap and Escape | `useModalFocus` on the enquiry, search, hidden gem and photo story dialogs |
| WhatsApp kept off the slide arrows | hero controls stay `data-keep-clear` |
| CARTO tiles (Voyager, `dark_all`) | `src/lib/mapTiles.ts` unchanged |
| No tests deleted or weakened | pixel baselines move only for sections this PR restyles |
