-- ---------------------------------------------------------------------------
-- Two bus categories, from the owner (docs/plans/ride-vehicle-picker.md, part 11)
--
--   ac-bus  AC Bus: 1–20 passengers, 2 bags each, air-conditioned, taking requests
--   bus     Bus (non-AC, the fleet's 30–52 seat buses): 1–52 passengers, any group
--           up to 52, 2 bags each, taking requests
--
-- Passenger counts never include the driver. Luggage for these is per passenger
-- (`luggage_per_passenger`), so a group of 12 may bring 24 bags; the other
-- categories keep one number for the vehicle (`luggage_capacity`).
--
-- The bus row keeps its id (bookings may point at it) and changes only while it
-- still holds 0027's placeholder (10–30, switched off, no bags), as 0021 and 0025
-- do, so an admin's edit stays. Its description changes only while it is 0027's.
-- Re-runnable: a second run changes nothing.
-- ---------------------------------------------------------------------------

begin;

alter table public.booking_vehicles
  add column if not exists luggage_per_passenger integer check (luggage_per_passenger between 1 and 10),
  add column if not exists air_conditioned boolean not null default false;

alter table public.booking_vehicles drop constraint if exists booking_vehicles_one_luggage_rule;
alter table public.booking_vehicles add constraint booking_vehicles_one_luggage_rule
  check (luggage_capacity is null or luggage_per_passenger is null);

-- The AC Bus has its own drawing.
alter table public.booking_vehicles drop constraint if exists booking_vehicles_icon_check;
alter table public.booking_vehicles add constraint booking_vehicles_icon_check
  check (icon in ('mini', 'car', 'suv', 'mini-van', 'van', 'ac-bus', 'bus', 'mini-lorry'));

-- The bus: the owner's numbers, while it still holds 0027's placeholder.
update public.booking_vehicles
   set min_passengers = 1, passenger_capacity = 52, luggage_per_passenger = 2, accepting_requests = true
 where id = 'bus' and min_passengers = 10 and passenger_capacity = 30
   and luggage_capacity is null and luggage_per_passenger is null and not accepting_requests;
update public.booking_vehicles
   set description = 'Non-AC 30–52 seat buses for big groups and tours.'
 where id = 'bus' and description = 'A coach for larger groups and tours.';

-- The AC Bus, after SUV and Van and before the Bus. An existing row with this id is left alone.
insert into public.booking_vehicles
  (id, name, type, description, min_passengers, passenger_capacity, luggage_per_passenger,
   air_conditioned, icon, sort_order, accepting_requests)
values
  ('ac-bus', 'AC Bus', 'Bus', 'An air-conditioned bus for tours and groups.', 1, 20, 2, true, 'ac-bus', 55, true)
on conflict (id) do nothing;

commit;
