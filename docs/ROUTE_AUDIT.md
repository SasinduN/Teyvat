# Route audit — 2026-10-08

## Root cause and authorization

FOUND BY STATIC ANALYSIS: React Router already had a single index route and one PublicLayout Outlet. HomePage explicitly rendered fourteen marketing/tool sections. This was excessive homepage composition, not multiple page components accidentally rendered by route nesting. The user explicitly authorized changes to the previously frozen public structure and palette.

## Current public routes

| Route | Content |
| --- | --- |
| `/` | Hero, four discovery cards, journey CTA only |
| `/destinations` | Full published list, category filters, search/map, hidden gems |
| `/destinations/:slug` | Existing destination details |
| `/experiences`, `/experiences/:slug` | Existing categories, featured experiences, details |
| `/tours`, `/tours/:slug` | Existing packages, prices, itinerary, route map |
| `/about`, `/about#contact` | Existing introduction, values, contact form |
| `/plan` | Relocated journey builder, local saved plans, inquiry |
| `/journal`, `/journal/:slug` | Relocated journal list/photo stories; existing articles |
| `/photo-credits` | Existing licensed-photo attribution |
| `/admin/*` | Existing separate admin layout |
| `*` | Existing not-found page |

No duplicate homepage was introduced. `/plan` and the `/journal` index were added because their content previously had only home hash targets. Contact retains the established `/about#contact` convention. Navbar, footer, inquiry/search dialogs and floating controls remain shared.

Navigation/hero/card URLs use shared/site-paths.ts. Plan navigation now uses real links. Tour map links use `/destinations?mapTour=<id>#explore-map`, preserving selection on refresh. Existing detail links and old tour/destination query redirects remain. Old Home hashes for map, planner, journal, destinations, experiences, tours, about, contact and hidden gems redirect to their relocated routes, preserving location state.

Express fixed-page metadata and sitemap include both new index routes. Share images use the same guarded corrections as the client. Built server includes these changes; database-backed metadata/refresh tests are BLOCKED by test database authentication. Vite delivery is checked separately and does not prove production statuses or metadata.
