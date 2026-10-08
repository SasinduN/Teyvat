# Homepage restructure — 2026-10-08

The old HomePage rendered Hero, QuickSearch, InteractiveMap, DestinationSpotlight, Experiences, FeaturedExperiences, Tours, TravelPlanner, Intro, WhyTravelEye, HiddenGems, PhotoStories, Journal and CTA.

The unique homepage now contains exactly three main sections:

1. Cinematic hero with preserved text/carousel and real destination/planning links.
2. Discover Sri Lanka: four published destination previews, preferring featured records, linking to their existing details.
3. Plan Your Journey: compact glass panel linking to `/plan` and `/about#contact`.

| Removed Home block | Content destination |
| --- | --- |
| QuickSearch + interactive map | `/destinations`, extracted DestinationExplorer retains filters, timing, map route selection and contextual WhatsApp |
| Hidden gems | `/destinations#hidden-gems`, existing detail/inquiry dialogs |
| TravelPlanner | `/plan`, saved-plan storage and inquiry preserved |
| Journal + PhotoStories | `/journal`, article links and photography dialogs preserved |
| Experiences + FeaturedExperiences | Already present on `/experiences`; reuse existing full page |
| Tours | Already present on `/tours`; prices/itineraries/detail pages retained |
| Intro + WhyTravelEye | Already present on `/about`; reuse existing full page |
| DestinationSpotlight | Compact four-card preview; all destinations retained in full list/details |
| Repeated closing CTA | Replaced with concise planning invitation; shared inquiry remains available |

Unused Home imports and route-selection state were removed. Reusable existing section components remain available; no travel records, descriptions, prices or CMS collections were deleted. Homepage no longer imports map, planner, journal or full-page marketing blocks. Build emits separate Plan/Journal/Destinations chunks.

VERIFIED: server-rendered markup checks find three homepage sections, four detail-card links, planning/contact hrefs, and no relocated tool IDs. Relocated content renders without throwing. This is not browser click, scrolling or visual evidence.
