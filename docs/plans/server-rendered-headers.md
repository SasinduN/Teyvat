# Server-rendered page headers

Handoff Task 10, Part B. **A plan only: nothing is built.** It answers the two biggest findings of
the audits:

- **No content without JavaScript** (`docs/reviews/seo-audit-2026-11.md`, section 1, B1). Express
  sends a full `<head>` and an empty `<div id="root"></div>`. Google renders the JavaScript later;
  Bing less reliably; social previews, other crawlers and most AI crawlers see only the head.
- **Slow LCP on phones** (the same audit, and `docs/reviews/audit-2026-11.md`, "Left"). Live,
  Lighthouse mobile: home 5.8 s, `/tours` 4.6 s, Galle 4.7 s. On home the LCP is the headline,
  with about 4.8 s of render delay. It waits for the 107 KB entry to load and run (590 to 990 ms
  of CPU at Lighthouse's 4× slowdown), then for `/api/content`, then for the page's chunk. Until
  then the visitor sees the "Charting your journey" splash.

The idea: Express puts the first screen (the header and its h1, breadcrumbs and photo) in the HTML
it already sends, built from the same React components and the same data. The browser paints it
straight away. React then takes over once it is ready.

## 1. What gets server-rendered

**The first screen of every public page:** the Navbar, and the page's header.

| Page type | Its header | Notes |
|---|---|---|
| Home | `HeroSection`: the headline (Admin → Settings), the subtitle, both buttons, the first slide as a real `<img>` | Only slide 0, as the client's first render (`seenSlides` starts at `{0}`). With bookings on, the ride line too (the server knows `BOOKINGS_ENABLED`). |
| The list pages: `/tours`, `/destinations`, `/experiences`, `/journal`, `/explore`, `/when-to-go`, `/plan`, `/about`, `/photo-credits` | `PageHero`: breadcrumbs, h1, subtitle, the photo | The same title and photo the head already resolves (`resolvePage`). |
| A tour, a destination, an experience, an article, a tour category | `PageHero` with its chips, eyebrow and Save button | The row's own title, crumbs and photo. |
| 404 | The not-found page's header | With its 404 status, as now. |
| Wishlist (`noindex`) | Its header only (the first slide) | **Never the saved items:** they live only in the visitor's browser. |

The photo is a real `<img>` with the same `src`, `srcset` and `sizes` that `TravelImage` builds,
and that the `<link rel="preload">` already uses. So it is still one download.

**Not server-rendered:**

- the maps, the search and enquiry dialogs, the WhatsApp button, the slideshow's other slides and
  controls' state;
- the wishlist's items, and anything else that is per visitor;
- the admin, `/booking` and `/unsubscribe` (their `#root` stays empty, as now);
- the 503 page when the database is down (as now: the bare shell).

**The main text** (a tour's overview and route, a destination's "about") is cheap only if it is
rendered by the page's own section components, not by a separate plain-text version. A separate
version would sit in the viewport on desktop and be replaced by a different layout: that is a layout
shift. So it is a separate, optional PR (PR 3 below). That PR extracts those sections the same way
as the headers, and is measured on its own.

## 2. How React takes over

React has to take over without a flash, a layout shift or a hydration mismatch. There are three ways
to do it.

### A. Full server rendering, with `hydrateRoot`

Render the whole public app on the server with `renderToString`, and hydrate it.

- **For:** the standard way; React attaches to the existing DOM and renders nothing twice.
- **Against:**
  - **Every public component would have to render the same on both sides.** Several don't today:
    - the wishlist reads `localStorage`;
    - `PublicLayout` builds the WhatsApp link from `window.location.origin` while rendering;
    - When to go depends on today's month;
    - the theme toggle's icon depends on the saved theme.
  - **Hidden content without JavaScript.** Framer Motion's entrance animations render `opacity: 0`
    on the server, so without JavaScript most sections would be in the HTML but invisible. That
    defeats the first finding.
  - **Mismatches are expensive.** In React 19 any mismatch throws away the server markup for that
    tree and renders it again on the client: the very flash we want to avoid. It would also stay a
    standing risk for every future change.
  - **Size.** It touches most of `src/`, plus lazy routes on the server and Leaflet guards.
- **Verdict:** the largest change, for little more gain than option C.

### B. A hand-written HTML template per page type

Build the header as a string on the server, like `renderHead` does for the `<head>`.

- **For:** small, with no React on the server.
- **Against:**
  - **The markup is written twice.** Every class or structure change to `PageHero` or `HeroSection`
    has to be made in the template as well. A difference shows as a flash when React replaces it.
  - A test could catch the drift, but the cost stays for as long as the site does.
- **Verdict:** cheap now, expensive later.

### C. Server-render the first screen with the same components, and let React replace it in place (recommended)

How it works:

1. **One pure header component per page type.** Each page's header becomes its own small
   component that takes its row as props (`TourHeader`, `DestinationHeader`, …). The page uses
   it, and so does the server. `PageHero` and `HeroSection` stay as they are. The markup is the same
   by construction, not by copying.
2. **One server entry renders it.** A server-only entry, `src/ssr/first-screen.tsx`, calls
   `renderToString` on the skip link, the `Navbar` and that header. It runs inside a
   `QueryClientProvider` prefilled with the site's content and a `StaticRouter` at the path, so the
   same hooks (`useTours()`, `useBrand()`, …) work unchanged.
3. **The same data as the client.** The content comes from the same query `/api/content` runs,
   moved out of its route into `loadSiteContent()`, and the same mapper the client uses
   (`src/lib/mappers.ts`). The page server already does one settings query per request
   (`loadPageSettings`); this adds the content query that `/api/content` would run anyway.
4. **Express puts the markup inside `#root`:** `<div id="root" data-ssr>…</div>`.
5. **The client waits until it can draw the same thing.**
   - `main.tsx` waits for two things before calling `createRoot(...).render(...)`:
     - the content, `queryClient.ensureQueryData(siteContent)`, which is the request the
       `<link rel="preload">` has already started;
     - the current page's chunk, from a small `routeChunk(pathname)` map shared with `App.tsx`'s
       `lazy()` imports.
   - Meanwhile the server's first screen stays on screen, and its links work (they are real
     `<a href>`).
   - React's first commit then swaps in identical markup:
     - no splash, because the content is already in, so `loading` is false;
     - no Suspense fallback, because the chunk is already loaded.
   - If either takes more than 10 seconds, it renders anyway, as today: the error screen or the
     page.
