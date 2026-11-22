# Tour categories

Approved 20 Nov 2026, with Wildlife Tours added (8 categories) and the answers below folded in.
Two PRs, one at a time, both off `main` after #68 (`40fb0ae`).
walkerstours.com was used only as an example of the structure (travel-style categories, a page
each, a tailor-made option). None of its text, itineraries, names, layout or images is used.

PR 1 (`feat/tour-categories`) is planned in full below. PR 2 (`content/new-tours`) is an outline
with its open questions, and gets its own plan once PR 1 is merged.

---

# PR 1: the categories

## Data: migration `0030_tour_categories.sql`

New tables only. No applied migration changes; its hash goes in `server/test/applied-migrations.ts`.

`tour_categories`:

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | the slug, `[a-z0-9-]`, like every other content table's id (so the URL is `/tours/category/<id>`) |
| `name` | `text` | "Beach Tours": the tile, the nav link, the footer |
| `heading` | `text` | the h1 and `<title>`: "Beach tours in Sri Lanka" |
| `short_intro` | `text` | 1 to 2 sentences (the tile, meta description), at most 300 characters |
| `long_intro` | `text` | 2 to 3 short paragraphs, separated by a blank line (like `when_to_go_explainer`) |
| `image` | `text` NULL | `https://…` only; picked through `ImagePicker` (R2) |
| `best_time_note` | `text` NULL | optional; shown with a link to `/when-to-go` |
| `sort_order`, `published`, `created_at`, `updated_at` | | the usual, with the `set_updated_at` trigger |

`tour_category_links (tour_id → tours ON DELETE CASCADE, category_id → tour_categories ON DELETE
CASCADE, position)`, primary key `(tour_id, category_id)`. `position` keeps the order the admin
picked, so a tour's first category is stable.

Also in 0030:

- **`tours.price_from` becomes nullable** (no default). Today it is `NOT NULL DEFAULT 0`, so PR 2's
  drafts couldn't be "empty". Null shows "Price on request"; so does 0, which no tour has today.
  Existing prices are untouched.
- **`tours.category` stays**, with its check constraint, unused by the new UI (see question 1).
- **A tour can't have the id `category`** (`CHECK (id <> 'category')`, and the Zod schema says so),
  because `/tours/category` is taken. `/tours/category` itself 301s to `/tours`.
- **The seed:** the 8 categories below, published, in this order. Each image is copied from one
  destination row at migration time (`select image from destinations where id = …`), so production
  gets its R2 photo and local databases their seed photo. The admin can change any of them.
- **The assignments** (below), inserted only where the tour still exists, re-runnable.

`docs/SCHEMA.md` gets both tables. A fixture `scripts/fixtures/tourCategories.ts` mirrors the seed,
so `verify:roundtrip` and `resetContent()` cover it.

### Assignments (from the seed's four tours)

| Tour | Categories, in order | Why |
|---|---|---|
| `cultural-sri-lanka` (Cultural Sri Lanka) | Cultural Tours | Anuradhapura, Polonnaruwa, Sigiriya, Dambulla, Kandy: every day is a heritage site |
| `southern-escape` (Southern Coastal Escape) | Beach Tours | Galle, Unawatuna, Weligama, Mirissa, Bentota: every day is on the coast |
| `island-in-7-days` (Island in 7 Days) | Hill Country Tours, Cultural Tours | Kandy, the train to Ella and two days at Ella; the Temple of the Tooth and Galle Fort |
| `wild-sri-lanka` (Wild Sri Lanka Expedition) | Wildlife Tours | Safaris at Wilpattu, Minneriya, Udawalawe and Yala |

Not a Beach tour: `island-in-7-days` (one beach day of seven).

Only the seed's four tours are assigned. There is no `--prod` query: any other production tour
gets its categories in the admin after the merge.

### The seed's text (for you to check)

Plain words, no em dashes, no superlatives. Every place named is a destination in our database.
Best-time notes only where `docs/reviews/when-to-go-sources.md` already supports them; the others
are empty (the note and its link are then hidden).

