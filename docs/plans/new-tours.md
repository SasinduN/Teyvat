# New tour drafts (tour categories, PR 2)

Approved 20 Nov 2026, with the route changes and the best months below folded in. Branch `content/new-tours`, off `main` after #69 (`37e684f`).
Part 2 of `docs/plans/tour-categories.md`. Nothing here is public until someone publishes it in
the admin: every row is an unpublished draft, with no price.

## How many

Published tours per category after #69 (the seed's four, as assigned in 0030):

| Category | Published | Drafts to reach 2 |
|---|---|---|
| Beach | 1 (Southern Coastal Escape) | 1 |
| Family | 0 | 2 |
| Hill Country | 1 (Island in 7 Days) | 1 |
| Wellness | 0 | 2 |
| Adventure | 0 | 2 |
| Honeymoon | 0 | 2 |
| Cultural | 2 (Cultural Sri Lanka, Island in 7 Days) | 0 |
| Wildlife | 1 (Wild Sri Lanka Expedition) | 1 |

That is **11 drafts** (approved: no extras). Cultural already has two. Production may hold other
tours, but there is no `--prod` query, so this counts the seed's.

Each draft has one main category; a few also get a second where it plainly fits (listed). The
admin can change any of them.

## The drafts (routes, for approval; the text comes with the PR)

Every stop is a destination in our database: the 20 published ones, plus Kitulgala, a new draft
destination (below). Days include the arrival and departure days. Drives between stops are kept
to what the existing tours already do.

| # | Category (second) | Working title | Days | Route |
|---|---|---|---|---|
| 1 | Beach | East coast in the dry months | 7 | Sigiriya, Trincomalee, Arugam Bay |
| 2 | Family | Elephants, a train and the beach | 9 | Sigiriya, Kandy, Ella, Udawalawe, Mirissa |
| 3 | Family (Beach) | A short south coast family trip | 6 | Bentota, Udawalawe, Mirissa, Galle |
| 4 | Hill Country | Tea country, slowly | 7 | Kandy, Nuwara Eliya, Haputale, Ella |
| 5 | Wellness | Rest on the southwest coast | 8 | Bentota, Galle |
| 6 | Wellness (Hill Country) | Quiet days in the hills | 8 | Kandy, Haputale, Ella |
| 7 | Adventure | Rivers and ridges | 7 | Kitulgala, Nuwara Eliya, Horton Plains, Ella |
| 8 | Adventure | Rock climbs and surf | 9 | Sigiriya, Knuckles, Arugam Bay (a travel and rest day for the long drive from the Knuckles; surfing there is seasonal, sourced) |
| 9 | Honeymoon | Hills and coast for two | 9 | Kandy, Nuwara Eliya, Ella, Mirissa, Galle |
| 10 | Honeymoon (Beach) | Ancient cities and the east coast for two | 7 | Sigiriya (Dambulla a visit from there), Trincomalee (the extra night) |
| 11 | Wildlife | Southern parks and whales | 6 | Udawalawe, Yala, Mirissa |

Each draft has: a title and subtitle, a short and a full description, a day-by-day itinerary
(title, a plain paragraph, the place), highlights, and "Included" as general text. Rules:

- **No prices.** `price_from` empty: "Price on request" (#69).
- **No promises** such as "5-star hotels", "private chef", "luxury tented camp". "Included" says
  only what every trip has: a car and driver for the route, accommodation for the nights listed,
  the transfers between stops. Anything else is phrased as "can include" or "ask us".
- **Wellness:** rest, slower travel, Ayurveda and yoga as things hotels offer. No health or medical
  claims ("cures", "detox", "heals", "boosts immunity" and the like are out, and a test greps for them).
- **Adventure:** only activities that really happen at those places, each with a source:
  white-water rafting at Kitulgala, the Horton Plains walk to World's End, hikes up Little Adam's
  Peak and Ella Rock, the climbs up Sigiriya and Pidurangala, hiking in the Knuckles range, surfing
  at Arugam Bay (and its season). No canyoning, ziplining or diving unless a source confirms it at
  that place.
- **Wildlife:** only the parks and experiences already in the database (Udawalawe, Yala, whale
  watching from Mirissa), with their seasons where a source gives them. Every one says sightings
  can't be guaranteed.
- **Best months, every tour:** in its text and in a structured field, `tours.best_months`
  (months 1 to 12, like `destinations.best_months`; new in 0031, editable in the admin). From
  `when-to-go-sources.md` or a source added to `new-tours-sources.md`:
  - the east coast trips (#1, #8, #10): the east coast's dry season;
  - the south and west coast trips (#3, #5, #9, #11): theirs;
  - #11 also names Yala's yearly closure and the whale-watching season off Mirissa;
  - the hill trips (#2, #4, #6, #7): the hill country's drier months.
  Where sources disagree, the sources file and the PR say so.
- **Plain copy:** no buzzwords, no em dashes, no superlatives, nothing copied. `plain-copy`'s word
  list, plus the Wellness list above, run over the file in a test.
- **Photos:** each draft's cover is one of our R2 destination photos (the verified photo of its
  main stop), so no new photo is needed. No Commons photo for a tour.

`docs/reviews/new-tours-sources.md` lists, per draft, every activity, season and fact with its
source (Wikipedia, Wikivoyage, the Department of Wildlife Conservation or Sri Lanka Tourism where
reachable, OpenStreetMap for places), and what was left out and why.

## Kitulgala: a new draft destination

Added to `scripts/content/places.json`, imported like the six from #57: unpublished, Central or
Sabaragamuwa as OpenStreetMap places it, coordinates from its OpenStreetMap object (linked in the
sources file), plain facts from Wikipedia and Wikivoyage, and a CC BY or CC BY-SA Commons photo
with its credit if a suitable one exists (otherwise none). The rafting tour's first stop links to it.

A published tour can go through a draft destination: its stop still shows on the route, without a
link, until the destination is published (as since 0007).

## The import: `npm run content:import`, extended to tours

- **Migration `0031_tour_drafts.sql`:** `content_imports.table_name` may also be `tours`, and
  `tours.best_months` (months 1 to 12, empty by default; the seed's four stay empty). New
  migration, nothing edited.
- **`scripts/content/tours.json`:** the 11 drafts, validated like `places.json` (Zod: slugs, day
  counts, itinerary days, stops that are destinations, categories that exist, no `price_from`).
- **`content:import`** reads `places.json` then `tours.json`, so Kitulgala exists before the tour that
  stops there. Each tour, its stops (`tour_stops`) and its categories (`tour_category_links`) are
  written in one transaction, with the same rules as places:
  - created only as an unpublished draft, `price_from` NULL;
  - updated only while it is a row this import created and nobody has saved since
    (`content_imports`); an admin's edit, or a tour it didn't create, is left alone;
  - a tour deleted in the admin is never created again;
  - a stop whose destination is missing skips that tour, saying why;
  - the cover: the destination's photo in R2 when `media` has it, else that destination's stored
    cover (as 0030 did);
  - `--dry-run` reads only and prints each row's plan; `--prod` needs the typed-back host, as now.
- `tours.category` (the old column, NOT NULL) gets the nearest old value (Adventure, Wildlife,
  Culture, else Full Island). It is shown nowhere.

The PR gives the commands:

```
npm run content:import -- --dry-run
npm run content:import -- --prod --dry-run
npm run content:import -- --prod
```

## Tests

- `tours-import` (new): the file parses; every stop is a destination in the seed or `places.json`;
  every category exists; no price; the copy rules (em dashes, the plain-copy list, the Wellness list,
  "can't be guaranteed" on every wildlife day with a safari); a dry run writes nothing; a run creates
  11 unpublished drafts with their stops and categories and no price; a second run changes nothing;
  an admin's edit and a deletion are respected; a missing destination skips its tour.
- `attractions` (the places import's tests) still pass with Kitulgala in the file.
- `migrations-frozen` with 0031's hash.

No public markup, styles or layout change, so no screenshots: the drafts are unpublished. The PR
says so.

## Not in this PR

Prices (after the owner confirms them), publishing anything, new photos for tours, and any change
to the pages.