6. **No hydration, so no mismatch is possible.** `createRoot` replaces the server markup; it never
   compares it.
   - Anything that differs, such as the wishlist count, simply updates, as it does today when a
     page first draws.
   - The server markup has the same size and position as React's, so nothing moves (CLS stays 0).
   - Chrome reports a new LCP candidate only for a larger element, so an identical h1 or photo
     drawn again keeps the server's earlier LCP time. The handover test below checks all three.

**Why C:**

- It gives the whole LCP gain (the header paints from the HTML) and the whole crawl gain (the h1,
  intro, breadcrumbs and nav links are in the HTML).
- It doesn't require the whole app to render on the server.
- It removes the mismatch problem instead of managing it.
- The markup can't drift, because it is the same components.

**Cost:**

- React draws the first screen twice: once on the server, once on the client. That is a few
  milliseconds, and nobody can see it, because the result is identical.
- **Buttons don't respond until the JavaScript has run** (search, the theme toggle, the phone menu,
  Save). Links work throughout. See the open questions.

**Later, if ever wanted:** C can grow into A one page at a time, but nothing here depends on that.

## 3. The rules that must still hold

| Rule | How it holds |
|---|---|
| **CSP:** `script-src 'self'`, no inline scripts, no `'unsafe-inline'` for scripts | The server adds markup only: no `<script>`, no inline data. The client still fetches the preloaded `/api/content`. `browser-csp` must stay at zero violations on every page type. |
| **Inline `style` attributes** (the backlog's "remove `'unsafe-inline'` from `style-src`") | React sets styles through the DOM today, and the CSP doesn't apply to that. In server HTML, the photo's `objectPosition` becomes a `style="object-position:…"` attribute. It is allowed today (`style-src` has `'unsafe-inline'`), but when that backlog item lands, those attributes need to become classes, or the CSP needs `style-src-attr`. The plan records it, and `ssr.test` lists every `style=` in the server markup so it is never a surprise. |
| **No theme flash:** `theme-init.js` stays the first script in `<head>` | It sets `data-theme` before the first paint, and the server markup uses only the colour variables. So it paints in the right theme, palette (`data-palette`) and text size (`data-text-size`), which the server already writes on `<html>`. The site's default mode (`data-default-mode`) is unchanged. Without JavaScript, `theme-init.js` doesn't run, so a no-JavaScript visitor sees the light theme. |
| **Canonical host redirect** | It runs before the page router, so it is untouched. So are the 301s for old links (`/?tour=`), trailing slashes and `/tours/category`: only a 200 or 404 page gets markup. |
| **`noindex` pages** | `/booking`, `/unsubscribe` and the admin get no markup. The wishlist gets its header only. Their `X-Robots-Tag` and `noindex` are unchanged. |
| **Photo URLs from R2** | The same `photoResolver(...).publicPhoto` and photo sets as the head and the preload, so the same R2 URLs and the same `srcset`. `browser-preload` adds a check: the hero photo is requested exactly once. |
| **The wishlist** (client only) | `useWishlist` gets a server snapshot: nothing saved. The server always draws the Navbar's wishlist heart, so the header doesn't shift when the count arrives. |
| **One `h1` per page; AA contrast in every theme** | The same components, so the same h1 and colours. The new tests count the h1s in the server HTML, and again after the handover. |
| **`<body data-route>`** means "this page is on screen" (tests wait on it) | Still set only by React. The server marks its markup with `#root[data-ssr]` instead. |
| **Escaping** | `renderToString` escapes every text and attribute. Nothing goes through `escapeHtml` by hand. |
| **The pixel baselines** (`browser-home-baseline`, `browser-inquiry`) | No visual change is intended. Both must pass unchanged. |

## 4. Expected gain, and how to measure it

**Today:**

- The LCP on these pages waits for the HTML, then the CSS, then 107 KB of JavaScript (loaded and
  run), then `/api/content`, then the page's chunk.
- On home the LCP element is the headline.
- On a tour or a destination it is the header photo. The photo is preloaded, but it can't be drawn
  until React has drawn its `<img>`.

**After:** the header is in the HTML, so it paints once the HTML, the CSS and (for a photo) the
image have arrived. Nothing waits for the JavaScript.

| Page | Now (live, Lighthouse mobile) | Expected | What's left in the way |
|---|---|---|---|
| Home `/` | 5.8 s | **about 2 to 2.5 s** | the HTML (server time includes one more query), the stylesheet, the heading font (it swaps in) |
| A tour (`/tours/island-in-7-days`) | not measured (`/tours` was 4.6 s) | **about 2.5 to 3 s** | the HTML, the stylesheet, the phone-size header photo (already preloaded) |
| A destination (`/destinations/galle`) | 4.7 s | **about 2.5 to 3 s** | the same |

**These are estimates, not promises.** The target is the "good" LCP band (2.5 s) on home. For the
photo pages, the target is under 3 s and a performance score of at least 90 (the backlog's
"Mobile performance to 90"). TBT and INP should not change: the client still renders everything,
just with the header already on screen. CLS must stay 0.

**How to measure:**

- **Tool:** Lighthouse, mobile (its default throttling), **3 runs per page, the median**.
- **Pages:** `/`, `/tours/island-in-7-days` and `/destinations/galle`.
- **When:**
  - **Before:** on production, just before PR 1 merges. Production has the real R2 photos with
    their `srcset`, so local numbers aren't comparable: `docs/reviews/audit-2026-11.md` explains
    why.
  - **After:** on production, once each PR has deployed.
- **Record:** both sets of numbers go in `docs/reviews/`, with the LCP element and its breakdown
  (TTFB, load delay, load time, render delay).
- **Server time:** a `Server-Timing` header on page responses (database, render) shows what the
  extra content query and `renderToString` cost. Target: under 50 ms added to TTFB.

## 5. Risk and size

**Files touched:**

| Where | What |
|---|---|
| **Server** | |
| `server/src/routes/content.ts` | Its queries move into `loadSiteContent()`, used by `/api/content` and by the page server. |
| `server/src/pages/pages.ts` | Puts the first screen inside `#root` for 200 and 404 pages. Adds `Server-Timing`. |
| New: `server/src/pages/first-screen.ts` | Calls the server entry with the path, the content and the settings. |
| `scripts/build-server.mjs` | Builds the server entry as well: the `@` alias, JSX, CSS imports ignored. React is already a dependency. |
| **Client** | |
| New: `src/ssr/first-screen.tsx` | The server entry: skip link, Navbar and the page's header component, by route. |
| `src/main.tsx` | Waits for the content and the page's chunk before the first render (10 s cap). |
| `src/App.tsx` | The page imports move into one `routeChunk` map, used by `lazy()` and by `main.tsx`. |
| About 15 files in `src/pages/*.tsx` | Each page's `PageHero` call moves into a `*Header` component in the same file. No markup or class changes. |
| `src/components/HeroSection.tsx` | Checked to be safe on the server; its effects already run only in the browser. |
| `src/lib/wishlist.ts` | A server snapshot. |
| `index.html` | Unchanged except a marker inside `#root` for Express to fill. |
| **Docs** | `CLAUDE.md` and `.claude/rules/pages-and-head.md`: the rule that a header must be a pure component with no browser-only code while rendering. |

**Tests to add:**

- **`ssr.test`** (no browser), for each page type:
  - the HTML's `#root` has exactly one h1 with the expected text, and the breadcrumbs as links;
  - the header photo's `src`, `srcset` and `sizes` equal the preload's;
  - no `<script>` is added;
  - `/booking`, `/unsubscribe`, the admin and a 503 have an empty `#root`;
  - the wishlist has no saved items;
  - a 404 has the not-found header;
  - every `style=` attribute is listed (see section 3).
- **`browser-ssr-no-js`:** Chrome with JavaScript turned off (`Emulation.setScriptExecutionDisabled`).
  For each page type:
  - the h1 and the photo are visible;
  - the breadcrumb and nav links have real `href`s;
  - at 375 px, nothing scrolls sideways.
- **`browser-ssr-handover`:** with JavaScript, CPU slowed 4×, for home, a tour, a destination and a
  list page:
  - **CLS** from a buffered `PerformanceObserver` is 0;
  - **LCP:** the LCP entry's time is from before the app's first render;
  - **no flash:** a screenshot just before React's first commit and one just after are identical,
    pixel for pixel;
  - the hero photo is requested once;
  - no console errors or React warnings;
  - in dark mode, and with the Ceylon palette and 120% text, the server markup is already right.
- **Unchanged and must pass:** `browser-csp`, `browser-preload`, `browser-pages`,
  `browser-home-baseline`, `browser-appearance`, `browser-text-size`, `browser-contrast`,
  `browser-wishlist`, `canonical-host`.

**The split: 2 PRs, plus 1 optional.** Each has before/after screenshots (they should be identical)
and Lighthouse numbers.

1. **PR 1: the plumbing, and the home page.**
   - `loadSiteContent`, the server entry, `main.tsx`'s wait, `routeChunk`, the Navbar and
     `HeroSection`, and the three new test files (for home);
   - the biggest LCP gain (5.8 s), and it proves the handover.
2. **PR 2: every other page type's header.**
   - The `*Header` extractions and `PageHero` on the server, the 404, and the wishlist's header;
   - the tests extended to every page type.
3. **PR 3 (optional): the main text and the Footer.**
   - A tour's overview and route, a destination's about, and the Footer's links. They're rendered
     by their real section components, only if those have no entrance animation.
   - Only if PR 1 and 2's numbers, or Search Console, show it's worth it.

**Risks:**

| Risk | Mitigation |
|---|---|
| **A component reads `window` while rendering** and crashes on the server | Express catches it, logs it (`describeForLog`) and sends the empty shell, as today. `ssr.test` covers every page type. |
| **The first screen and React's first render differ** (a flash) | The handover test's pixel check. |
| **The extra content query makes TTFB slower** | `Server-Timing`, and the 50 ms target. If it is too slow, a short in-memory cache keyed by `updated_at` is a follow-up. It is not in this plan. |
| **The time until the page reacts is the same as today** | Buttons respond no earlier than now, and Lighthouse's TBT is unchanged. The gain is what the visitor sees, sooner. |

## 6. Open questions for Sasindu

1. **Buttons before the JavaScript.** For the moment between the first screen and the JavaScript
   (up to a second or two on a slow phone), these are visible but do nothing yet: search, the theme
   toggle, the phone menu, and Save. Links work. Is that acceptable? The alternative is to dim them
   until they work, but that is a visible change.
2. **Visitors without JavaScript** get the light theme and the first screen only (the header, plus
   the main text after PR 3). Everything below needs JavaScript, as now. Is that enough?
3. **The split:** home first (PR 1), then the other headers (PR 2). Is PR 3 wanted now, or only after
   the numbers?
4. **The `style` attributes** in the server markup (the photo's focal point) keep the backlog's
   "remove `'unsafe-inline'` from `style-src`" a little harder. Is it OK to note it there and
   solve it when that item comes up?
5. **The splash.** "Charting your journey" would no longer show on a first visit, because the
   header is already there. Is that wanted?
