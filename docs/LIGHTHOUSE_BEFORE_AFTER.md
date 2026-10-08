# Latest verification — complete debugging — 2026-10-08

Fresh Lighthouse remains BLOCKED: offline retry returned ENOTCACHED; Chrome and Edge automation disconnected before any viewport. No new scores, LCP element, timings, transferred-image totals or medians exist. The supplied screenshot values below remain historical, not current measurements.

Final production build PASS. Measured gzip manifest closure: Home JS 110.0 → 109.6 KiB; Destinations JS 161.7 → 108.4 KiB; shared CSS 17.8 → 17.6 KiB. Explore loads its own discovery code. Actual entry HTTP transfer: JS 340,552 identity / 105,006 gzip bytes; CSS 107,233 / 17,881 bytes. These measurements do not establish Lighthouse or Core Web Vitals improvements.

Final read-only HTTP checks: 43 public routes, 47 assets, 13 status/protection/redirect checks PASS; database up. Evidence: qa-results/web-debug/bundles-before.txt, bundles-after.txt, performance-delivery.json, routes-assets-protection.json. Rendered acceptance and full image audit NEEDS MANUAL VERIFICATION; see FINAL_QA.md. Earlier evidence retained below.

# Lighthouse before/after — 2026-10-08

| Metric | Supplied screenshot baseline | Fresh local before | Fresh local after |
|---|---:|---|---|
| Performance | 34 | BLOCKED | BLOCKED |
| Accessibility | 95 | BLOCKED | BLOCKED |
| Best Practices | 100 | BLOCKED | BLOCKED |
| SEO | 92 | BLOCKED | BLOCKED |
| FCP | 2.4 s | BLOCKED | BLOCKED |
| LCP | 7.1 s | BLOCKED | BLOCKED |
| TBT | 580 ms | BLOCKED | BLOCKED |
| CLS | 0.011 | BLOCKED | BLOCKED |
| Speed Index | 6.9 s | BLOCKED | BLOCKED |
| Total page transfer | Not supplied | NOT MEASURED | NOT MEASURED |
| Image transfer | Not supplied | NOT MEASURED | NOT MEASURED |

Supplied opportunity estimates: cache 2,305 KiB; images 2,101 KiB; render blocking 120 ms. These are not verified savings. Agentic Browsing 1/3 is a separate supplied result; new score unmeasured.

## Measured build and HTTP evidence

| Check | Before | After |
|---|---:|---:|
| Home initial JS, gzip manifest closure | 152.5 KiB | 110.0 KiB |
| Home initial CSS, gzip manifest closure | 17.6 KiB | 17.8 KiB |
| Entry JS identity / actual gzip HTTP bytes | Not captured | 342,624 / 105,538 |
| Entry CSS identity / actual gzip HTTP bytes | Not captured | 108,117 / 18,052 |

Home initial JS decreased approximately 27.9%. Bundle measurements do not prove lower TBT. Manifest sizes use default gzip settings; precompression uses level 9, so HTTP sizes differ slightly. Deferred dialogs/other routes still load when used. Corrected bundle-report's stale Home Leaflet flag: the old '+42.5 KiB map on demand' label was a reporting error, not an actual removed request.

Evidence: qa-results/performance/bundles-before.txt, bundles-after.txt, delivery-after.json and browser-before/after/report.json. Before/after Chrome used the same software-rendering settings and production URL; zero viewports completed. Lighthouse installation blocked by registry EACCES; CDP disconnected with WinError 10054. No successful runs or medians exist.

## Reproduction in an unrestricted environment

Use the same local content/database, Chrome and Lighthouse versions, URL http://127.0.0.1:8082/ and mobile/default simulated throttling. Build, set PORT=8082 and NODE_ENV=production, then npm.cmd start. Install Lighthouse where registry access works. Run `lighthouse http://127.0.0.1:8082/ --chrome-flags="--headless=new" --output=json --output=html --output-path=docs/qa-results/performance/lighthouse-after-1` three times with unique output names. Repeat against an isolated pre-change checkout using identical settings. Do not use Vite dev or change SITE_INDEXABLE to inflate scores. Compare metric medians and inspect actual LCP/SEO/tree/network audits before claiming targets.