**Beach Tours** (`beach`), "Beach tours in Sri Lanka", image: `mirissa`
- Short: Time on the south, west and east coasts: swimming bays, surf towns and Galle's old fort, with drives short enough to leave the afternoons free.
- Long: Sri Lanka's coasts have their seasons at different times of year. The south and west, from Bentota round to Mirissa, are calmer in the first months of the year; the east coast at Trincomalee and Arugam Bay has its season in the middle of the year. / Our beach tours keep the driving short. Most days start or end by the sea, with time for a swim, a surf lesson at Weligama or a walk on Galle Fort's walls. / Any of them can add a few days inland, in the hills or at a national park.
- Best time: The west and south coasts are usually driest from December to March, and the east coast from May to September.

**Family Tours** (`family`), "Family tours in Sri Lanka", image: `udawalawe`
- Short: Routes with shorter drives and slower days, mixing places children enjoy with time to rest.
- Long: Travelling with children changes how far you can go in a day. These tours keep the drives short and plan one main outing a day, so there's time for a pool, a nap or an early night. / Days can include a jeep safari at Udawalawe to see elephants, the train through the tea country, or a morning on a calm beach. / Tell us the children's ages when you ask, and we'll suggest the pace and the stops.
- Best time: none.

**Hill Country Tours** (`hill-country`), "Hill country tours in Sri Lanka", image: `ella`
- Short: Tea estates, cool mornings and walks in the central highlands, from Kandy up to Nuwara Eliya, Ella and Haputale.
- Long: The hill country is in the middle of the island and much cooler than the coast. Roads wind slowly between tea estates, so these tours plan fewer stops and longer stays. / Days can include the train between Kandy and Ella, an early walk on Horton Plains, a tea factory visit and short hikes around Ella. / Bring a warm layer: mornings and evenings in Nuwara Eliya can be cold.
- Best time: The hill country is usually driest from December to March. From May to September the southwest monsoon brings rain to the hills.

**Wellness Tours** (`wellness`), "Wellness tours in Sri Lanka", image: `bentota`
- Short: Slower trips built around rest: fewer moves, longer stays, and time for Ayurveda treatments, yoga or quiet days by the sea or in the hills.
- Long: These tours are for travelling slowly. Most stay three or more nights in one place, with no early starts unless you want them. / Many hotels and retreats in Sri Lanka offer Ayurveda treatments and yoga. We can include them, or leave the days open. / Tell us what kind of rest you're after, and we'll plan the stays around it.
- Best time: none.

