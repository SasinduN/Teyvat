-- ---------------------------------------------------------------------------
-- Vehicle categories for the ride page's picker
--
-- Every category gets what a card shows: a one-line description, example
-- models, a passenger range (min_passengers to passenger_capacity), an icon,
-- an optional image and a sort order. Passenger counts never include the
-- driver: every ride comes with one (docs/plans/ride-vehicle-picker.md).
--
--   mini      1–3 passengers, 2 bags, taking requests (owner-confirmed)
--   car       1–4 passengers, 4 bags: 0018's 5 counted the driver's seat
--   mini-van  1–6, van 1–9, bus 10–30: placeholders, switched off
--   suv       numbers unchanged (being confirmed); gets a description,
--             icon and sort order only
--
-- `icon` names one of the site's own drawings (VehicleIcon); an image chosen
-- in Admin → Bookings (`image_url`, from the media library) replaces it.
--
-- As in 0021 and 0025, a value already in the table changes only while it
-- still holds the exact old value, and new text only fills empty columns, so
-- what an admin saved stays. Re-runnable: a second run changes nothing.
-- ---------------------------------------------------------------------------

begin;

alter table public.booking_vehicles
  add column if not exists description    text check (description is null or length(btrim(description)) between 1 and 200),
  add column if not exists example_models text[] not null default '{}' check (cardinality(example_models) <= 6),
  add column if not exists min_passengers integer not null default 1 check (min_passengers between 1 and 100),
  add column if not exists icon           text not null default 'car'
    check (icon in ('mini', 'car', 'suv', 'mini-van', 'van', 'bus', 'mini-lorry')),
  add column if not exists image_url      text check (image_url is null or length(image_url) between 1 and 500),
  add column if not exists sort_order     integer not null default 0;

alter table public.booking_vehicles drop constraint if exists booking_vehicles_min_within_capacity;
alter table public.booking_vehicles add constraint booking_vehicles_min_within_capacity
  check (passenger_capacity is null or min_passengers <= passenger_capacity);

-- A bus is its own type now.
alter table public.booking_vehicles drop constraint if exists booking_vehicles_type_check;
alter table public.booking_vehicles add constraint booking_vehicles_type_check
  check (type in ('Car', 'SUV', 'Van', 'Minibus', 'Bus'));

-- New categories. An existing row with the same id is left alone.
insert into public.booking_vehicles
  (id, name, type, passenger_capacity, luggage_capacity, accepting_requests, min_passengers)
values
  ('mini',     'Mini',     'Car',  3,    2,    true,  1),
  ('mini-van', 'Mini Van', 'Van',  6,    null, false, 1),
  ('van',      'Van',      'Van',  9,    null, false, 1),
  ('bus',      'Bus',      'Bus',  30,   null, false, 10)
on conflict (id) do nothing;

-- Car: 4 passengers and 4 bags, only while it holds 0018's 5 and 3.
update public.booking_vehicles set passenger_capacity = 4 where id = 'car' and passenger_capacity = 5;
update public.booking_vehicles set luggage_capacity = 4 where id = 'car' and luggage_capacity = 3;

-- What the cards show, only where nothing is set yet (the icon: only while it is the default).
with card (id, description, example_models, icon, sort_order) as (values
  ('mini',     'A small hatchback for town runs and light luggage.',
               array['Suzuki Wagon R', 'Toyota Vitz', 'Toyota Aqua'], 'mini', 10),
  ('car',      'A comfortable saloon for airport runs and longer drives.',
               array['Toyota Prius', 'Toyota Axio', 'Toyota Allion'], 'car', 20),
  ('suv',      'A higher seat and more room for hill-country roads.',
               array[]::text[], 'suv', 30),
  ('mini-van', 'A compact van with sliding doors for small groups.',
               array['Suzuki Every', 'Nissan Clipper', 'Daihatsu Hijet'], 'mini-van', 40),
  ('van',      'A full-size van for families and groups with luggage.',
               array['Toyota KDH', 'Nissan Urvan'], 'van', 50),
  ('bus',      'A coach for larger groups and tours.',
               array[]::text[], 'bus', 60)
)
update public.booking_vehicles v
   set description    = coalesce(v.description, card.description),
       example_models = case when cardinality(v.example_models) = 0 then card.example_models else v.example_models end,
       icon           = case when v.icon = 'car' then card.icon else v.icon end,
       sort_order     = case when v.sort_order = 0 then card.sort_order else v.sort_order end
  from card
 where v.id = card.id;

commit;
