-- Owner-requested SUV category; staff must confirm capacities before enabling.
begin;
insert into public.booking_vehicles (id, name, type)
values ('suv', 'SUV', 'SUV') on conflict (id) do nothing;
commit;
