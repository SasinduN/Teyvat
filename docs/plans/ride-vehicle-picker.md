# Plan: the ride page's vehicle picker, vehicle categories and a "Book a ride" hero slide

Status: APPROVED (2026-11-17). Parts 1 to 10 are in PR #65; the Mini Lorry (part 10) is its own PR
next, waiting for the owner's answers.

- **Hero button layout (part 9):** "replace". Below 640 px, with bookings on, the hero shows Plan
  Your Journey and Book a ride; wider screens keep Explore Sri Lanka too.
- **Floating Book a ride:** it hides while the hero's own Book a ride is on screen (an
  IntersectionObserver in `FloatingActions`) and comes back once the hero scrolls away. At 120% on
  phones the two had met.

Branch: `feat/ride-vehicle-picker`, from `origin/main` (`5ae0c8a`). This is a public
design change: before/after screenshots at 1280 and 375 px in both themes, and
Sasindu's approval before merging. `BOOKINGS_ENABLED` stays off in production;
`TourBookingPage.tsx` is not changed.

## What stays

- The `BOOKINGS_ENABLED` gate: off, `/booking` is a 404 page and nothing links there.
- The page's single request, `GET /api/bookings/catalog`.
- `?destination=<id>` fills in the drop-off.
- `/booking?tour=…` still opens `TourBookingPage`.
- The `rideSchema` checks (`shared/ride.ts`).
- The "Continue on WhatsApp" hand-off (`shared/ride-whatsapp.ts`), including the
  fallback link for a blocked popup, which goes away when any field changes.

## Today

- **Table:** `public.booking_vehicles` (0014). Columns: `id`, `name`, `type`
  (`Car`, `SUV`, `Van` or `Minibus`), `passenger_capacity` (empty or 1 to 100),
  `luggage_capacity` and `accepting_requests`. A category can accept requests only
  once it has a capacity.
- **Rows:** `car` (0014) and `suv` (0017). 0018 set both to 5 passengers, 3 bags,
  accepting requests.
- **Capacity:** a maximum only. There is no minimum, description, models, image or
  sort order.
- **`checkCapacity`** (`shared/booking.ts`): errors if the category isn't accepting
  requests or the passenger count is above `passenger_capacity`. The server runs it
  when a request is created and when one is confirmed.
- **The catalog:** `GET /api/bookings/catalog` returns every category, by name.
- **Editing:** Admin → Bookings saves a category through
  `PUT /api/admin/booking-vehicles/:id`. The schema is strict and the save replaces
  the whole row.
- **Picker:** `VehicleSelector`, a `<select>`. The tour page uses it too.
- **Existing bookings:** `bookings.vehicle_id` uses `on delete restrict`, so a
  category that bookings point at can't be deleted.

## Decisions

- **The driver is never counted.** Every ride comes with a driver; we don't rent
  out cars.
  - "Driver included" appears once on the booking page.
  - Capacity is always worded as passengers: "Up to 4 passengers". This replaces
    "Up to 4", "Seats up to N" and "N of M seats" in the first brief. The word
    "seats" isn't used.
- **The categories:**

  | id | Name | Passengers | Bags | Accepting | Source |
  |---|---|---|---|---|---|
  | `mini` | Mini (Wagon R class) | 1–3 | 2 | yes | owner-confirmed |
  | `car` | Car (Prius class) | 1–4 | 4 | yes | owner-confirmed; 0018's 5 counted the driver |
  | `mini-van` | Mini Van | 1–6 | — | no | placeholder |
  | `van` | Van | 1–9 | — | no | placeholder |
  | `bus` | Bus | 10–30 | — | no | placeholder |
  | `suv` | SUV | unchanged (5, 3 bags) | | unchanged | the owner is confirming |

- **Car's numbers:** the migration changes them only while they still hold
  0018's values (5 passengers, 3 bags), so an admin's edit survives (the 0021 and
  0025 rule).
