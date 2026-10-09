# Plan: redo the UI redesign from #12

Status: DRAFT, waiting for approval. Nothing is built until it's approved.

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

## First, before any of this: `main` is red, and #15 isn't deployed

CI failed on `main` at `8250129` (#16's merge) in
`browser-whatsapp.test.ts`:

> phone: never over the map zoom buttons … — "steps aside from the zoom
> buttons", `true !== false`

- The same tree passed CI as #16's pull-request run, so this is a flaky
  timing check, not a code fault.
- **Railway's *Wait for CI* is holding that deploy.** Production is still on
  #14: migration 0013 hasn't run, and the CSP still allows Wikimedia. Both
  are harmless now that no row uses Wikimedia.
- **To deploy #15:** in GitHub Actions, re-run the failed job of run
  `37899931982`. That's yours to do; I haven't.
- PR 0 below fixes the flake.

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
     every page the PR touches, made with `npm run screenshots` (PR 0) and
     committed under `docs/screenshots/<branch>/`;
   - green CI on the last commit;
   - the PR description lists every re-baselined pixel test and why.
4. **Approval by the other teammate.** The author never merges their own
   PR.
5. **Tests are never deleted or weakened.**
   - When a change is intended, the test is updated to assert the new
     behaviour.
   - A pixel baseline moves to a newer commit only for sections the PR
     changes on purpose.
   - Every bug fix comes with a test that fails without it.

---

## Every problem from the review, and its fix

| # | Problem (review) | Cause | Fix | PR |
|---|---|---|---|---|
| 1 | CARTO key ignored; tiles from OSM | `import.meta.env?.VITE_CARTO_KEY` in #12's `mapTiles.ts` probably stopped Vite inlining it, plus the OSM fallback | Not re-applied: `main`'s `mapTiles.ts` stays. `browser-csp`'s keyed-CARTO assertion guards it. | 3 |
| 2 | Images blocked on `/explore` (`img-src` `data:`) | Leaflet 1.9.4 sets a removed or aborted tile's `src` to a `data:` GIF (`emptyImageUrl` in `_removeTile` / `_abortLoading`) to cancel its request. `/explore` pans and zooms more, so it shows. **Probably already happens on `main` when anyone pans**; no test pans with the CSP recorder on. | A small `TileLayer` subclass in `src/lib/leaflet.ts` overriding those two methods to blank tiles with `src=""` (no request, no CSP check). Leaflet's own `_tileReady` guard is unaffected. `browser-csp` gains a pan and two zooms while recording. | 0 |
| 3 | Map filter chips squashed at 375 px | #12's `.te-container :where(.grid, .flex) > * { min-width: 0; }` let the chip buttons shrink below their text | That rule only on `.grid` children (where it was meant for long text), plus `shrink-0` on the chips. New test: at 375 px, no chip's label overflows (`scrollWidth <= clientWidth`) and chips don't overlap. | 2 and 3 |
| 4 | WhatsApp button covers the slideshow's Next button | The new hero controls aren't marked `data-keep-clear` | Mark the controls group `data-keep-clear`, so the button fades over them as it does over the map. New `browser-whatsapp` case: on the phone home page, the Next, Previous and Pause buttons each take the tap. | 5 |
| 5 | New "Travel Eye" strings | Hardcoded in titles, headings, `llms.txt`, labels, ids and storage keys | Visible text goes through `shared/brand.ts`: `/journal` is `pageTitle('Journal')` with an `<h1>` of "Journal" (no brand twice). Internal identifiers become brand-neutral (`.site` root class, `site:theme` storage key, `site-fonts` link id). `llms.txt` isn't brought back (question 3). New test (`brand-strings.test.ts`): the 27 lines in `src/` that say "Travel Eye" on `main` today are an explicit allow-list (`shared/brand.ts` is the source), so any new one fails. | 2 onward (the test in 0) |
| 6 | Scroll-to-top button stacks with WhatsApp over card buttons | Two floating controls, only one with keep-clear rules | Not brought back (question 4). | n/a |
| 7 | WhatsApp over the `/plan` panel corner | The panel isn't keep-clear | The planner's option grid gets `data-keep-clear`, with a test like 4. | 4 |
| 8 | Low contrast: hero controls, `/plan` hero subtitle, footer "Coming soon" links at 60 % | Thin white outlines and light text on photos | Measured, not eyeballed: a test computes WCAG contrast for those elements (against the darkest overlay pixel of the photo zone) and needs 4.5:1 for text and 3:1 for controls. Fixed with the existing overlay tokens. | 2, 4, 5 |
| 9 | Dark theme only spot-checked | | Its own PR, with the contrast test over every page in both themes (question 2). | 7 |

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
- Re-baselined: Navbar only.
- Screenshots: every page, since this changes the header and footer
  everywhere.

### PR 3: `/explore`: the map and hidden gems
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

### PR 4: `/plan` and `/journal`
- `PlanPage` (the planner, using `main`'s `src/lib/planner.ts` and
  `travelTiming.ts` from #11) and `JournalPage` (articles and photo
  stories). Head tags, sitemap, and "Journal" in `NAV_LINKS`.
- Titles from `pageTitle()` (problem 5). Planner keep-clear (problem 7).
- Bundle report: Plan and Journal rows.

### PR 5: the home page
- The new hero, with slide controls marked `data-keep-clear` and their
  contrast fixed (problems 4 and 8).
- The four destination cards and the "Plan Your Journey" call to action.
- The map, planner, hidden gems and journal sections leave home: they live
  on the PR 3 and PR 4 pages.
- `LEGACY_HOME_SECTIONS`: `/#explore-map`, `/#planner`, `/#journal` and
  `/#hidden-gems` redirect in the browser. The server's `?tour=` and
  `?destination=` 301s are untouched.
- Re-baselined: DestinationSpotlight.

### PR 6: the other pages, cards and modals
- `PageHero`, the cards, list and detail pages, About, the 404, the enquiry
  form and modal, the search modal.
- Re-baselined: FeaturedExperiences, ToursSection, ExperiencesSection,
  JournalSection, SearchModal and the enquiry modal.
- The Contact-scroll fix lands here, if PR 3 hasn't already needed it.
- May split in two (pages; modals and forms) if the screenshots get too
  many to review.

### PR 7: dark theme (question 2)
- The theme toggle, `theme-init.ts` (CSP-safe module script) and the dark
  palette.
- The contrast test runs over every page in both themes.

### PR 8: admin restyle
- #12's 14 `src/admin/` files, on top of `main`'s admin, which now includes
  the Photo credits page.
- Screenshots of every admin page.

**Not brought back from #12:**

- `AGENTS.md`, which duplicates and contradicts CLAUDE.md;
- the ~30 audit Markdown files (about 9,000 lines);
- the Python audit scripts;
- `scripts/verify-live-content.ts`;
- `public/llms.txt` (question 3).

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
>   and 375 px (`npm run screenshots -- --base origin/main`, committed under
>   `docs/screenshots/<branch>/`);
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

## Questions

1. **The order of PRs 3 to 5.** The plan adds the new pages before taking
   sections off home, so content is never missing; home briefly shows the
   map on both pages. OK, or would you rather do home first?
2. **The dark theme:** in (PR 7) or out? It doubles the screens to review
   and test.
3. **`llms.txt`:** leave it out (my recommendation: no clear benefit, and
   it's another brand string), or serve it from the server using
   `shared/brand.ts`?
4. **The scroll-to-top button:** leave it out (my recommendation: browsers
   and phones have their own, and it collides with WhatsApp), or bring it
   back with the keep-clear rules?
