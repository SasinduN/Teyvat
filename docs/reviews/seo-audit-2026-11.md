# SEO audit, November 2026

Task 6, part B of the advisor handoff. **Report only: nothing here is built.** Every change below waits for the
advisor's and Sasindu's approval, and each design or copy change goes through the usual plan and screenshots.

## How it was checked

- **The live site, read-only, 23 November 2026:** `https://serendibluxetours.com`.
  - `robots.txt`, `sitemap.xml`, `llms.txt`, the manifest and `/api/content` were fetched with plain GETs.
  - Response headers, redirects and the status of known and unknown URLs.
  - The server-rendered `<head>` of 23 URLs, one or more of every page type.
  - The rendered DOM of 15 page types, each in a headless Chrome (`--dump-dom`), one at a time. From it: headings,
    images, alt text and links.
  - Mobile Lighthouse 12.8.2 on `/`, `/tours` and `/destinations/galle`, one run each. That's the November
    audit's method, with the SEO and best-practices categories added.
- **The code on `main`** (`a5aecd2`): `server/src/pages/head.ts` and `pages.ts`, `shared/page-meta.ts`.
- **No SEO skills were available.** Task 6 says Sasindu added some, but none is installed in Claude Code on this
  laptop: not in `~/.claude/skills`, not in any plugin, and not in this session's skill list. `pluginUsage` does list a
  `searchfit-seo` plugin that was never used; it's probably in the Claude desktop app, not Claude Code. This audit
  uses the tools above instead.

## The two findings that come before everything else

1. **The live site is already open to search engines.**
   - `robots.txt` allows everything but `/admin` and `/api/`, the sitemap lists 66 URLs, and no page carries
     `noindex` except the private ones. So `SITE_INDEXABLE=true` is set in Railway.
   - Task 6 and the launch checklist treat that as a step for after the blockers in section 8. Several of those
     blockers are still visible on the site:
     - no privacy policy or terms;
     - a placeholder Instagram link;
     - placeholder journal articles with invented authors.
2. **Bookings are on in production.**
   - `/api/content` reports `features.bookings: true`, and `/booking` answers 200.
   - The standing rule in `CLAUDE.md` is that `BOOKINGS_ENABLED` stays off until there's a privacy policy and real
     vehicle capacities.
   - The booking page itself is `noindex` and not in the sitemap, so this isn't an SEO problem. It is a privacy one,
     because the ride form collects a name, phone number and, on request, GPS location.

Both are Sasindu's decisions (⚠ in Reply 6).

## 1. Technical

