# Current cursor/hero/routing follow-up — 2026-10-08

New source fixes remove the custom cursor component/listeners/RAF/CSS, remaining hero diffusion/reflections and badge pulse, and gate manual slide display on image readiness. Existing responsive image discovery, font deferral, code splitting and gzip caching retained. Dedicated Explore relocates map/discovery code so the Destinations catalogue no longer loads it.

Measured gzip manifest closure in this pass: Home 110.0 → 109.6 KiB; CSS 17.8 → 17.6 KiB. Destinations list 161.7 → 108.4 KiB; map/discovery features load on Explore instead (159.0 KiB initial JS plus 42.5 KiB deferred Leaflet). These are bundle measurements, not TBT/LCP/Lighthouse outcomes. Baseline/final bundle reports: qa-results/web-debug/bundles-before.txt and bundles-after.txt. Live cache/compression equality/MIME checks PASS; detailed final bytes in performance-delivery.json.

Lighthouse retry fails ENOTCACHED in offline mode; prior registry access failed EACCES. Chrome before/after and Edge after fail WinError 10054 before any viewport. No fresh scores, actual LCP node, page/image bytes, reflow trace or timing medians. The supplied 34/95/100/92 and FCP/LCP/TBT/CLS values remain historical inputs. No 90+ score claim. Modern-format generation remains blocked by outbound image access; credits and photograph quality were not sacrificed. Earlier implementation audit below retained.

# Performance audit — 2026-10-08

## Evidence

Existing React 19 / Vite 7 / Express / PostgreSQL application. Repository instructions and current audit/status/bugs/changelog/improvements read before editing. Local development database on port 5433 connected. Production baseline build and bundle report captured before edits; Express production preview used http://127.0.0.1:8082/. No database writes or migrations.

The user's screenshot values are supplied baseline values, not local measurements. Raw screenshots/Lighthouse JSON were not available. Lighthouse was absent; `npm.cmd exec --yes --package=lighthouse -- lighthouse --version` failed fetching the registry with EACCES. Chrome before/after software-rendering audits failed with WinError 10054 before rendering. No successful Lighthouse runs, LCP element identification, trace-based reflow attribution or total page/image transfer measurements.

## Implemented fixes

| Problem → root cause | Files changed | Implementation | Verification |
|---|---|---|---|
| Separate dark header → inherited shared glass surface | Navbar.tsx, index.css, glass.css | Explicit Home route state; transparent unscrolled fixed header; photo-level upper gradient; stable height | Build/markup PASS; geometry/contrast unverified |
| Hero capped on tall screens → clamped 95svh maximum | index.css | 100vh fallback / 100dvh minimum, content-driven height and short-height spacing | Build PASS; rendered widths unverified |
| Late initial photo discovery → JS/content API/page chunk precede image | pages.ts, responsive-image.ts, TravelImage.tsx | One database-selected Home preload with matching responsive candidates; eager/high first image | Production HTML PASS; measured LCP identity and preload reuse unverified |
| Oversized images → fixed Wikimedia thumbnails/originals | responsive-image.ts, TravelImage.tsx, optimize-photos.py | Responsive same-photo thumbnails, original-to-thumbnail candidates, Unsplash modern-format negotiation, optional hashed WebP pipeline | Candidate/retry tests PASS; external delivery/quality BLOCKED |
| Initial JS overhead → navbar motion factory and eager closed dialogs | Navbar.tsx, PublicLayout.tsx, HeroSection.tsx | Plain semantic navbar/hero markup, lazy dialogs | Home gzip closure 152.5 → 110.0 KiB; tests PASS |
| Identity static transfers → Express lacks compression | build-server.mjs, app.ts | Precomputed gzip; negotiation, MIME, Vary, immutable caching | Live HTTP equality/headers/bytes PASS |
| Unnecessary slideshow work → timer ignores viewport/tab visibility | HeroSection.tsx | Visibility observers, cleanup, ready next slide, reduced motion and hover/focus/manual pause | Build/source checks PASS; rendered timing unverified |
| Delayed copy paint → transparent entrance animations | HeroSection.tsx | Immediately visible heading/copy/CTAs | Markup PASS |
| Blocking Google stylesheet | index.html, theme-init.ts | media=print download; external CSP-safe load handler; display=swap retained | HTML PASS; font timing/CLS unverified |
| Repeated hit tests/hidden control layout reads | TravelCursor.tsx, ScrollToTop.tsx | Frame-coalesced cursor hit tests and early return before scroll threshold/modal | Build PASS; no trace-based reduction claim |

## Caching and hosting

Fingerprint assets already had one-year immutable caching; retained. Gzip generated during build:server avoids per-request compression CPU. HTML and API content retain no-cache/revalidation. Mutable public resources retain one-hour caching. No indefinite HTML caching or service worker. Third-party Wikimedia/Unsplash/fonts cache headers are outside project control. Optional generated WebP assets use hashes under /assets once generated and built. Railway edge compression may already exist externally; deployed edge behavior was not measured.

## SEO and experimental audits

Per-route titles/descriptions/canonicals/share metadata and robots/sitemap already exist. SITE_INDEXABLE remains a launch decision; local noindex is intentional and was not removed to improve scores. Exact failed SEO/accessibility-tree audits cannot be inferred from scores. Added factual public llms.txt describing existing routes and planning limitations; it does not override robots or claim availability. Experimental Agentic Browsing pass status is unverified and separate from Lighthouse performance.

## Remaining acceptance

Lighthouse: same Chrome/version/URL/production/content/configuration, mobile/default simulated throttling, three cold runs per revision, median metrics and actual LCP node/trace. Browser: both themes at 320/375/430/768/1024/1440/1920 and short landscape; crop/photo labels, no overflow, header geometry/contrast, menus/focus/search/inquiry/theme/CTAs/slideshow. Image decoding, transfer sizes, CPU tasks and real CLS NEEDS MANUAL VERIFICATION. No 90+ score or Core Web Vitals target achievement is claimed.

Guidance: [responsive preload](https://web.dev/articles/preload-responsive-images), [responsive images](https://web.dev/learn/design/responsive-images?hl=en). Preload addresses the verified source discovery chain; the measured LCP element remains unknown.
