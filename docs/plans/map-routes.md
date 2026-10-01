# Plan: tour routes on the map, and destination panel additions

Status: APPROVED with the answers below (2026-10-01). **Blocked on the three
custom-stop coordinates** (see "Matching the current stops").

Two features:

- **6. Tour routes on the map.**
- **7. Destination panel additions.**

**Builds on PR A** (#4, merged: lazy start, the marker module,
fit-to-filter).

## Decisions

1. **Stops get a table, not more columns.** A new table, `tour_stops`, holds
   one row per stop, in order. A stop is either:
   - a **linked destination** (`destination_id`), which takes its name and
     coordinates from the destination, so moving a destination moves every
     route through it; or
   - a **custom stop** (`name`, `lat`, `lng`).

   A CHECK enforces exactly one of the two shapes. `tours.route` (the
   place-name list) is **replaced** by the stops. The mapper rebuilds the same
   `route: string[]` from them, so the route chips on the tour card don't
   change.
2. **The four stops that don't match a destination** are resolved in the next
   section. No coordinates go in a migration unless a person has confirmed
   them.
3. **While a route is shown, the route leads.** *(Answered: fade, but keep
   the filters.)*
   - The numbered stops, joined by a dashed line, framed to fit.
   - The destination markers fade to 35% opacity and stop responding to
     clicks, so the route reads clearly.
   - The category filter bar **stays enabled**. Choosing a filter exits route
     mode and applies that filter (with the usual fit-to-filter).
   - Closing with **✕** or Escape brings back the view and filter from before
     the route.
4. **"View route on map" sits beside the card's "Journey Route:" heading** as
   a small text button with a map icon. *(Answered: yes.)*
5. **The Google Maps link and the airport time appear in three places:** the
   map's side panel, its mobile card, and the **destination modal**
   (`DestinationModal.tsx`). *(Answered: the modal too.)*

## Matching the current stops

The 4 seeded tours have 17 route stops. 13 match a destination by name or
slug. **4 don't:**