| Area | What the live site does | Verdict |
|---|---|---|
| `robots.txt` | `Disallow: /admin`, `Disallow: /api/`, `Sitemap:` line. With `SITE_INDEXABLE` unset it would be `Disallow: /` and every page would carry `noindex` (`pages.ts`, `head.ts`). | Correct for an indexable site. Is indexable what's wanted today? See above. |
| Sitemap | 66 URLs: 10 fixed pages, 22 destinations, 4 experiences, 15 tours, 8 categories, 6 articles. Private pages are left out (wishlist, booking, unsubscribe, admin). No `<lastmod>`. | Good. Add `<lastmod>` from `updated_at`, a quick win that helps recrawling. `/photo-credits` is in it; harmless. |
| Canonical | Every indexable page has an absolute canonical on `https://serendibluxetours.com`, matching `og:url`. Private pages and the 404 have none and are `noindex`. | Good. |
| Redirects (#71) | `www` → 301 to the bare domain, path and query kept. `http` → 301 to `https`. Old links: `/?tour=x` → 301 `/tours/x`; `/tours/category` → 301 `/tours`; `/favicon.ico` → 301 `/brand/favicon.ico`. | Good. |
| HTTPS / HSTS | HTTPS everywhere; `strict-transport-security: max-age=86400`. | Raise to a year later (already in the backlog). |
| 404s | Unknown pages, tours, destinations and articles answer a real 404 with `noindex` and their own title. | Good: no soft 404s found. |
| Crawlable links | The rendered pages use real `<a href>` everywhere (phase 8). Lighthouse's `crawlable-anchors` fails on 4 links: the footer's Privacy Policy (twice), Terms of Service and Sustainability Pledge. They render with no `href` because those settings are empty. | Fix by filling those settings (section 8), not in code. |
| Without JavaScript | The server HTML has a full `<head>` (title, description, canonical, Open Graph, JSON-LD) and an empty body: `<div id="root"></div>`. Google renders JavaScript, so it sees the pages, later than the HTML. Bing does it less reliably. Social previews, other crawlers and most AI crawlers see only the head (and `llms.txt`). | **The biggest structural gap.** The fix overlaps the backlog's "server-rendered page headers" for performance (section 9, B1). |
| Core Web Vitals | Live, mobile Lighthouse (one run each): `/` perf 76, LCP 5.8 s; `/tours` 80, 4.6 s; Galle 80, 4.7 s. CLS 0 and TBT 80 to 150 ms everywhere. Accessibility 100, SEO 92, best practices 93. Matches the November audit (local 64 to 88), #72 and #73. Home LCP is the headline, which waits for the JavaScript and `/api/content`. | CLS and TBT fine; LCP is "poor" on phones (over 4 s). Same fix as above. No field data yet: Search Console's Core Web Vitals report will have it once there's traffic. |
| Best practices 93 | The one console error is Cloudflare injecting its Web Analytics beacon (`static.cloudflareinsights.com`), which our CSP blocks, as it should. | Turn off Cloudflare's automatic Web Analytics injection (⚠ Sasindu), or ask about allowing it. It currently records nothing. |
| Mobile layout | Covered by the existing browser tests (320 to 1280 px, 100 to 120% text); Lighthouse finds no viewport or tap-target issues. | Good. |
| `hreflang` | `<html lang="en">`, one language, one URL per page. | Not needed. Add it only if a translated version is ever made. |
| `llms.txt` | Served, built from the published rows. | Good; it's the only view of the content for crawlers that don't run JavaScript. |

## 2. On-page, per page type

What's right on every page:

- one `h1`;
- headings in order (h1, h2, h3);
- descriptive alt text, with `alt=""` only on decorative images;
- `srcset` on photos;
- a unique title and description;
- the brand at the end of the title, except on home.

The problems are mostly that the titles name the page type rather than what people search for, and that the copy is thin.

| Page | Title now (chars) | Proposed title (chars) | Other problems |
|---|---|---|---|
| Home | Serendib Luxe Tours \| Sri Lanka, planned around you. (52) | Sri Lanka Tours, Planned Around You \| Serendib Luxe Tours (57) | The brand comes first and "tours" isn't there. The description (104) could name what's offered: "Sri Lanka tours with a car and driver: tea country, ancient cities, wildlife and the coast, planned around your dates by a team in Matara." |
| `/tours` | Tours \| Serendib Luxe Tours (27) | Sri Lanka Tours and Itineraries \| Serendib Luxe Tours (53) | The h1 "Tours" could read "Sri Lanka tours". Description (75): "Sri Lanka tour itineraries by travel style: culture, wildlife, beaches, the hill country, families and trips for two. Each route changes to suit you." |
| 8 tour categories | e.g. Honeymoon tours in Sri Lanka \| Serendib Luxe Tours (50) | Keep: these are already good | Thin: 2 to 4 tours and about 240 words each. Add a 100 to 200 word introduction per category (what the trips have in common, when to go, links to destinations). No links to destinations or `/when-to-go`. |
| A tour | Island in 7 Days \| Serendib Luxe Tours (38) | `<title>: Sri Lanka Itinerary` when it fits in 60, e.g. "Island in 7 Days: Sri Lanka Itinerary \| Serendib Luxe Tours" (59); otherwise keep the title alone | The overview is about 65 characters (`full_desc`); the day-by-day carries the page (about 320 words). The route's stops don't link to their destination pages, and the categories aren't linked. |
| `/destinations` | Destinations \| Serendib Luxe Tours (34) | Places to Visit in Sri Lanka \| Serendib Luxe Tours (50) | None beyond the title. |
| A destination | Galle Fort \| Serendib Luxe Tours (32) | `<name>, Sri Lanka`, e.g. "Galle Fort, Sri Lanka \| Serendib Luxe Tours" (43); the longest, Horton Plains, is 60 | **Thin:** the "About" text is 137 to 287 characters per destination. Descriptions don't mention Sri Lanka (Galle's is "Cobblestone streets, Dutch colonial ramparts…"). |
| An attraction | (no page: a card with `#attraction-<id>` on its destination) | Keep it that way until each has enough to say | Fine as cards. Mark them up inside the destination (section 3). |
| `/experiences` | Experiences \| Serendib Luxe Tours (33) | Things to Do in Sri Lanka \| Serendib Luxe Tours (47) | About 200 words. The six "Choose by kind of trip" cards could link to the matching tour categories. |
| An experience | Safari in Yala \| Serendib Luxe Tours (36) | Safari in Yala, Sri Lanka \| Serendib Luxe Tours (47) | About 170 words. Links to its destination (good), but not to the tours that include it. |
| `/journal` | Journal \| Serendib Luxe Tours (29) | Sri Lanka Travel Guides \| Serendib Luxe Tours (45) | None beyond the content (below). |
| An article | The Ultimate Ella Travel Guide: Mountains, Trains &amp; Tea \| Serendib Luxe Tours (81) | Ella Travel Guide \| Serendib Luxe Tours (39), or a separate short SEO title field | **Placeholder content** (see the next list). |
| `/when-to-go` | When to go \| Serendib Luxe Tours (32) | Best Time to Visit Sri Lanka \| Serendib Luxe Tours (50) | The page that answers the biggest planning search. The h1 could be "When to go to Sri Lanka". Description: "The best time to visit Sri Lanka, month by month: pick a month to see which places suit it, and how the two monsoons move around the island." |
| `/explore` | Explore Sri Lanka \| Serendib Luxe Tours (39) | Sri Lanka Map: Places and Routes \| Serendib Luxe Tours (54) | The map panel repeats the destination's name as an h3 and then an h4 ("Top Experiences"); minor. The quieter places ("hidden gems") exist only here, with no page. |
| `/about` | About Us \| Serendib Luxe Tours (30) | About Our Sri Lanka Travel Team \| Serendib Luxe Tours (53) | The contact details are an h2 here; there's no `/contact` page (404). |
| Contact | (none: `/contact` is a 404) | Contact Us \| Serendib Luxe Tours (32), a small page with the address, phone, email, WhatsApp and the enquiry form | A stable URL to put on Google Business Profile, TripAdvisor and directories. |
| `/plan` | Plan Your Trip \| Serendib Luxe Tours (36) | Plan a Sri Lanka Trip \| Serendib Luxe Tours (43) | About 140 words; fine for a tool page. |

