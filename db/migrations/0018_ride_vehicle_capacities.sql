-- Owner confirmed Car and SUV each support 5 passengers and 3 bags.
-- Explicit configuration change; existing booking records remain unchanged.
begin;
insert into public.booking_vehicles
  (id, name, type, passenger_capacity, luggage_capacity, accepting_requests)
values ('car', 'Car', 'Car', 5, 3, true), ('suv', 'SUV', 'SUV', 5, 3, true)
on conflict (id) do update set
  passenger_capacity = excluded.passenger_capacity,
  luggage_capacity = excluded.luggage_capacity,
  accepting_requests = excluded.accepting_requests;
commit;
