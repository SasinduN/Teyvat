# Navigation audit — 2026-10-08

Problem → root cause: Explore pointed to /destinations#explore-map. The hash-first active matcher correctly activated the section label while the page still had a Destinations hero, producing the reported mismatch. Simply hardcoding an underline would leave that routing ambiguity.

Files: shared/site-paths.ts/page-meta.ts, App.tsx, ExplorePage.tsx, DestinationsPage.tsx, DestinationExplorer.tsx, Navbar.tsx, server/pages/pages.ts; public-ui and affected browser tests; bundle/audit tooling and llms.txt.

Fix: existing map/QuickSearch/hidden gems moved into /explore with its own hero/title/metadata. /destinations remains the filtered catalogue. Existing detail routes and three-section Home remain. No duplicate catalogue inside Explore or Home.

Desktop/mobile Navbar use the shared current-path/hash matcher and SiteLink, avoiding NavLink's pathname-only aria-current behavior for section links. One appropriate target receives data-active and aria-current; hover only changes color. Contact is aria-current=location at /about#contact; ordinary route links use page. Nested destination/experience/tour/article paths activate their parent. Root matches only /. Unknown /about-us does not activate About. Plan has its separate CTA.

| URL | Active item |
|---|---|
| / | Home |
| /explore, /explore#explore-map | Explore |
| /destinations, category query, /destinations/ella | Destinations |
| /experiences and details | Experiences |
| /tours and details | Tours |
| /journal and articles | Journal |
| /about, /about#team | About |
| /about#contact | Contact |

Compatibility: old /destinations#explore-map and #hidden-gems redirect client-side to /explore preserving search/hash/state; fragments never reach Express. /destinations?mapTour=... redirects 301 to /explore?mapTour=...#explore-map. Shared tour map links now target Explore. Old Home #explore-map/#hidden-gems preserve their section fragments on Explore. Browser back/forward uses router location, not a hardcoded class. Direct /explore refresh returns 200 and its own metadata; sitemap includes it through existing fixed-page registry.

Verification: fixture route/navbar markup and memory-router history checks PASS; production route/legacy query/trailing slash/status checks PASS. Browser click, old-hash redirect, mobile drawer focus and direct rendered refresh NEEDS MANUAL VERIFICATION. Updated map/browser test destinations reflect the new route; those files remain blocked by infrastructure, not claimed passed.
