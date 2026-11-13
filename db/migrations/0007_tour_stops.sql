-- =============================================================================
-- Teyvat / Travel Eye Sri Lanka — tour route stops, and airport travel time
-- =============================================================================
-- A tour's route was a list of place names (`tours.route`). The map can only
-- draw a route whose stops have coordinates, so each stop becomes a row of
-- `public.tour_stops`, in order. A stop is either:
--
--   * a linked destination: its coordinates come from the destination, so
--     moving the destination moves every route through it. `name` is an
--     optional chip label (NULL: the destination's name), which keeps a chip
--     reading "Yala" rather than "Yala National Park"; or
--   * a custom place: its own name, lat and lng.
--
-- The CHECKs keep coordinates inside a generous box around Sri Lanka (the
-- same numbers as `shared/tour-stops.ts`), to catch swapped or mistyped ones.
-- A destination that a route uses can't be deleted (ON DELETE RESTRICT); the
-- admin API answers 409 naming the tours.
--
-- The existing routes are converted, then `tours.route` is dropped:
--
--   * a stop whose text is a destination's name or slug links to it;
--   * Island in 7 Days: "South Coast" becomes Mirissa and Galle (the tour's
--     own days 6 and 7);
--   * Wilpattu, Minneriya and Unawatuna become custom stops at coordinates
--     the owner confirmed on Google Maps (the parks' main entrances);
--   * anything else stops the migration with an error that names it, rather
--     than guessing.
--
-- Also adds `destinations.travel_time_from_airport`: optional short text such
-- as "~4 h", shown as "~4 h from Colombo airport (CMB)".
--
-- Idempotent: the conversion runs only while `tours.route` exists. The test
-- helper `resetContent()` re-adds that column, replays 0002 and then this
-- file, so every test reset runs the real conversion.
-- =============================================================================

begin;

create table if not exists public.tour_stops (
  id             bigint generated always as identity primary key,
  tour_id        text not null references public.tours (id) on delete cascade on update cascade,
  position       integer not null check (position >= 0),
  destination_id text references public.destinations (id) on delete restrict on update cascade,
  name           text check (name is null or length(btrim(name)) between 1 and 80),
  lat            double precision check (lat is null or lat between 5.5 and 10.0),
  lng            double precision check (lng is null or lng between 79.3 and 82.1),
  unique (tour_id, position),
  constraint tour_stops_shape check (
    (destination_id is not null and lat is null and lng is null) or
    (destination_id is null and name is not null and lat is not null and lng is not null)
  )
);

create index if not exists tour_stops_destination_idx on public.tour_stops (destination_id);

alter table public.destinations add column if not exists travel_time_from_airport text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.destinations'::regclass
       and conname = 'destinations_travel_time_from_airport_check'
  ) then
    alter table public.destinations add constraint destinations_travel_time_from_airport_check
      check (travel_time_from_airport is null
             or length(btrim(travel_time_from_airport)) between 1 and 30);
  end if;
end;
$$;

do $$
declare
  tour        record;
  stop_text   text;
  pos         integer;
  dest        record;
  link        record;
  unresolved  text[] := '{}';
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'tours' and column_name = 'route'
  ) then
    return;
  end if;

  -- `execute`, because the column is gone once this has run.
  for tour in execute 'select id, route from public.tours order by id' loop
    delete from public.tour_stops where tour_id = tour.id;
    pos := 0;

    foreach stop_text in array tour.route loop
      stop_text := btrim(stop_text);

      if tour.id = 'island-in-7-days' and stop_text = 'South Coast' then
        for link in
          select * from (values (0, 'mirissa', 'Mirissa'), (1, 'galle', 'Galle')) as v(n, dest_id, label)
           order by n
        loop
          select id, name into dest from public.destinations where id = link.dest_id;
          if not found then
            unresolved := unresolved || format('%s: %s (needs destination "%s")', tour.id, stop_text, link.dest_id);
            continue;
          end if;
          insert into public.tour_stops (tour_id, position, destination_id, name)
          values (tour.id, pos, dest.id, nullif(link.label, dest.name));
          pos := pos + 1;
        end loop;

      elsif stop_text in ('Wilpattu', 'Minneriya', 'Unawatuna') then
        -- Confirmed by the owner on Google Maps.
        insert into public.tour_stops (tour_id, position, name, lat, lng)
        select tour.id, pos, stop_text, c.lat, c.lng
          from (values
                  ('Wilpattu',  8.3063, 80.1484),  -- Hunuwilagama main entrance
                  ('Minneriya', 8.0326, 80.8236),  -- national park ticket office
                  ('Unawatuna', 6.0183, 80.2525)
               ) as c(name, lat, lng)
         where c.name = stop_text;
        pos := pos + 1;

      else
        -- A destination by name, else by slug ("Yala" -> yala).
        select id, name into dest
          from public.destinations
         where lower(name) = lower(stop_text)
            or id = lower(regexp_replace(stop_text, '\s+', '-', 'g'))
         order by (lower(name) = lower(stop_text)) desc, id
         limit 1;

        if not found then
          unresolved := unresolved || format('%s: %s', tour.id, stop_text);
          continue;
        end if;

        insert into public.tour_stops (tour_id, position, destination_id, name)
        values (tour.id, pos, dest.id, nullif(stop_text, dest.name));
        pos := pos + 1;
      end if;
    end loop;
  end loop;

  if cardinality(unresolved) > 0 then
    raise exception 'tour_stops: no destination or confirmed coordinates for %',
      array_to_string(unresolved, '; ')
      using hint = 'Add the place as a destination, or add its confirmed coordinates to this migration.';
  end if;

  alter table public.tours drop column route;
end;
$$;

commit;