- **SUV:** its numbers and switch stay as they are. The migration adds only its
  description, image and sort order, and only while those are empty.
- **Categories that aren't accepting requests are hidden from the picker.** This
  was my recommendation; nobody objected. Until the vans and bus are switched on,
  the page offers Mini, Car and SUV. The catalog still returns every category, so
  the admin and the tour flow are unchanged.
- **Luggage:** the owner gave bag counts, so the cards and the summary show them
  ("2 bags"). The WhatsApp message doesn't (part 7).

## 1. Categories: migration 0027, shared types, API

- **New columns:**
  - `description`
  - `example_models` (`text[]`)
  - `min_passengers` (not null, default 1, never more than `passenger_capacity`)
  - `image_url`
  - `sort_order`
- **`type`:** the allowed values gain `Bus`. The old constraint is dropped by name
  and a new one added, in the new migration.
- **Rows:** as in the table above. The migration's hash goes in
  `server/test/applied-migrations.ts`.
- **`vehicleSchema` and `BookingVehicle`:** gain `description`, `exampleModels`,
  `minPassengers`, `imageUrl` and `sortOrder`, with a check that the minimum is no
  more than the maximum. `imageUrl` is a same-origin `/images/vehicles/*.svg` or an
  allow-listed host (`shared/image-hosts.ts`).
- **The API:** `VEHICLE_SQL` selects the new columns. The catalog sorts by
  `sort_order`, then name.
- **`checkCapacity`:** also rejects a count below the minimum: "This category takes
  at least 10 passengers." The over-capacity message stays as it is. The server
  uses it already, so it applies there too.
- **New helpers in `shared/booking.ts`**, used by the picker, the summary and the
  WhatsApp line, so the page holds no numbers:
  - `passengerRange(v)` gives "Up to 4 passengers" or "10–30 passengers".
  - `smallestFit(vehicles, n)` gives the smallest accepting category that fits.
  - `maxPassengers(vehicles)` gives the stepper's limit.

## 2. Admin → Bookings

The form gets the new fields: description, example models, minimum passengers,
sort order, and the image through `ImagePicker`. Without them, saving a category
would erase them, because the save replaces the whole row. This is an admin design
change, so it gets screenshots too.

## 3. The ride page (`src/pages/BookingPage.tsx`, new components in `src/components/booking/`)

- **Trip type:** a segmented control at the top of the form, two native radio
  buttons.
  - Round trip opens the return fields with a short height animation (none under
    reduced motion).
  - One way clears them, through a small helper (`withTripType`) that a test
    covers.
- **Vehicle picker** (`VehiclePicker`): cards built on native radio buttons. They
  give the arrow keys and a single tab stop without extra code.
  - Each card shows the name, description, models, a passengers badge, bags, and
    the image in the lower right.
  - Each card's accessible name includes its capacity: "Car, up to 4 passengers".
  - The selected card gets `--accent` with `--on-accent` text. The rest stay
    neutral. The focus ring is visible.
  - Phones: the row scrolls sideways with scroll-snap. Desktop: arrow buttons when
    the cards overflow.
  - A card that doesn't fit the count is dimmed, labelled "Up to N passengers" (or
    "From 10 passengers"), and can still be chosen. Choosing it shows the capacity
    error by the passenger field.
  - If the count changes and the choice no longer fits, the choice stays, the
    error shows, and a one-tap "Switch to Car" button offers `smallestFit`.
  - If nothing fits, the page says so and links to Contact.
- **Passengers:** a −/number/+ stepper. Its limit is `maxPassengers` of the
  categories shown. Once a vehicle is chosen it reads "3 passengers, room for 4".
- **Summary:**
  - It's always shown. Today it's hidden until something is entered.
  - It shows the chosen vehicle large: image, name, models, passengers and bags.
  - A change of vehicle slides and fades in (none under reduced motion).
  - Before a choice: a neutral placeholder, "Choose a vehicle".