**The journal articles are placeholders, and need rewriting before they help.**

- The six bodies are 222 to 657 characters, about 40 to 110 words, yet labelled "5 min read" to "9 min read".
- The authors ("Nishan Fernando, Lead Explorer", "Dilini Senanayake, Cultural Historian"…) look like seed personas.
- Some facts are out of date or unsourced:
  - the Ella guide describes catching the train over Nine Arch Bridge, but since Cyclone Ditwah (20 Jun 2026) the
    hill train runs only from Nanu Oya (`CLAUDE.md`, tour drafts);
  - the safari article says "26 national parks" with no source.
- **Recommended:** unpublish them, or rewrite them with sources (`docs/reviews/places-sources.md` rules), real
  authors (or the brand), and read times worked out from the text.

Meta descriptions everywhere are 44 to 147 characters (the cap in code is 160): fine.

`og:image:alt` repeats the page title. The photo's own alt text would describe the image better (small fix).

## 3. Structured data

**Now:**

- `TravelAgency` on every page: name, alternate name, legal name, slogan, URL, image. It has **no logo**, because
  the brand's `logo.onLight` is empty, and **no contact details**.
- `/tours` and each category also have a `BreadcrumbList` and an `ItemList` (names and links only).

**Proposed** (none of these give Google a rich result except the breadcrumbs; the gain is a clearer picture of the
business for Google, Bing and AI answers):

