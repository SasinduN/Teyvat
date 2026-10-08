# Navigation repair - 2026-10-08

## Root cause and changes

No hardcoded Home active class was found in the inspected source. The old CSS matched the presence of aria-current, rather than its page value, and the hover span shared the active underline. The custom matcher suppressed parent navigation for every hash. SiteLink intercepted same-page section clicks without changing URL/history; About/Contact and Explore/Destinations therefore could retain stale section identity. The reported desktop appearance could not be reproduced in the blocked browser environment.

Files changed: src/components/Navbar.tsx, src/components/SiteLink.tsx, src/lib/activeNavigation.ts, src/index.css, src/styles/glass.css, server/test/public-ui.test.ts.

Fix: React Router NavLink with exact Home matching; one section-aware target derived from current pathname/hash; section links take priority, nested routes inherit their parent, unrelated hashes preserve their parent. Explicit data-active controls the underline and mobile border; inactive aria-current values cannot activate CSS. Hover changes text color only. Existing focus-visible outline is independent. NavLink updates route/history; SiteLink only intercepts a section when its complete URL already matches. Existing menu-close-on-navigation effect remains.

Explore is the existing /destinations#explore-map section and Contact is /about#contact. Information architecture and route configuration are preserved; no second router added. Plan and Photo Credits appropriately have no main-nav item active.

## Verification

VERIFIED: static Navbar renders select exactly one appropriate desktop item across all eight nav labels, nested destinations/experiences/tours/journal, query strings, trailing slash and unrelated hashes; unrelated paths select none. Memory-router navigation/back/forward test updates About/Contact and Explore/Destinations correctly. Direct initial URL render tests cover route restoration at the router/markup level, not actual browser refresh. 43/43 live public HTML shells delivered; API/database healthy.

BLOCKED: browser CDP transport resets before first viewport. Desktop/mobile clicks, actual browser history/refresh, keyboard focus, search/theme/menu interaction and console checks are NEEDS MANUAL VERIFICATION. No screenshot comparison is claimed.