| Tour | Stop | Why it doesn't match | Decision |
|---|---|---|---|
| Island in 7 Days | **South Coast** | a region, not a place | **Accepted:** two linked stops, **Mirissa** and **Galle** (the tour's own days 6–7). The chips read "…Yala → Mirissa → Galle". |
| Wild Sri Lanka Expedition | **Wilpattu** | a national park with no destination | a custom stop at the park's main entrance |
| Wild Sri Lanka Expedition | **Minneriya** | a national park with no destination | a custom stop at the park's main entrance |
| Southern Coastal Escape | **Unawatuna** | a beach town with no destination | a custom stop |

The owner confirms the custom-stop coordinates from Google Maps (main
entrance for the parks), and the migration uses exactly those values.
**Pending:** the coordinates have not been received yet (the answer arrived
with `<lat>, <lng>` placeholders), so building waits for them.

A related inconsistency, flagged and **not** fixed here: two tours' day-by-day
itineraries visit places their route list doesn't mention.

- Cultural Sri Lanka visits Polonnaruwa.
- Wild Sri Lanka visits Udawalawe and Mirissa.

The map draws the **route list**, as specified. Fixing those lists is a
content edit you can make in the new editor afterwards.

## 1. Database: migration `0007_tour_stops.sql`

```sql
create table if not exists public.tour_stops (
  id             bigint generated always as identity primary key,
  tour_id        text not null references public.tours (id) on delete cascade on update cascade,
  position       integer not null check (position >= 0),
  destination_id text references public.destinations (id) on delete restrict on update cascade,
  name           text check (name is null or length(btrim(name)) between 1 and 80),
  lat            double precision check (lat is null or lat between 5.5 and 10.0),
  lng            double precision check (lng is null or lng between 79.3 and 82.1),
  unique (tour_id, position),
  check (
    (destination_id is not null and name is null and lat is null and lng is null) or
    (destination_id is null and name is not null and lat is not null and lng is not null)
  )
);
```

- **Coordinate bounds:** the latitude and longitude bounds are a generous box
  around Sri Lanka, to catch swapped or mistyped coordinates.
- **Data from `tours.route`,** in order:
  - the 13 matches become linked stops;
  - the four in the table above become whatever you confirm;
  - if a tour's stops aren't all resolved when the migration runs, it stops
    with an error that names them, rather than guessing.
- **Old column:** `tours.route` is then dropped. The seed file
  (`0002_seed.sql`) and `scripts/fixtures/tours.ts` keep their place-name
  lists for `verify:roundtrip`. The round-trip maps fixture names to stops
  the same way the migration does, so it keeps proving the chips render
  unchanged.
- **Deleting a destination** that a route uses is refused by the database,
  and the API answers 409 naming the tours. A destination can't silently
  vanish from a route.
- **Renaming a slug** is already impossible (phase 4), so `on update cascade`
  is a safety net, not a feature.

## 2. API

- **`GET /api/content`:** each tour carries
  `stops: { position, name, lat, lng, destinationId | null }[]`, resolved
  server-side, so the client never joins anything.
- **Admin:**
  - The tour form gains a **stops** field, replacing the route string list.
    Its Zod rule is a list of 1–15 stops; each is either
    `{ destinationId }` or `{ name, lat, lng }` with the same bounds as the
    CHECK.
  - A save replaces the tour's stops in its own transaction, under the
    existing 409 version check.
  - The image audit and media usage are unaffected (stops have no images).

## 3. Admin: the stops editor (`src/admin`, not frozen)

A new field type, `tourStops`, in the schema-driven form. It's an ordered
list; each row has:

- a **Destination / Custom** switch;
- for Destination: a searchable select of all destinations, showing name
  and region;
- for Custom: **name**, **latitude** and **longitude** inputs, plus a small
  read-only map preview with the pin, so a mistyped coordinate is visible
  before saving. That preview loads Leaflet only when the row is opened;
- move up, move down and remove, plus **Add stop**.

Validation messages land on the row and field (`stops.2.lat`).

## 4. Public: "View route on map"

- **Tour card** (`ToursSection.tsx`, frozen): a small "View route on map"
  text button with a map icon, right-aligned on the "Journey Route:" line
  (decision 4). Clicking it:
  1. tells `PublicSite` which tour to show (a new
     `routeTour` / `setRouteTour` state, like the existing map filter state);
  2. scrolls to `#explore-map`.
- **Map** (`InteractiveMapSection.tsx`, frozen), when a route is set:
  - **Numbered markers** for its stops, 1…n: a cream disc with a dark-green
    number and the same white border as the category markers, so they're
    clearly different from them.
  - **Stop labels** always on, because there are few of them.
  - **The line:** a **dashed** polyline joining the stops in order (straight
    lines, not roads), in the site's deep green `#1C4737`, 3 px, dashes
    `8 8`.
  - **Framing:** the map fits the route (`flyToBounds`, the same padding as
    fit-to-filter, max zoom 10).
  - **The chip:** a **"Showing: <tour title> ✕"** chip, top centre of the
    map, in the Map Guide's style. ✕ (or Escape) clears the route and
    returns to the previous view and filter.
  - **The rest of the map:** category markers faded and inactive. The filter
    bar stays live; choosing a filter clears the route and applies the filter
    (decision 3).
- **Before the map has loaded** (the lazy start from PR A), the route is
  remembered and drawn as soon as the map is ready.
- **Keyboard:** the chip's ✕ is a button labelled "Clear route"; numbered
  stops are focusable, with an `aria-label` of "Stop 2: Kandy".

## 5. Public: destination panel additions

In the map's **desktop side panel**, its **mobile card**, and the
**destination modal**:

- **"Open in Google Maps"**: a plain link,
  `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`, opening in a
  new tab (`rel="noopener noreferrer"`). There's no API and no key, and it
  needs no CSP change, because it's a navigation, not a loaded resource.
  - Desktop: under the Best Time / Elevation box.
  - Mobile: beside the category tags.
  - Modal: a new row directly under the Quick Fact grid (Best Visiting
    Season / Elevation / Ideal Travel For), holding the link and, when set,
    the travel time.
- **Travel time:** a new optional admin field, `travel_time_from_airport`, on
  destinations. It's short text (1–30 chars, for example `~4 h`), shown as
  **"~4 h from Colombo airport (CMB)"** only when filled in.
  - Desktop: a line with a plane icon under the Google Maps link.
  - Mobile: under the description.
  - Modal: in the new row above, beside the link.
  - Seeded empty: migration 0007 adds the column as nullable; the fixtures
    and `0002_seed.sql` don't change.

## 6. Every visible change, called out

| Where | Change |
|---|---|
| `ToursSection.tsx`, tour card | a "View route on map" text button on the "Journey Route:" line |
| `InteractiveMapSection.tsx`, map | route mode: numbered stop markers, a dashed line, the "Showing: … ✕" chip, faded category markers (filters stay live) |
| `InteractiveMapSection.tsx`, desktop panel | an "Open in Google Maps" link; the "~N h from Colombo airport (CMB)" line when set |
| `InteractiveMapSection.tsx`, mobile card | the same two, positioned as in section 5 |
| `DestinationModal.tsx` | a new row under the Quick Fact grid: the link, and the travel time when set |
| Tour card route chips | **only** Island in 7 Days: "South Coast" becomes "Mirissa → Galle" |

The PR includes before and after screenshots, desktop and phone, for the
tour card, the map in route mode, both panels and the modal.

## 7. Tests

- **Migration:** the 13 matches link to the right destinations; the resolved
  four take your confirmed values; an unresolved stop stops the migration
  with its name; the CHECK refuses a half-custom stop and an out-of-bounds
  coordinate.
- **API:**
  - stops come back in order, with linked stops taking the destination's
    current coordinates;
  - the admin stops validation gives field-level errors;
  - deleting a destination used by a route gets 409 naming the tour.
- **Round-trip:** `verify:roundtrip` still proves the chips render
  unchanged.
- **In Chrome:**
  - "View route on map" scrolls to the map and draws n numbered stops in
    order, with a dashed line;
  - the stops fit in view;
  - the chip shows the tour, and ✕ and Escape restore the previous markers
    and filter;
  - choosing a filter while a route shows clears the route and applies the
    filter;
  - the route still draws if it was picked before the map had loaded;
  - the Google Maps link carries the destination's coordinates, in the side
    panel, the mobile card and the modal;
  - the travel-time line shows only when set;
  - the CSP test still reports zero violations.

## 8. Checks

`typecheck`, `verify:roundtrip`, `npm test`, `build`; screenshots as in
section 6. Then a branch off `main`, a PR, and stop when CI is green.