- **Phones:** the summary becomes a bar stuck to the bottom of the booking page,
  holding the thumbnail, the name and Continue (`form=` on the button).
  - The form's own Continue button hides, so there is one.
  - The bar stops above the footer.
  - It's `data-float-avoid`, so the WhatsApp button rises above it. That's allowed:
    the bar doesn't scroll away.
- **"Driver included":** shown once, by the picker's heading.
- **Text size:** heights around text are rem `min-h`, so nothing clips at 120%.

## 4. `VehicleSelector` (the tour page's dropdown)

`TourBookingPage.tsx` isn't touched. The shared component also greys out
categories below their minimum, so the tour form can't offer the bus to 2 people
and then have the server refuse it.

## 5. Images

- Six original placeholder silhouettes, one per category: three-quarter view,
  transparent, SVG, each with a fixed `width` and `height`.
- The final artwork: upload it in Admin → Media (R2) and choose it in the
  category's image field. WebP under `public/` fails `no-committed-images`, and new
  images belong in R2. Nothing is copied from another company's site or app.
- The files to replace:
  - `public/images/vehicles/mini.svg`
  - `public/images/vehicles/car.svg`
  - `public/images/vehicles/suv.svg`
  - `public/images/vehicles/mini-van.svg`
  - `public/images/vehicles/van.svg`
  - `public/images/vehicles/bus.svg`
- `public/images/vehicles/hero-ride.svg` (the hero slide, part 9)

## 6. Floating buttons

The Book a ride floating button is already hidden on `/booking`. The WhatsApp
button rises above the phone bar (part 3).

## 7. WhatsApp message

The contents stay the same. Only the vehicle line changes:
`Vehicle: Car (up to 4 passengers)`, or `Vehicle: Bus (10–30 passengers)`.

## 8. Tests and checks

- **`booking-validation`:** `checkCapacity` at the minimum − 1, the minimum, the
  maximum and the maximum + 1, for every seeded category, including the bus's
  minimum of 10.
- **`ride-validation`:** `withTripType` to one way clears the return fields, and
  `rideSchema` accepts the result.
- **`ride-whatsapp`:** the exact text of a one-way and a round-trip message.
- **`bookings`:**
  - the catalog's new fields and order;
  - the server refusing a bus for 2;
  - the admin's save keeping the new fields;
  - Car moving from 5 to 4 only while it held 5.
- **`browser-bookings`:**
  - the picker's arrow keys and focus ring;
  - dimmed cards and "Switch to";
  - the stepper's limits and the summary placeholder;
  - the phone bar at 375 px;
  - no sideways overflow at its five widths;
  - reduced motion.
- **`npm run typecheck`, `npm run build`, then `npm test`,** in the foreground,
  stopping if available memory drops below 2 GB.
- **Screenshots:** `npm run screenshots -- --ride` turns bookings on in its scratch
  databases only. It captures, at 1280 and 375 px, light and dark:
  - nothing selected;
  - a vehicle selected;
  - a capacity error;
  - a round trip;
  - plus the hero (part 9).
  
  Saved in `docs/screenshots/feat-ride-vehicle-picker/`, never committed.

## 9. The "Book a ride" hero slide and button (approved 2026-11-17)

### How hero slides work today

- **Data:** the `hero_slides` table (0001): `id`, `image`, `title`, `caption`,
  `sort_order`, `published`. The seed has three. They're edited in *Admin → Hero
  Slides*. At least one stays published (`keepOneHeroSlide`).
- **Order:** `sort_order`, then `id`.
- **Images:** a URL chosen with `ImagePicker`. `photoResolver` gives the R2
  `srcset`.