| Where | Markup | Fields | Never |
|---|---|---|---|
| Every page | `TravelAgency` (it is an `Organization`) | Add `logo` (`/brand/emblem-…png`), `telephone`, `email`, `address` (`PostalAddress` from the settings' address, with `addressCountry: LK`), `areaServed: Sri Lanka`, and `sameAs` with real profiles only. All from Admin → Settings, so they follow edits. | The placeholder Instagram URL; any rating |
| A tour | `TouristTrip` | `name`, `description`, `image`, `url`, `touristType` from its categories, `itinerary` as an `ItemList` of its stops (`TouristDestination` with `geo`), `provider` → the agency. Plus a `BreadcrumbList` (Home › Tours › the tour). | `offers`, prices (tours read "Price on request"), ratings |
| A destination | `TouristDestination` | `name`, `description`, `image`, `geo`, `containedInPlace` Sri Lanka, `includesAttraction` → each published attraction as a `TouristAttraction` (name, description, geo). Plus a `BreadcrumbList`. | Ratings |
| An experience | `BreadcrumbList` | Home › Experiences › the experience | |
| An article | `Article` and `BreadcrumbList` | `headline`, `datePublished`, `image`; `author` only once it's a real person (otherwise the agency) | Invented authors |
| `/destinations`, `/experiences`, `/journal` | `ItemList` and `BreadcrumbList` | Names and links, like `/tours` | |
| FAQs | `FAQPage` | **None today.** There are no real FAQs on the site. Add only when a page has questions people actually ask, answered on the page. | Made-up FAQs |

No `AggregateRating`, `Review` or `Offer` anywhere until there are real reviews and published prices (`no-ratings`
already guards the ratings).

## 4. Keywords and content gaps

Every suggestion has to stay true and read naturally (`plain-copy`), and any new fact needs a source in a review doc.

| Search | Best page today | What to change |
|---|---|---|
| Sri Lanka tours | `/tours` | Title and description (section 2); the h1 "Sri Lanka tours". |
| Sri Lanka tour packages | `/tours` | Use the phrase once where it's true: "tour packages you can change". The routes are adjustable, so don't promise fixed packages. |
| honeymoon tours Sri Lanka | `/tours/category/honeymoon` | Already titled well. Needs an introduction and more than 2 tours to compete. |
| Sri Lanka wildlife safari | `/tours/category/wildlife`, `/experiences/safari-yala`, the wildlife article | Rewrite the article as a real guide (parks, seasons, what you may see, sourced) and link all three together. |
| Sri Lanka itinerary 7 days | `/tours/island-in-7-days` | The title "Island in 7 Days: Sri Lanka Itinerary". |
| Sri Lanka itinerary 10 days / 2 weeks | none | **New journal guide:** "Sri Lanka itineraries for 7, 10 and 14 days", built from the existing tours (5 to 9 days) and linking to them. |
| best time to visit Sri Lanka | `/when-to-go` | Title and h1 (section 2). The explainer is already sourced (`when-to-go-sources.md`). |
| Sri Lanka family tours | `/tours/category/family` | Introduction. |
| tea country / hill country tour | `/tours/category/hill-country`, `/tours/tea-country-slowly` | Introduction. The train story must say Nanu Oya since Ditwah. |
| Yala safari, Ella, Sigiriya, Galle… | the destination pages | **Expand each "About" to 300 to 500 words** from sourced facts: getting there, how long to stay, the best months (already in data), nearby attractions, the tours that pass through. |
| whale watching Mirissa | `/tours/southern-parks-and-whales`, `/destinations/mirissa` | A short sourced section on Mirissa's page (season, what to expect). |
| things to do in Sri Lanka | `/experiences` | Title (section 2). |
| Sri Lanka with a driver | none indexable (`/booking` is noindex) | Later, once bookings are properly launched: an indexable page about travelling with a car and driver, if it matches what's offered. |

The quickest content wins are the **title changes**, the **category introductions**, and replacing the **six
placeholder articles**. The biggest is **destination depth**: 22 pages with about 40 words of their own text each.

## 5. Internal linking

| From → to | Today | Gap |
|---|---|---|
| Destination → tours | "Tours through <place>" cards | Good. |
| Destination → nearby attractions | Cards with anchors | Good. |
| Destination → `/when-to-go` | A link | Good. |
| Tour → destinations | The route is shown, but stops aren't links | **Link each stop to its destination.** The main gap: 15 tours with no links to the 22 destination pages they cross. |
| Tour → categories | The first category is a label, not linked | Link each category. |
| Category → destinations / when to go | None | Name and link the main places in the new introductions. |
| Experience → destination | "Where it happens" | Good. Add "Tours with this experience". |
| `/experiences` categories → tour categories | None | Link "Wild Sri Lanka" to the wildlife tours, and so on. |
| `/when-to-go` → destinations | 13 cards for the month | Good. Could also link the tours whose `best_months` include the month. |
| Article → destinations / tours | None (only other articles) | Every rewritten article should link the places and tours it mentions. |
| Orphans | Hidden gems (only on `/explore`, no page), attractions (cards only), `/photo-credits` (footer) | Fine as they are. Hidden gems could become pages later, with enough content. |
| Breadcrumbs | JSON-LD on `/tours` and categories only | Add the `BreadcrumbList` to tours, destinations, experiences and articles (section 3). |

## 6. Images

- **Formats and sizes:** photos are WebP on R2 (`images.serendibluxetours.com`) in photo sets (480 to 1920 px).
  `TravelImage` writes `srcset` and `sizes`, and only full-width heroes may use 1920 px.
  - Across the 15 rendered page types, 157 of 216 `<img>` have `srcset`.
  - Most of the rest are small decorative images with `alt=""`: 32 on `/explore` (the map's markers) and 12 on a tour page
    (its route map). The others are a few cards without a photo set.
- **Hero preload:** every public page preloads its header photo with the same `srcset`, plus `/api/content`.
- **Alt text:**
  - present on every image;
  - descriptive and place-specific ("Galle Fort lighthouse and coastal ramparts, Sri Lanka");
  - `alt=""` only on decorative ones.
  - Attraction cards use the bare name ("Jungle Beach"). Adding the place would be clearer: "Jungle Beach near
    Unawatuna, Sri Lanka".
  - Belilena shows "photograph unavailable". Replacing the image is already in the backlog.
- **Share images:** each tour, destination, experience, article and category shares its own photo. Pages
  without one use the default `og-default.jpg` (1200×630, 32 KB). `og:image:alt` repeats the title (section 2).
- **Image sitemap:** not needed. The photos are linked from crawlable pages once rendered. It's worth reconsidering
  only if Search Console shows images not being indexed.

## 7. Off-site (for Sasindu)

1. **Google Search Console:** a Domain property for `serendibluxetours.com`, verified with a TXT record in
   Cloudflare DNS. The site is already indexable, so submit `https://serendibluxetours.com/sitemap.xml` as soon as
   the decision in "The two findings" is made, and check the Page indexing and Core Web Vitals reports after a week
   or two.
2. **Bing Webmaster Tools:** import the property from Search Console; submit the same sitemap.
3. **Google Business Profile:** "Travel agency", the Matara address (or a service area, if visitors don't come
   to an office), the phone, the website, hours and real photos.
4. **TripAdvisor:** a listing for the business. Real reviews there are what the backlog's reviews section waits for.
5. **The same name, address and phone (NAP) everywhere:** the site's footer and contact, Google, Bing,
   TripAdvisor, Facebook and Instagram.
   - Today the site shows the address as "Matara-Sri Lanka 81300". Writing it as "Matara 81300, Sri Lanka" (or the
     full street address) everywhere is easier for Google to match.
   - Use one international phone format everywhere (+94, then the number in groups). Admin → Settings stores it with
     no space after the area code today.
6. **Social profiles:** create the real Instagram (and any others) and put their exact URLs in Admin → Settings.
   Until then, clear the placeholder `https://www.instagram.com/`.
7. **Cloudflare:** turn off the automatic Web Analytics beacon, which the CSP blocks (section 1). Search Console
   gives the traffic data.

## 8. Before the site should be indexable

These are the launch blockers that apply to search. Some already show to visitors and search engines, because the
site is indexable now.

| Blocker | State on the live site |
|---|---|
| Privacy policy page | Missing: `privacy_url` is empty, so the footer's "Privacy Policy" is a link with no `href`. Also needed before bookings stay on. |
| Terms page | Missing: `terms_url` is empty. |
| Sustainability pledge | The footer link has no `href`. Either write the page or hide the link while the setting is empty. |
| Real contact details | A phone, an email at the domain, WhatsApp and the town are set. Confirm they're the client's real ones and settle the address format (section 7). |
| Placeholder links | Instagram is the bare `https://www.instagram.com/`. |
| Placeholder text | The six journal articles (section 2), with invented authors and inflated read times. |
| Database password rotated | Launch checklist item 2: only Sasindu can confirm. |
| Bookings | On in production without a privacy policy, against the standing rule. |

## 9. Prioritised fix list

**Sasindu, before anything else (no code):**

1. Decide: set `SITE_INDEXABLE` back to unset until section 8 is done, or close section 8 quickly.
   - While the site is indexable, Google can index the placeholder articles and empty footer links.
   - Search Console can remove anything indexed by mistake later.
2. Decide on `BOOKINGS_ENABLED` (on, without a privacy policy).
3. Fill or clear the settings: privacy, terms, sustainability and Instagram URLs; confirm the contact details.
4. Search Console, Bing and Google Business Profile (section 7).

**Quick wins, one PR (code and copy, small; titles are copy, so screenshots apply only where text on the page changes):**

| # | Change | Expected impact |
|---|---|---|
| Q1 | The titles and descriptions in section 2: home, `/tours`, `/destinations`, a destination's pattern, a tour's pattern, `/experiences`, an experience, `/journal`, `/when-to-go`, `/explore`, `/about`, `/plan` | High for click-through and relevance; zero risk |
| Q2 | `TravelAgency` with logo, phone, email, address, `areaServed` and real `sameAs`, from Admin → Settings | Medium: a clearer business entity; supports the Business Profile |
| Q3 | `BreadcrumbList` on tours, destinations, experiences and articles; `ItemList` on `/destinations`, `/experiences`, `/journal` | Medium: breadcrumb rich results |
| Q4 | `<lastmod>` in the sitemap from `updated_at` | Low to medium: faster recrawls after edits |
| Q5 | `og:image:alt` from the photo's alt | Low (accessibility of shares) |
| Q6 | Footer: hide the Privacy, Terms and Sustainability links while their settings are empty (the same pattern as the social links) | Clears the `crawlable-anchors` failure until the pages exist |

**Medium, each its own plan:**

| # | Change | Expected impact |
|---|---|---|
| M1 | Link each tour stop to its destination, each tour to its categories, experiences to their tours, `/experiences` categories to tour categories | High: connects the 15 tours with the 22 destinations |
| M2 | `TouristTrip` on tours and `TouristDestination` with `TouristAttraction` on destinations | Medium: entity understanding; no rich result |
| M3 | A `/contact` page (address, phone, email, WhatsApp, the form) | Medium: the URL for directories and the Business Profile |
| M4 | Category introductions (8 × 100 to 200 words, sourced) | Medium to high for "honeymoon / wildlife / family tours Sri Lanka" |

**Bigger:**

| # | Change | Expected impact |
|---|---|---|
| B1 | Render each page's header (h1, intro, main links) in the server HTML. This is the backlog's "server-rendered page headers" for mobile performance. | High: content and links visible without JavaScript, and LCP on phones (4.6 to 5.8 s now) |
| B2 | Destination depth: 300 to 500 sourced words per destination | High: the 22 pages that match the most searches |
| B3 | Replace the six placeholder articles with real, sourced guides, starting with "Sri Lanka itineraries for 7, 10 and 14 days", the wildlife safari guide and an Ella guide that matches today's trains | High over time; removes thin, partly wrong content |
| B4 | FAQs, only from real enquiries, with `FAQPage` on that page | Medium, later |
