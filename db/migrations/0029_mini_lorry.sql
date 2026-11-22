-- ---------------------------------------------------------------------------
-- The Mini Lorry: goods, not passengers (docs/plans/ride-vehicle-picker.md, part 12)
--
--   mini-lorry  Mini Lorry: goods up to 100 kg (the low end of the owner's
--               100–120), one rider seat next to the driver, nobody in the
--               back, no helpers; taking requests
--
-- `kind` says what a category carries: `passenger` (every existing row) or
-- `goods`. A goods category has a `max_load_kg` and no luggage, and its
-- `passenger_capacity` is its seats next to the driver; `min_passengers` isn't
-- used for it (riding along is optional).
--
-- No other row changes: the SUV's numbers are set in Admin → Bookings, and Mini
-- Van and Van stay switched off. An existing row with the lorry's id is left
-- alone. Re-runnable: a second run changes nothing.
-- ---------------------------------------------------------------------------

begin;

alter table public.booking_vehicles
  add column if not exists kind text not null default 'passenger' check (kind in ('passenger', 'goods')),
  add column if not exists max_load_kg integer check (max_load_kg between 1 and 10000);

-- A passenger category never has a load; a goods category has no luggage, and takes requests only with a load.
alter table public.booking_vehicles drop constraint if exists booking_vehicles_goods_rules;
alter table public.booking_vehicles add constraint booking_vehicles_goods_rules
  check (case kind
    when 'passenger' then max_load_kg is null
    else luggage_capacity is null and luggage_per_passenger is null and (not accepting_requests or max_load_kg is not null)
  end);

-- A lorry is its own type.
alter table public.booking_vehicles drop constraint if exists booking_vehicles_type_check;
alter table public.booking_vehicles add constraint booking_vehicles_type_check
  check (type in ('Car', 'SUV', 'Van', 'Minibus', 'Bus', 'Lorry'));

insert into public.booking_vehicles
  (id, name, type, kind, description, min_passengers, passenger_capacity, max_load_kg, icon, sort_order, accepting_requests)
values
  ('mini-lorry', 'Mini Lorry', 'Lorry', 'goods', 'An open-bed lorry for small loads. Driver only, no loading help.',
   1, 1, 100, 'mini-lorry', 70, true)
on conflict (id) do nothing;

commit;