- **What a slide is:** a background photo only (`title` is its alt text; `caption`
  isn't shown). The `h1` (Admin → Settings), the line under it and the buttons are
  fixed in `HeroSection.tsx`.
- **Rotation:** every 7 s. It pauses on hover, focus and the pause button, and
  doesn't rotate under reduced motion.
- **The first slide is used elsewhere:** it is the home page's share image and its
  preloaded photo (`HERO_IS_SHARE_IMAGE`), and the header of Plan, Photo credits,
  Unsubscribe and Wishlist. The second is About's header and the home plan photo.

### Answers

1. **Second slide, not first.** The first photo's preload and the share image
   don't change. A "Book a ride" button among the hero's fixed buttons, shown only
   while `useFeatures().bookings` is true, makes booking visible on every slide and
   to visitors with reduced motion. Two layouts at 375 px go to Sasindu before one
   is chosen: a third button, or one replacing the secondary button.
2. **Option A.** The brand headline stays the only `h1`. The ride slide changes
   only the line under it and the buttons.
3. **Our own artwork on the dark page colour.** The image path lives in one
   constant (`RIDE_SLIDE_IMAGE`, `shared/ride-slide.ts`), so the owner's photo
   replaces it in one place. File to replace:
   `public/images/vehicles/hero-ride.svg`.
4. **Wording:** "Book a ride with a driver" / "Airport, hotel and city pickups
   anywhere on the island." / "Book a ride".

### Build

- **Where the slide goes:** `HeroSection` inserts it at index 1 when
  `useFeatures().bookings` is true. It isn't a `hero_slides` row, so
  `useHeroSlides()` and every other page are unchanged. The flag off: no slide, no
  button, no link to `/booking`.
- **The ride slide's background:** `--inverse-surface` with the artwork at the
  right (lower on phones). It's under the same overlay as the photos, so the copy
  holds AA.
- **The ride slide's copy:**
  - The line under the `h1` becomes "**Book a ride with a driver.** Airport, hotel
    and city pickups anywhere on the island." The approved headline leads the line,
    since the `h1` stays the brand's.
  - Both lines sit in one grid cell, with the hidden one `visibility: hidden`, so
    the copy's height never changes as slides rotate.
  - "Book a ride" becomes the primary button on that slide.
- **The fixed button:** layout chosen from the 375 px screenshots.
- **Tests:** `browser-hero-booking`.
  - Flag off: no ride slide, no "Book a ride" button, no link to `/booking`
    anywhere on the home page.
  - Flag on: the ride slide is second; the fixed button and the slide's line are
    present; the button's `href` is `/booking`.
  - `browser-preload` and `browser-home-baseline` run with the flag off and stay as
    they are.
- **Screenshots:** the home hero with the flag on, at 1280 and 375 px, both
  themes, before and after, plus the two button layouts at 375 px.

## 10. The icon set (approved and built 2026-11-17) and the Mini Lorry (next PR)

Approved with the four differences below. One change to the fourth: the image field stays.
If an image is set it replaces the icon; if not, the chosen icon shows. Each seeded category
defaults to its matching icon (0027, which was still unapplied in production, so it was edited).

Source: the "Ride vehicle icon set" design canvas (seven icons on a 120 × 64 grid).

### Icons: how they fit the site

- **Inline SVG, one component** (`VehicleIcon`), keyed by a new `icon` value per category
  (`mini`, `car`, `suv`, `mini-van`, `van`, `bus`, `mini-lorry`). The fills use the canvas's four
  variables, so the selected card restyles them. The six `.svg` files in
  `public/images/vehicles/` go. 0027 isn't applied anywhere but local and test databases, so its
  `image_url` column becomes `icon`, and the admin's image field becomes an icon choice.
- **Hero slide:** the car and the van icons, inline. `hero-ride.svg` goes too, so no placeholder
  images are left.
- **Colours per theme:** the canvas draws on dark cards. On the site's white cards, a #ECEAE4
  body would all but vanish. So:

  | Where | Body | Glass |
  |---|---|---|
  | Dark theme | #ECEAE4 | #2C2C2C |
  | Light theme | the charcoal ink | #ECEAE4 |
  | Selected card, both themes | #161616 | #FFE27A |

  Tyre #0E0E0E and accent #F5C518 everywhere. All of them are tokens in `tokens.css`.
- **The cards keep the site's look:** DM Sans, the token surfaces, and the site's gold
  (`--accent`) for the selected card. The canvas's Manrope, black page and #F5C518 card fill are
  not used.
- **Too small:** the canvas fades the whole card to 45%, which would take its text below AA. Only
  the icon fades; the card keeps its dashed edge and "Too small for N".
- **Badges:** "Up to N passengers" and "N bags", both from the catalog. A category with no bag
  count shows one badge.

### Mini Lorry: goods, not passengers (first draft; part 12 replaces it)

- **The category:** a new `kind` column, `passenger` or `goods`, plus `max_load_kg`. A goods
  category has no passenger range. It can take requests only once `max_load_kg` is set. Seeded
  switched off, with no load until the owner gives one.
- **The form:** a "Passengers / Goods" switch above the trip type. It's shown only while a goods
  category is taking requests, so with the lorry off the form is exactly as now. In Goods mode:
  - The picker shows goods categories only. The card badges read "Goods" and "Up to N kg".
  - The passenger stepper becomes:
    - What are you moving? (text, required, up to 300 characters)
    - Approximate weight in kg (required, at most the category's load)
    - Helpers needed: none, 1 or 2
  - Trip type: one way only (question 3).
- **Rules:** `goodsSchema` in `shared/ride.ts`; `checkLoad(vehicle, kg)` beside `checkCapacity`.
- **WhatsApp message:**
  - It opens "Hi! I'd like to enquire about moving goods in Sri Lanka."
  - Then pickup, drop-off and date as now.
  - Then `Goods: <what>`, `Approximate weight: 350 kg`, `Helpers needed: 1`,
    `Vehicle: Mini Lorry (up to N kg)`.
  - It ends with the same fare and availability line.
- **Its own PR** after this one: a new form mode is a separate design change. This PR only ships
  its icon.

### Questions for the owner (Mini Lorry)

1. The lorry's maximum load in kg.
2. Do they supply helpers for loading, and is that priced separately?
3. Goods one way only, or round trips too?
4. Can anyone ride along with the goods? If so, how many in the cab?
5. Anything they won't carry (to say on the form)?

## 11. The buses and the sketch-style icons (2026-11-17, `feat/bus-categories`)

From the owner, in place of the one placeholder bus:

| Category | Passengers | Bags | AC | Sort |
|---|---|---|---|---|
| AC Bus (`ac-bus`, new) | 1–20 | 2 each | yes | 55 |
| Bus (`bus`, the 0027 row, same id) | 1–52 (the fleet's 30–52 seat buses; any group up to 52) | 2 each | no | 60 |

- **0028:** `luggage_per_passenger` and `air_conditioned`, the icon list gains `ac-bus`, the bus
  changes only while it holds 0027's placeholder, and the AC Bus is added. Both are switched on.
- **Bags per passenger:** the card says "2 bags each"; the summary works out the group's total
  ("up to 24 bags" for 12 passengers). The other categories keep one number.
- **The picker:** the stepper's limit becomes 52. "Switch to" suggests the AC Bus for 6 to 20, then
  the Bus for 21 to 52. Mini Van and Van stay off.
- **AC badge:** the AC Bus card's first badge, "AC" with a small snowflake (the canvas's own mark,
  in the badge's colour).
- **Icons:** the "Ride vehicles, sketch style" design canvas, eight icons drawn as our own inline
  SVGs on a 240 × 128 grid: outlines (body 2.4, glass 1.6, seams 1.4, reflections 1.2 at 45%, a
  second body stroke at 1 px, 35%, offset 0.8 / 0.6), filled with the card's colour; wheels with
  tyre, tread, rim, five spokes and a gold hub. The ink is charcoal in the light theme and #ECEAE4
  in the dark theme and on the hero's dark slide. A selected card's ink, glass and hubs are #161616
  on the gold. The wobble (feTurbulence and feDisplacementMap) is one filter per page, applied from
  640 px up; phones keep the double stroke. Checked in Chrome only; Safari is untested here.

## 12. The Mini Lorry: goods mode (2026-11-18, `feat/mini-lorry`)

The owner's answers to part 10's questions. This replaces part 10's Mini Lorry draft. Approved
2026-11-18 with all three choices (switched on, a rider checkbox, no example models) and two
additions: the weight is optional, and a goods round trip asks what comes back.

| Question | Answer |
|---|---|
| Maximum load | 100 kg: the low end of the owner's 100–120, as a hard limit. The card says "Up to 100 kg" |
| Helpers | None, driver only. No helpers question on the form |
| Trip type | One way and round trip |
| People | One rider next to the driver, nobody in the back. No cargo-bed seats. If more people are travelling, the form suggests booking a car or van as well |
| Refused goods | "We don't carry anything illegal, or dangerous goods such as gas cylinders, fuel, fireworks, explosives, or corrosive or toxic chemicals." |

The SUV gets nothing from this PR. Sasindu sets its 5 passengers and 6 bags in Admin → Bookings.
0029 doesn't touch the SUV row, and a test checks that an admin's SUV values survive it. Mini Van
and Van stay switched off, waiting on the owner.

### Data (migration 0029)

- **New columns** on `booking_vehicles`:
  - `kind`: `passenger` (the default; every existing row) or `goods`.
  - `max_load_kg`: 1 to 10000, or empty.
- **Rules:**
  - A goods category has no luggage: `luggage_capacity` and `luggage_per_passenger` are both empty.
  - A goods category can take requests only once `max_load_kg` is set.
  - A passenger category never has a load.
  - The vehicle type list adds `Lorry`.
- **Riders:** a goods category's `passenger_capacity` is its rider seats next to the driver (the lorry's 1).
  `min_passengers` stays 1 and is not used for goods: riding along is optional.
- **The row:**
  - `mini-lorry`, "Mini Lorry", type Lorry, kind goods, 100 kg, 1 rider seat.
  - Icon `mini-lorry`, sort 70, after the Bus.
  - **Switched on**, now that the load is known.
  - Description: "An open-bed lorry for small loads. Driver only, no loading help."
  - No example models: the owner hasn't named any, and the admin can add them.
  - An existing row with this id is left alone.

### Shared rules

- `vehicleSchema` gains `kind` and `maxLoadKg`, with the rules above. `offeredVehicle`,
  `smallestFit` and `maxPassengers` look only at passenger categories, so the stepper's limit stays
  the Bus's 52 and "Switch to" never offers the lorry.
- `checkCapacity` refuses a goods category: "This category carries goods, not passengers." So a
  ride or tour request naming the lorry is refused, and the server needs no new code for it.
- New: `checkLoad(vehicle, kg)` ("The Mini Lorry carries up to 100 kg.") and
  `checkRiders(vehicle, riders)`, plus `loadLabel` ("Up to 100 kg").
- `goodsSchema` in `shared/ride.ts`:
  - the ride's places, trip type and dates;
  - `goods`: what they're moving, required, up to 300 characters;
  - `weightKg`: a whole number from 1, or empty ("not sure");
  - `riders`: 0 or more, checked against the category;
  - `returnLoad`, for a round trip only: `goods`, `empty` or `rider` (only with a rider).
- **Goods requests go through WhatsApp only, like rides.** The API takes no goods requests.

### The form (`/booking`)

- **"What are you booking?"**, Passengers / Goods, a segmented control like the trip type's, above
  it. It's shown only while a goods category is taking requests; with the lorry off the page is
  exactly as now.
- **Switching** keeps pickup, drop-off, trip type and dates, and clears the vehicle choice.
- **Goods mode:**
  - **The picker** shows goods categories only. With one, the lorry is chosen for them, as a single
    card. Its badges are "Goods" and "Up to 100 kg".
  - **In place of the passenger stepper:**
    - *What are you moving?* (text area, required). Under it, the refused-goods note, always shown
      and tied to the field (`aria-describedby`).
    - *Approximate weight in kg (optional)* (number). Its hint: "Not sure? Leave it blank and list
      the items; we'll confirm on WhatsApp." Over 100: "The Mini Lorry carries up to 100 kg."
    - *Someone will ride along: one seat, next to the driver* (checkbox). Under it: "Nobody rides in
      the back. If more people are travelling, book a car or van as well."
  - **Trip type:** both, with the same return fields. A round trip adds *On the way back*:
    Carrying goods / Empty / Rider only, three segments; "Rider only" is there only while the
    rider box is ticked (unticking it clears that choice). Required for a round trip.
  - **The summary** shows the lorry ("Up to 100 kg"), then the goods, the weight ("About 60 kg"
    or "Not sure"), "1 person, next to the driver" or "Goods only", and on a round trip what
    comes back. The phone bar is unchanged and shows the lorry.
- **Passengers mode** is unchanged and never shows the lorry.
- **The hero and the floating Book a ride** are unchanged.

### WhatsApp message (goods)

```
Hi! I'd like to enquire about moving goods in Sri Lanka.
Pickup: …              (address and map lines as now)
Drop-off: …
Trip type: One way
Pickup date/time: 2026-12-01 09:00 (Sri Lanka time, UTC+05:30)
(Return date/time and route, for a round trip, then:)
On the way back: carrying goods                    or: empty, or: rider only
Goods: Two suitcases and a bicycle
Weight: about 60 kg                                or: Weight: not sure
Riding along: 1 person (next to the driver)        or: Riding along: nobody
Vehicle: Mini Lorry (up to 100 kg)
Please confirm the fare and availability.
```

### Elsewhere

- **Tour booking:** `VehicleSelector` leaves out goods categories, so the lorry isn't a disabled
  option there. This is a component change only; `TourBookingPage` is unchanged.
- **Admin → Bookings:**
  - A "Carries" choice, Passengers or Goods.
  - For goods, "Maximum load (kg)" replaces the passenger range and bags. "Most passengers"
    becomes "Seats next to the driver".
  - The admin's list shows "Up to 100 kg" for goods.
- **Docs:** CLAUDE.md marks V+ done (#66) and adds this PR's row in review, with the goods notes
  under Vehicle categories. `docs/RIDE_WHATSAPP.md` gets the goods message.

### Tests

- **Shared:**
  - `checkLoad` passes at 100 and refuses 101;
  - riders 0 and 1 pass, 2 is refused;
  - `goodsSchema` requires what's moving, takes a blank weight, and needs the way back only on a
    round trip ("rider only" only with a rider);
  - the passenger helpers never return the lorry.
- **WhatsApp:** the exact goods messages, one way and round trip, with and without a rider and a
  weight.
- **Server:**
  - 0029 adds the lorry and re-runs cleanly;
  - it leaves an existing `mini-lorry` row alone;
  - an admin's SUV values (5 passengers, 6 bags) survive it;
  - the catalog lists the lorry with its load;
  - a ride or tour request naming the lorry is refused;
  - the admin saves a goods category, and refuses one that takes requests without a load.
- **Chrome:**
  - no switch while the lorry is off;
  - with it on, Goods shows only the lorry with its badges;
  - 101 kg shows the error, and a blank weight is fine;
  - "On the way back" only on a round trip, "Rider only" only with the rider ticked;
  - the refused-goods note is tied to the field;
  - the rider checkbox and its note;
  - the WhatsApp link's text;
  - Passengers mode never shows the lorry;
  - the stepper's limit is still 52;
  - switching back keeps the places and dates.

### Screenshots

The ride states as before (nothing chosen, now with the Passengers / Goods switch) plus four goods
states: Goods mode empty, filled in, over the weight limit (101 kg), and a round trip with a rider. Also Admin →
Bookings with the lorry open. All at 1280 and 375 px, light and dark, at 100% and 120%, in one
local HTML page as before. The hero is unchanged, and the identical pairs say so.
