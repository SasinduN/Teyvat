-- Manual hotel, airport and city drop-offs have no catalogue destination ID.
-- Keep all existing booking/contact/tour data and foreign keys intact.
begin;
alter table public.bookings alter column destination_id drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_manual_ride_destination' and conrelid = 'public.bookings'::regclass) then
    alter table public.bookings add constraint bookings_manual_ride_destination check (
      destination_id is not null or (
        coalesce(details->>'kind', '') = 'ride'
        and jsonb_typeof(details->'dropoff') = 'object'
        and length(btrim(coalesce(details->'dropoff'->>'label', ''))) > 0
      )
    );
  end if;
end $$;
commit;
