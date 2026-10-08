# Travel Eye site map

2026-10-06. Source: src/App.tsx, shared/site-paths.ts, src/admin/AdminApp.tsx. Public shell: Navbar, Footer, enquiry/search dialogs and optional WhatsApp link.

| Route | Page | Purpose | Major Components | Status |
|---|---|---|---|---|
| / | Home | Island discovery | Hero, QuickSearch, Intro, Map, Spotlight, Experiences, Tours, Planner, Why, HiddenGems, PhotoStories, Journal, CTA | HTTP/API verified; browser pending |
| /#explore-map | Explore | Map/category discovery | InteractiveMapSection | Existing hash route |
| /#planner | Plan Your Trip | Sample planner | TravelPlanner | Existing section; navbar opens enquiry |
| /destinations | Destinations | Category-filtered index | PageHero, DestinationCard | Existing route |
| /destinations?category=:category | Destinations filter | Shareable category search | Category buttons | Existing route |
| /destinations/:slug | Destination detail | Gallery, facts, related experiences | PageHero, PlanCard, PageCards | Existing dynamic route |
| /experiences | Experiences | Experience discovery | PageHero, FeaturedExperiences, ExperiencesSection | Existing route |
| /experiences/:slug | Experience detail | Facts, related destination | PageHero, PlanCard, ExperienceCard | Existing dynamic route |
| /tours | Tours | Signature itineraries | PageHero, ToursSection | Existing route |
| /tours/:slug | Tour detail | Days, price, route and inclusions | PageHero, RouteMap, PlanCard | Existing dynamic route |
| /#journal | Journal | Editorial index | JournalSection | Existing hash route, no /journal index |
| /journal/:slug | Article | Editorial reading | PageHero, article, ArticleCard | Existing dynamic route |
| /about | About | Identity and values | PageHero, IntroSection, WhyTravelEye | Existing route |
| /about#contact | Contact | Contact details and enquiry | InquiryForm | Existing hash route |
| /?tour=:slug, /?destination=:slug | Legacy links | Preserve shared links | HomeRoute redirect | Existing redirect |
| /* and unknown slugs | Not found | Recover to discovery | NotFoundPage | Existing fallback |
| /admin/login | Sign in | Admin authentication | LoginPage, AuthProvider | Existing route |
| /admin | Dashboard | CMS overview | RequireAdmin, AdminLayout, DashboardPage | Protected |
| /admin/inquiries | Inbox | Enquiry management | InquiriesPage | Protected |
| /admin/settings | Settings | Contact/brand settings | SettingsPage | Protected |
| /admin/media | Media | Upload/library | MediaPage, ImagePicker | Protected |
| /admin/:collection | Collection | CMS list/order/publish | CollectionPage | Protected; nine collections |
| /admin/:collection/new | New record | Content creation | RecordEditorPage, RecordForm | Protected |
| /admin/:collection/:id | Edit record | Content updates | RecordEditorPage, RecordForm | Protected |
| /admin/* | Admin fallback | Recover to dashboard | Navigate | Protected |

Collections: destinations, experience categories, featured experiences, tours, articles, hidden gems, photo stories, hero slides, pillars (slugs defined in src/admin/collections.ts). No separate /explore, /contact or /plan routes are invented.

## Quality-pass additions and concrete public routes

| Route | Page | Purpose | Major Components | Status |
|---|---|---|---|---|
| /photo-credits | Photography credits | Source, author and license attribution | PhotoCreditsPage, shared photo registry | HTTP PASS; rendered review pending |

Published destinations: ella, sigiriya, galle, mirissa, kandy, jaffna, yala, nuwara-eliya, arugam-bay, trincomalee, anuradhapura, polonnaruwa, udawalawe, horton-plains, weligama, dambulla, colombo, knuckles, bentota, haputale

Published featuredExperiences: sunrise-ella, safari-yala, sunset-mirissa, walk-galle-fort

Published tours: island-in-7-days, cultural-sri-lanka, wild-sri-lanka, southern-escape

Published articles: sunrise-locations-sri-lanka, ultimate-ella-guide, best-beaches-sri-lanka, guide-sri-lankan-food, wildlife-safaris-where-to-go, hidden-gems-visit

Fresh production audit: 142/142 HTTP route, redirect and access-protection checks passed. This covers public shells and admin routes; it does not prove authenticated admin interaction. Full route results: qa-results/route-checks.json.

Alignment checklist for every concrete route, redirect and error target: ALIGNMENT_AUDIT.md. No new page or route was invented; Search is the existing dialog/filtered destination page, Explore/Planner/Journal are sections, and Contact is an About hash target.
