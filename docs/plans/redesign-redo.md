# Plan: redo the UI redesign from #12

Status: **DONE** (10 October 2026). PRs 0–5 are merged (#17, #19, #22, #23,
#24, #26), with the modal focus trap (#27). #12 parity (#28), `llms.txt`
(#29) and the scrollbar-gutter fix (#30) are the last three. Approved
2026-10-09, with these decisions:

1. **Order:** the new pages first (`/explore`, `/plan`, `/journal`), then
   trim the home page. The order below stands.
2. **Dark theme: in, as PR 7** (now PR 5; requirements under PR 5). PR 2
   defines every colour as a theme token, so PR 5 only adds the dark values.
3. **The three extras are in:**
   - the scroll-to-top button, in PR 2;
   - `llms.txt`, as PR 6b (now its own small PR, any time);
   - the admin restyle, as PR 8 (now PR 6), last.

The PRs are built by the owner's Claude Code, re-applying the teammate's
#12 design with the corrections below. The teammate reviews and approves
every PR.

## Regrouped (9 October 2026, from PR 2 on)

PRs 0 and 1 are merged (#17, #19). From PR 2, fewer and larger PRs:

| PR | Scope | Was |
|---|---|---|
| 2 | Global styles, colour tokens (#12's palette), the shared glass style, Navbar, Footer, scroll-to-top | PR 2 (#22, merged) |
| 3 | `/explore`, `/plan`, `/journal` | PRs 3 and 4 (#23, merged) |
| 4 | All the remaining public UI from #12: home, the list and detail pages (destinations, experiences, tours), About and contact, the 404, Photo Credits, every card and modal; plus the heading fix (below) | PRs 5 and 6 |
| 5 | Dark theme **and** the admin restyle (visual only), started once PR 4 is merged | PRs 7 and 8 |
| any time | `llms.txt`, its own small PR | PR 6b |

The sections below use the new numbers; "PR 6" (the admin restyle) is now
part of PR 5.

**Decided on #23 (10 October 2026):**

- `/explore` loads Leaflet with the page: its map is below the fold but
  within `LAZY_MARGIN`. Accepted. The home page stays free of map code.
- The `/destinations?mapTour=` 301 is dropped: that URL only existed in
  #12, which never deployed.
- One `<h1>` per page, and no other heading repeating it: `/explore`'s map
  section is "Find Your Place on the Map". PR 4 adds a test over every
  page type.
- From PR 4, a PR description lists at most 10 screenshot pairs to
  attach. The next PR may be built on a branch off the one in review, and
  is pushed once that one is merged and the branch is rebased onto
  `main`.

**Pace:** a redesign PR is pushed and opened as soon as typecheck, tests
and build pass locally. Its description lists the pages that changed and the
screenshot files to attach. The work only stops if something fails or would
go against this plan.

**The glass style (PR 2):**
- one shared set of classes (`src/styles/glass.css`): translucent
  background, `backdrop-filter` blur, border;
- a lighter blur on phones;
- a solid fallback where `backdrop-filter` isn't supported or reduced
  transparency is on;
- text on glass meets WCAG AA.

**Still true:** CI green; the teammate approves and nobody merges their own
PR; "Create a merge commit"; no `'unsafe-inline'` in the CSP; one redesign
PR open at a time; the WhatsApp button stays untouched in PR 2.

#12 (the "glass" redesign, dark theme, and the `/explore`, `/plan` and
`/journal` pages) was reverted by #13, and
`docs/reviews/ui-review-2026-10-09.md` lists its problems. This plan brings
the design back:

- in small PRs, starting from current `main`;
- with every problem the review found fixed;
- keeping what it praised.

Nothing is re-applied wholesale. Each PR takes the relevant parts of #12's
diff (`git diff 12c972a b46de13 -- <paths>`), and reworks them where this
plan says.

## Before PR 0: `main` was red, holding #15's deploy

CI failed on `main` at `8250129` (#16's merge), in a flaky timing check in
`browser-whatsapp.test.ts`: "steps aside from the zoom buttons". The same
tree passed as #16's PR run. *Wait for CI* held the deploy, so production
stayed on #14. On 9 October the failed job of run `37899931982` was
re-run. PR 0 fixes the flake.

---

## Ground rules for every PR

1. **Branch from current `main`.** Merge with a merge commit, not a squash:
   the pixel tests read baseline components with `git show <commit>`, so
   the commits must survive the merge.
2. **Keep `main`'s version wherever #14 or #15 touched the same thing:**

   | Area | Keep from `main` | Drop from #12 |
   |---|---|---|
   | Map tiles | `src/lib/mapTiles.ts`, `shared/map-tiles.ts`: CARTO only, key read as `import.meta.env.VITE_CARTO_KEY` | the OpenStreetMap fallback and `import.meta.env?.` |
   | Image hosts / CSP | `shared/image-hosts.ts`, `security-headers.ts`: Unsplash, R2, CARTO | Wikimedia, OSM |
   | Photos | rows' own `image` / `gallery`; credits from `image_credits` | `TravelImage`'s credited-original fallback, `image-retries`, `responsive-image`, `travel-photos.json` lookups |
   | `/photo-credits` | `src/pages/PhotoCreditsPage.tsx` (database), its head tags and sitemap entry | #12's own `PhotoCreditsPage` |
   | Footer | the newsletter wiring, consent line, Photo Credits link and wrapping bottom bar | #12's newsletter code (restyle on top of `main`'s) |
   | Tests | `browser-csp` (Unsplash on `/`, `/photo-credits`, `/unsubscribe`, admin credits), `security`, `pages` | #12's edits to them, unless this plan says otherwise |

   #12's tests of deleted code (`public-photos`, `image-retries`,
   `responsive-image`) aren't brought back.
3. **Evidence in every PR:**
   - before/after screenshots, desktop (1280 px) and phone (375 px), of
     every page the PR touches, made with `npm run screenshots` (PR 0) into
     `docs/screenshots/<branch>/`, which is git-ignored. Screenshots are
     never committed: the PR description lists the pages that changed (the
     script's `summary.md`) and the author drags those pairs into the PR on
     GitHub. A PR with no visual change says "no visual change: X/N
     identical, the rest were animation timing", with no images. Once PR 5
     has merged, in light **and** dark;
   - green CI on the last commit;
   - the PR description lists every re-baselined pixel test and why.
4. **One PR open at a time.** Each is merged before the next starts, so
   the PRs never conflict.
5. **Approval by the other teammate.** Nobody merges their own PR, and
   nobody merges on red CI.
6. **Tests are never deleted or weakened** to make CI pass.
   - When a change is intended, the test is updated to assert the new
     behaviour.
   - A pixel baseline moves to a newer commit only for sections the PR
     changes on purpose.
   - Every bug fix comes with a test that fails without it.

---

## Every problem from the review, and its fix

The PR numbers in this table and the next are the original ones: 3–4 are
now PR 3, 5–6 are now PR 4, 7 is now PR 5 (see **Regrouped**).

| # | Problem (review) | Cause | Fix | PR |
|---|---|---|---|---|
| 1 | CARTO key ignored; tiles from OSM | `import.meta.env?.VITE_CARTO_KEY` in #12's `mapTiles.ts` probably stopped Vite inlining it, plus the OSM fallback | Not re-applied: `main`'s `mapTiles.ts` stays. `browser-csp`'s keyed-CARTO assertion guards it. | 3 |
| 2 | Images blocked on `/explore` (`img-src` `data:`) | Leaflet 1.9.4 sets a removed or aborted tile's `src` to a `data:` GIF (`emptyImageUrl` in `_removeTile` / `_abortLoading`) to cancel its request. `/explore` pans and zooms more, so it shows. **Probably already happens on `main` when anyone pans**; no test pans with the CSP recorder on. | A small `TileLayer` subclass in `src/lib/leaflet.ts` overriding those two methods to blank tiles with `src=""` (no request, no CSP check). Leaflet's own `_tileReady` guard is unaffected. `browser-csp` gains a pan and two zooms while recording. | 0 |
| 3 | Map filter chips squashed at 375 px | #12's `.te-container :where(.grid, .flex) > * { min-width: 0; }` let the chip buttons shrink below their text | That rule only on `.grid` children (where it was meant for long text), plus `shrink-0` on the chips. New test: at 375 px, no chip's label overflows (`scrollWidth <= clientWidth`) and chips don't overlap. | 2 and 3 |
| 4 | WhatsApp button covers the slideshow's Next button | The new hero controls aren't marked `data-keep-clear` | Mark the controls group `data-keep-clear`, so the button fades over them as it does over the map. New `browser-whatsapp` case: on the phone home page, the Next, Previous and Pause buttons each take the tap. | 5 |
| 5 | New "Travel Eye" strings | Hardcoded in titles, headings, `llms.txt`, labels, ids and storage keys | Visible text goes through `shared/brand.ts`: `/journal` is `pageTitle('Journal')` with an `<h1>` of "Journal" (no brand twice). Internal identifiers become brand-neutral (`.site` root class, `site:theme` storage key, `site-fonts` link id). `llms.txt` comes back built from `shared/brand.ts` (its own PR). New test (`brand-strings.test.ts`): the 27 lines in `src/` that say "Travel Eye" on `main` today are an explicit allow-list (`shared/brand.ts` is the source), so any new one fails. | 2 onward (the test in 0) |
| 6 | Scroll-to-top button stacks with WhatsApp over card buttons | Two floating controls, only one with keep-clear rules | Rebuilt in PR 2 on the same `data-keep-clear` rules as WhatsApp, with tests (see PR 2). | 2 |
| 7 | WhatsApp over the `/plan` panel corner | The panel isn't keep-clear | The planner's option grid gets `data-keep-clear`, with a test like 4. | 4 |
| 8 | Low contrast: hero controls, `/plan` hero subtitle, footer "Coming soon" links at 60 % | Thin white outlines and light text on photos | Measured, not eyeballed: a test computes WCAG contrast for those elements (against the darkest overlay pixel of the photo zone) and needs 4.5:1 for text and 3:1 for controls. Fixed with the existing overlay tokens. | 2, 4, 5 |
| 9 | Dark theme only spot-checked | | PR 5: the contrast test over every page type in both themes, plus screenshots of each. | 5 |

## The 22 tests #12 failed, one by one

| Test (file) | Failing | What it means | Handling |
|---|---|---|---|
| `browser-home-baseline`: Navbar ×2 | the Navbar was redesigned | intended | PR 2 moves the **Navbar's** baseline commit to the approved design, with screenshots. The test keeps guarding against later, unintended changes. |
| `browser-home-baseline`: DestinationSpotlight, FeaturedExperiences, ToursSection, ExperiencesSection, JournalSection, SearchModal ×2 each (12) | restyled | intended | Each section's baseline moves only in the PR that restyles it (spotlight in 5; the others in 6). PR 0 refactors the test from one `BASELINE_COMMIT` to a commit per section, with no baseline changed in PR 0. |
| `browser-inquiry` ×2 | the modal restyled, compared with `faed6bc` | intended | Moves in PR 6, which restyles it. PR 2's global styles must leave it pixel-identical; the test proves that. |
| `browser-csp`: keyed CARTO tiles | OSM, not CARTO | bug | Problem 1: `main`'s `mapTiles.ts` stays. |
| `browser-csp`: nothing blocked | `data:` images | bug | Problem 2. |
| `browser-map`: "nothing of the map at page load" | on `/explore` the map is near the top, so it loads at once | needs a decision | The assertion stays. `/explore` keeps a full-height `PageHero` and intro above the map, so at the test's 1280×900 the map starts below the fold and still loads lazily. If the approved design can't, the PR says so and the reviewer decides; the test isn't loosened quietly. |
| `browser-pages`: Explore + Contact | "timed out waiting for the contact section at the top" | **bug**: #12 broke `/about#contact` scrolling | Fix `goToSection` / focus in `PublicLayout` so the hash target lands at the top. The test asserts both (Explore lands on `/explore` with focus on its `<h1>`). |
| `browser-pages`: Leaflet only on map pages | null `scrollIntoView`: #12's test looked for `#explore-map` on `/destinations`, which has none | test bug | The test checks `/explore` and the tour page have Leaflet, and that home, `/plan`, `/journal`, `/destinations` and the rest don't. |
| `browser-whatsapp`: message follows the page | null `.click()`: "View route on map" moved | test bug | The test follows the button to its new place (the Tours list) and still asserts the message names the tour while its route is on screen. |

**Tests #12 weakened, restored:**

- `browser-routes`: `assertSameView` (✕ or Escape return to the exact view
  before the route) comes back. It's checked on `/explore`.
- `browser-pages`: "well down the page" goes back to more than 1,000 px. If
  the Tours list is shorter than that after the redesign, the test scrolls
  a page that's long enough.
- `browser-pages`: "Plan Your Trip carries the page's subject". The Navbar
  button becomes a link to `/plan` (intended), so the test asserts the
  equivalent: the enquiry buttons on `/destinations/ella` and on `/plan`
  carry "Ella" and "Custom Travel Journey Request".

## What the review praised, kept

- **Visible keyboard focus:** #12's 3 px gold outline with a dark ring
  (`:focus-visible` on links, buttons and form controls, public and admin)
  comes back in PR 2. New test: Tab to the first five controls on home, at
  both widths, and each has a visible outline.
- **The smaller JavaScript bundle.** The saving had two causes:
  - `InquiryModal` and `SearchModal` became lazy chunks in `PublicLayout`;
  - the Navbar stopped using `framer-motion`.

  The first comes back in PR 1 with no visual change; the second in PR 2
  with the Navbar. `#12`'s entry was 102.7 KB of JS gzipped, against 139.1 KB
  on `main` today.
- **Bundle report.** `scripts/bundle-report.ts` gets a row for each new page
  in the PR that adds it (Explore, Plan, Journal). PR 0 makes the script
  fail if `src/App.tsx` lazily loads a page it doesn't list, so none can be
  forgotten. Every PR description includes the report, before and after.

---

## The PRs

Each is independently mergeable and leaves `main` green. The sizes are
rough.

### PR 0: groundwork (no visible change)
- **CLAUDE.md:** the design rule, below.
- **`npm run screenshots -- --base origin/main`:**
  - builds the base and the branch in throwaway worktrees;
  - serves each from a scratch `*_test` database (the test-database guards
    apply);
  - captures each page (desktop full page, phone full page, plus named
    states: open menu, map, enquiry form) into `docs/screenshots/<branch>/`
    (git-ignored)
    as JPEG, about 150 KB each.

  It's based on the script used for the review.
- **The flaky WhatsApp test:** `expectShown` there waits up to 3 s instead of
  1 s, and the assertion is unchanged. That's a timing tolerance; the
  button's own animation is 300 ms.
- **Problem 2's Leaflet fix**, with `browser-csp` panning and zooming while
  it records.
- **`browser-home-baseline`:** a baseline commit per section; every value is
  still `bf94e25`.
- **`brand-strings.test.ts`** (problem 5), and `bundle-report` failing on an
  unlisted page.

### PR 1: smaller first load (no visible change)
- `InquiryModal` and `SearchModal` become lazy, from #12's `PublicLayout`.
  The honeypot-first rule and `browser-inquiry`'s baseline are untouched.
- The bundle report shows the saving.

### PR 2: design tokens, global styles, Navbar, Footer
- From #12, minus the glass hero rules: `src/styles/palette.css`,
  `glass.css`, `index.css`.
- Brand-neutral class names, and the focus ring.
- `.te-container` scoped (problem 3).
- The Navbar without `framer-motion`.
- The Footer restyled on top of `main`'s newsletter and credits markup.
- **Every colour is a theme token** (a CSS variable in `palette.css`):
  - no hex or `rgb()` left in the components or styles this PR touches;
  - the components PRs 3 to 6 restyle switch from hex to tokens as they
    are restyled;
  - a test fails on a hex colour in `src/components/` or `src/pages/`
    outside an allow-list that shrinks with each PR and is empty by PR 6.

  PR 5 then only adds dark values.
- **The scroll-to-top button:**
  - hidden until the visitor has scrolled down (more than one screen);
  - never overlaps the WhatsApp button, the map's zoom buttons and Quick
    Jump bar, the slideshow controls or the enquiry form's submit button.
    It uses the same `data-keep-clear` mechanism as `WhatsAppButton`
    (fades away rather than covering), and its own spot doesn't collide
    with WhatsApp's;
  - hidden while the enquiry or search modal is open;
  - tests in a new `browser-scroll-top.test.ts`, phone and desktop:
    - hidden at the top, shown after scrolling;
    - never covering any of those controls through a scroll sweep (as
      the WhatsApp test does);
    - never intersecting the WhatsApp button;
    - a click returns to the top and moves focus to the page's `<h1>`.
- Re-baselined: Navbar only.
- Screenshots: every page, since this changes the header and footer
  everywhere.

### PR 3 (part 1): `/explore`, the map and hidden gems
- `ExplorePage`, `paths.explore = '/explore'`, its head tags and sitemap
  entry, and the `/destinations?mapTour=` → `/explore` 301.
  `paths.tourOnMap` too.
- The map section restyled, from #12, minus `mapTiles.ts`. Chips fixed
  (problem 3).
- `browser-map`, `browser-routes`, `browser-whatsapp` and `browser-csp`
  pointed at `/explore` as described above, with `assertSameView` restored.
- **Home keeps its own map until PR 5**, so nothing disappears in between;
  the Navbar's "Explore" moves to `/explore` here.
- Bundle report: an Explore row.

### PR 3 (part 2): `/plan` and `/journal`
- `PlanPage` (the planner, using `main`'s `src/lib/planner.ts` and
  `travelTiming.ts` from #11) and `JournalPage` (articles and photo
  stories). Head tags, sitemap, and "Journal" in `NAV_LINKS`.
- Titles from `pageTitle()` (problem 5). Planner keep-clear (problem 7).
- Bundle report: Plan and Journal rows.

### PR 4 as built (10 October 2026)

Parts 1 and 2 below in one PR, with these specifics:

- **Kept from `main`:** photos from the rows (no `TravelImage`), so
  `IntroSection` keeps its Unsplash photos and articles their authors'
  photos (#12's initials and Wikimedia photos aren't brought back). The
  modals keep their behaviour: #12's labels and look, not its focus-trap
  hook (`useModalFocus`, used by the Navbar's menu), which would be its own
  change. `CTASection` goes: nothing uses it once home is trimmed.
- **The hero's "Explore Sri Lanka"** goes to `/explore` (main's went to
  the map; #12's to `/destinations`), "Plan Your Journey" to `/plan`.
- **Problem 8, measured:** `browser-hero-contrast` replaces each header's
  photo with white (the worst case), captures the background with the text
  hidden, and measures every text, and the icons of icon-only controls,
  against the pixels behind them: 4.5:1, 3:1 for large text and icons.
  #12's overlays failed it (2.0 to 4.3); the overlays are darker under the
  text, and small gold text on photos is a paler gold (`--accent-on-photo`).
- **A bug found on the way:** `preventScrollReset` only works with the
  data router, so clearing a route on `/explore` and picking a category on
  `/destinations` jumped to the top and moved focus. `KEEP_SCROLL`
  (`src/lib/ScrollRestorer.tsx`) fixes both, with tests.
- **Tests that used the home page's map and sections** now use `/explore`,
  `/tours` and `/journal`, assertions kept. `browser-map` test 1 keeps
  "nothing of the map at page load" on the home page; on `/explore` it
  checks Leaflet isn't preloaded and arrives after the page's own chunk.

### PR 4 (part 1): the home page
- The new hero, with slide controls marked `data-keep-clear` and their
  contrast fixed (problems 4 and 8).
- The four destination cards and the "Plan Your Journey" call to action.
- The map, planner, hidden gems and journal sections leave home: they live
  on the PR 3 and PR 4 pages.
- `LEGACY_HOME_SECTIONS`: `/#explore-map`, `/#planner`, `/#journal` and
  `/#hidden-gems` redirect in the browser. The server's `?tour=` and
  `?destination=` 301s are untouched.
- Re-baselined: DestinationSpotlight.

### PR 4 (part 2): the other pages, cards and modals
- `PageHero`, the cards, list and detail pages, About, the 404, the enquiry
  form and modal, the search modal.
- Re-baselined: FeaturedExperiences, ToursSection, ExperiencesSection,
  JournalSection, SearchModal and the enquiry modal.
- The Contact-scroll fix lands here, if PR 3 hasn't already needed it.
- May split in two (pages; modals and forms) if the screenshots get too
  many to review.

### `llms.txt` (its own small PR, any time)
- `GET /llms.txt`, served by Express like `sitemap.xml`, and only when
  `SITE_INDEXABLE=true` (otherwise a 404, as the sitemap is).
- Generated per request from **published** rows only: destinations,
  experiences, tours and articles (title, link, one-line description).
  The fixed pages come from `paths` and `PAGE_TITLES`.
- The site name comes from `shared/brand.ts`, and every link is absolute,
  from `PUBLIC_SITE_URL` (or the request's origin, as for the sitemap).
- Never `/admin`, `/api`, drafts, settings, enquiries or anything private.
  Values go through the same escaping as the sitemap.
- Tests in `pages.test.ts`: 404 when not indexable; published rows only (an
  unpublished one is absent); absolute URLs from `PUBLIC_SITE_URL`; the
  brand from `brand.ts`; no `/admin` or `/api`.

### PR 5 as built (10 October 2026)

- As planned below: dark tokens, `public/theme-init.js`, the toggle,
  `site:theme`, CARTO `dark_all` swapped in place, the admin restyle
  (visual only: #12's drawer focus trap and its editor cache change are
  left out).
- **Contrast, measured everywhere.** `browser-contrast` checks every page
  type in both themes at both widths: each photo is painted white (the
  worst case), the text hidden, and every piece of text and icon-only
  control is measured against the pixels behind it. It found about a
  hundred shortfalls, in both themes, from earlier PRs as well; fixed with
  tokens rather than one by one (faint text, chips on photos, gold text,
  text on gold, the dark teal fill, photo-card gradients) plus two layout
  faults.
- The hex guard covers `src/admin`; only `WhatsAppButton` is left.
- `npm run screenshots -- --admin` captures the admin, signed in.

### PR 5: dark theme (and the admin restyle, below)
- **Tokens:** PR 2 made every colour a variable. This PR adds the dark
  values under `:root[data-theme="dark"]`, and the light values stay the
  defaults.
- **Which theme:** the system preference (`prefers-color-scheme`) unless
  the visitor has chosen, with a visible toggle in the Navbar (labelled
  "Switch to dark/light theme"). The choice is kept per visitor in
  `localStorage` (`site:theme`); a blocked `localStorage` falls back to the
  system preference without errors. The toggle follows system changes
  while there's no saved choice.
- **No flash of the wrong theme, with no inline script:**
  - `public/theme-init.js`, a tiny classic (render-blocking, not
    `type="module"`, which is deferred) same-origin script, linked in
    `<head>` **before** the stylesheet;
  - it sets `data-theme` and `color-scheme` on `<html>` before first paint;
  - `<meta name="color-scheme" content="light dark">` too.

  `script-src 'self'` already allows it, and `'unsafe-inline'` is never
  added. A test loads every page type with each saved choice and each
  system setting, and checks `data-theme` is right at first paint
  (`DOMContentLoaded`, before any React render).
- **Contrast:** the contrast test (problem 8) runs on every page type in
  both themes: 4.5:1 for text and 3:1 for controls and focus rings.
- **The map:** CARTO's dark basemap (`dark_all`, same host
  `basemaps.cartocdn.com`, same key) when dark, so the CSP is unchanged.
  The existing warm tint is re-tuned for dark so markers and labels stay
  readable, checked in screenshots and by the marker contrast test.
  Switching theme swaps the tile layer without reloading the map.
- **Screenshots:** every page type, light and dark, at 1280 px and 375 px.

### PR 5 (continued): admin restyle
- #12's 14 `src/admin/` files, on top of `main`'s admin, which now includes
  the Photo credits page.
- **Visual only:** no change to routes, requests, validation, permissions
  or behaviour. Every existing admin test passes unchanged.
- Screenshots of every admin page, light and dark.

**Not brought back from #12:**

- `AGENTS.md`, which duplicates and contradicts CLAUDE.md;
- the ~30 audit Markdown files (about 9,000 lines);
- the Python audit scripts;
- `scripts/verify-live-content.ts`;
- #12's static `public/llms.txt`, replaced by the generated one (its own PR).

---

## CLAUDE.md change (in PR 0)

Replace the standing rule:

> **The public design is approved and frozen.** Any change to markup,
> `className` or layout in `src/components/` must be called out in the plan
> before it is written. Review with: `git diff demo-baseline -- src/components/`

with:

> **Public design changes need evidence and a second approval.** Any change
> to markup, `className`, styles or layout of the public site (or the
> admin):
>
> - is called out in its plan first;
> - includes before/after screenshots of every page it touches, at 1280 px
>   and 375 px (`npm run screenshots -- --base origin/main`, saved in the
>   git-ignored `docs/screenshots/<branch>/` and attached to the PR on
>   GitHub, never committed);
> - is approved by the other teammate (never the author) before merging.
>
> A pixel test (`browser-home-baseline`, `browser-inquiry`) is re-baselined
> only for sections the PR changes on purpose, in that PR, and listed in its
> description. Tests are never deleted or weakened to get a change through.
> Merge with a merge commit, not a squash: the baselines are commits.

The `demo-baseline` line and the "public page must look identical to
`demo-baseline`" check under **Checks** are replaced by the same rule.
**GitHub admin:** to enforce the second approval, turn on *Require a pull
request review (1 approval)* and *Require status checks: `checks`* for
`main`. The review found #11 self-merged and #12 merged red.

## Decisions (9 October 2026)

1. Order: the new pages first, then the home page trim.
2. Dark theme: in, as PR 7 (now PR 5), with the requirements above.
3. Scroll-to-top in PR 2; `llms.txt` as PR 6b (now its own PR); admin
   restyle as PR 8 (now PR 6).