**Adventure Tours** (`adventure`), "Adventure tours in Sri Lanka", image: `knuckles`
- Short: Active days: hikes in the hills, early climbs up rock fortresses, and surf on the south and east coasts.
- Long: For travellers who'd rather walk, climb or paddle than watch from a car window. Each activity is matched to a place known for it. / That can mean a hike in the Knuckles range, a sunrise climb up Sigiriya, a walk across Horton Plains, or surf at Arugam Bay or Weligama. / Tell us your experience and fitness when you ask, and we'll pitch the days to suit.
- Best time: none (the surf seasons aren't in our sources yet; PR 2 can add them).

**Honeymoon Tours** (`honeymoon`), "Honeymoon tours in Sri Lanka", image: `nuwara-eliya`
- Short: Slow trips for two: quiet stays in the hills and on the coast, a car and driver, and time left free.
- Long: These tours keep the pace easy and the days your own: fewer stops, longer stays and evenings with nothing planned. / A typical route pairs a few days in the hills, around Ella or Nuwara Eliya, with a stretch of coast near Galle or Mirissa. / Tell us your dates and what you'd like, and we'll suggest where to stay.
- Best time: none.

**Cultural Tours** (`cultural`), "Cultural tours in Sri Lanka", image: `sigiriya`
- Short: Ancient cities, cave temples and living traditions in the Cultural Triangle, Kandy and Jaffna, with time to see each site properly.
- Long: Sri Lanka's early capitals are in the north-central plains: Anuradhapura, Polonnaruwa and the rock fortress at Sigiriya, with the cave temples of Dambulla nearby. / Kandy, in the hills, is home to the Temple of the Tooth. Further north, Jaffna has its own Hindu temples, food and history. / Most sites are best seen early. We plan visits for the cooler hours and leave the middle of the day free.
- Best time: none (the sources disagree on the Cultural Triangle).

**Wildlife Tours** (`wildlife`), "Wildlife tours in Sri Lanka", image: `yala`
- Short: Jeep safaris in national parks such as Yala and Udawalawe, with early starts and time to watch.
- Long: Sri Lanka's national parks are home to elephants, leopards, sloth bears, water buffalo and many kinds of birds. Udawalawe is known for its elephants, and Yala for its leopards. / Safaris are in open jeeps, usually early in the morning or late in the afternoon. These are wild animals in their own habitat, so sightings can't be guaranteed, and every drive is different. / A tour can pair a park or two with a few days on the coast or in the hills.
- Best time: none. `when-to-go-sources.md` doesn't cover the parks, and the seasonal closures
  vary by park and year; an admin can add a sourced note later.

## API

- `GET /api/content` adds `tourCategories` (published, by `sort_order`) and each tour's
  `categoryIds` (published categories only, in the admin's order). Shared types and Zod schemas in
  `shared/`.
- Admin: `tour_categories` is a collection in the generic admin routes (list, create, edit,
  delete, publish, reorder). A tour's save writes its `tour_category_links` in the same
  transaction as its stops. Deleting a category says how many tours lose it first.

## Admin

- **Categories** in the sidebar: the generic `CollectionPage` list (reorder, publish, delete) and
  editor: name, id, heading, short intro, long intro, image (`ImagePicker`, folder
  `tour-categories`), best-time note, published.
- **The tour form:** a "Categories" multi-select (checkboxes, from the categories table, order
  kept), next to the old "Category" select, which becomes optional-looking help text "Not shown on
  the site" (question 1). Price from becomes optional, help "Empty: Price on request".

## Public pages

### `/tours`

1. The page header as now.
2. **The category row** (new `TourCategoryRow`), above the tours:
   - From 768 px: photo tiles in an editorial grid (two rows of 4 at 1280 px), each the photo with the
     name on a dark edge (`--copy-edge`) and the short intro under it. Each is a real link.
   - Below 768 px: a horizontal scroll row of smaller photo tiles (photo, name; no intro), native
     scrolling and scroll-snap like #68, no controls (the tiles are links, so Tab works, and each
     one scrolls into view on focus). The row ends short of the floating stack's column
     (`--tour-float-clear`), so no tile sits under it at rest. Nothing is added to `AVOID`.
3. **All tours**, `ToursSection` as now, the #68 row on phones.
4. **The tailor-made card** (new `TailorMadeCard`, its own `Section`, after the list, so the swipe
   row's counter keeps counting tours): "Don't see the trip you want?", "Tell us what you have in
   mind", a primary "Plan a tailor-made trip" button opening the enquiry form with the subject
   "Tailor-made trip", and a secondary WhatsApp link (`usePageSubject`'s message, "a tailor-made
   trip"), hidden while no number is set. Same card on every tour list (both pages).

### `/tours/category/:slug` (new `TourCategoryPage`, lazy chunk)

- `PageHero` with the category's photo, breadcrumbs Home → Tours → Beach Tours, and the h1 from
  `heading` (the only h1).
- The long intro in `.te-prose`.
- The best-time note, when set, with "See when to go" linking to `/when-to-go`.
- Its published tours in `ToursSection` (a `tours` prop, with the heading "Beach tours" instead of
  "Routes around the island"), the swipe row on phones.
- Empty: "We're putting these together. Ask us for a tailor-made trip." in place of the list.
- The tailor-made card.
- An unknown or unpublished slug renders the 404 page (with the server's 404 status).

### Prices

One helper, `tourPriceLabel()` (`shared/`), everywhere a price shows (the tour cards, the tour page,
the plan card, the home page, the booking tour picker): "From $1,250 USD", or "Price on request"
when the price is null or 0. Never blank, never $0.

### Navigation and footer

- **Tours becomes a group**: All tours, then the 8 published categories in order (from
  `/api/content`, so a renamed or unpublished category follows). Desktop: the `NavDropdown`
  disclosure, like Discover. Phones: a Tours section in the menu.
- Still five top items. Tours gains the chevron that Discover has; `browser-header-nav` and
  `browser-text-size` must pass at 1100 and 1280 px.
- **The footer:** its Navigation list is the header's links, flat (`browser-pages` holds that), so
  the categories appear there under Tours.
- **The card label** on desktop: the tour's first category ("Cultural Tours"), hidden when it has
  none. The old `tours.category` is no longer shown anywhere; ToursSection's 1280 px baseline
  moves in this PR.

## SEO (server, `server/src/pages/`)

- `/tours/category/<id>` in the page resolver: 200 with its own `<title>` ("Beach tours in Sri Lanka |
  <brand>"), description (short intro), canonical, Open Graph and Twitter tags and share image (the
  category photo, also preloaded as the header, `HERO_IS_SHARE_IMAGE`); 404 for an unknown or
  unpublished id. All values through `escapeHtml`.
- **JSON-LD**, beside the brand's: a `BreadcrumbList` (Home → Tours → the category) and an
  `ItemList` of its published tours (position, name, URL). No ratings, no prices, no offers.
  `/tours` gets the same two (Home → Tours; every published tour).
- **The sitemap and `llms.txt`:** every published category (with its pages, as rows are now).
- `/tours/category` 301s to `/tours`.

## Tests

New:
- `tour-categories.test` (server): migration 0030 (tables, the seed's 7 rows and order, the
  assignments, nullable price, the `category` id refused, re-runnable); `/api/content`
  (published only, `categoryIds` drop unpublished categories); admin CRUD, reorder, delete
  cascade, auth required; the tour save's links.
- `pages.test`: category titles, descriptions, canonical, OG, the two JSON-LD blocks (and no
  `rating`/`price`/`offers` in them), 404s for unknown and unpublished slugs, the 301, the sitemap
  and `llms.txt` entries.
- `browser-tour-categories`: the row (links, scroll on phones, focus), a category page's h1, intro,
  best-time link and tours (only its own), the empty state, "Price on request", one h1 on both
  pages, the tailor-made button opening the form with "Tailor-made trip" and the WhatsApp link's
  message; the admin's Categories editor and the tour form's multi-select saving.
- `browser-floating-visible` (or the new test): the floating stack covers no category tile and no
  card button at rest, 320/375/414 px, 100/120%.

Extended: `browser-header-nav` (Tours dropdown and phone section), `browser-text-size` (both pages,
120%, three widths, both themes, no sideways scroll), `browser-contrast` (both pages, both themes),
`browser-pages` (footer list), `verify:roundtrip`.

Pixel baselines: `browser-home-baseline` holds ToursSection; its 1280 px moves to this PR (the
label), listed in the description. `browser-inquiry` doesn't move.

## Screenshots (12 pairs, `--live-photos`)

`/tours` and `/tours/category/beach` at 1280 and 375 px, light and dark (8); the Tours dropdown
open (1280, light); the phone menu (375, light); Admin → Categories editor and the tour form's
multi-select (1280, light). The empty state is covered by tests, not a pair.

## Not in PR 1

New tours (PR 2), prices, ratings, filtering `/tours` in place (the tiles go to their pages), any
new dependency or CSP host.

---

# PR 2: new tour drafts (outline)

- Draft tours in `scripts/content/tours.json`, imported by `npm run content:import` as unpublished
  drafts, never overwriting a row an admin has saved, never re-creating a deleted one. That needs a
  new migration letting `content_imports` hold `tours` (its check allows only destinations and
  attractions), and the import learning tours, their stops and category links. `--dry-run`
  prints what it would do; `--prod` with the typed host check.
- Routes only through destinations in our database; a day-by-day itinerary, highlights, and
  "What's included" as general text (no hotel grades). `price_from` empty.
- Wellness: rest, Ayurveda, slower travel; no health or medical claims. Adventure: only activities
  that exist at those places, each sourced in `docs/reviews/new-tours-sources.md`.
- Photos: our R2 destination photos where they fit; otherwise openly licensed with credits, or
  none. Plain-copy rules.

Answered:
- **How many:** top each of the 8 categories up to 2 tours (about 13 drafts).
- **Kitulgala:** a new draft destination (unpublished), sourced, with OpenStreetMap coordinates,
  through the safe import. Rafting tours use it as a normal stop.
- **Wildlife drafts:** only parks and wildlife experiences already in the database (or sourced
  draft destinations); no promised sightings.
- **Production's tours:** no `--prod` query; counted from the seed's assignments.
