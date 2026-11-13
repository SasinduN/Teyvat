-- ---------------------------------------------------------------------------
-- nearby attractions, and a record of what `npm run content:import` wrote
--
-- public.attractions: places worth seeing near a destination, each belonging to one
-- (deleting the destination deletes them). The public site shows an attraction only
-- while it AND its destination are published (`GET /api/content` joins them). New
-- rows start as drafts: `published` defaults to false.
--
-- public.content_imports: one row per destination or attraction that
-- `npm run content:import` created, with the `updated_at` it left. A later run updates
-- that row only while its `updated_at` is still that one, so an edit in the admin is
-- never overwritten, and it never re-creates a row an admin deleted.
--
-- Re-runnable: every statement checks before it creates.
-- ---------------------------------------------------------------------------

begin;

create table if not exists public.attractions (
  id                text primary key,
  destination_id    text not null references public.destinations (id) on delete cascade,
  name              text not null check (length(btrim(name)) between 1 and 300),
  category          text not null check (public.is_category_array(array[category])),
  short_description text not null check (length(btrim(short_description)) between 1 and 300),
  latitude          double precision not null check (latitude between 5.5 and 10),
  longitude         double precision not null check (longitude between 79.3 and 82.1),
  image             text check (image is null or image like 'https://%'),
  best_months       integer[] not null default '{}'
                    check (best_months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  sort_order        integer not null default 0,
  published         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.attractions is
  'Places near a destination, shown on its page and on the maps. Public only while it and its destination are published.';
comment on column public.attractions.image is
  'An openly licensed photo in R2, credited in image_credits; NULL shows a placeholder.';
comment on column public.attractions.best_months is
  'Months 1 to 12, sorted, only where a source supports them. Empty: not set.';

create index if not exists attractions_destination_id on public.attractions (destination_id, sort_order);

drop trigger if exists set_updated_at on public.attractions;
create trigger set_updated_at before update on public.attractions
  for each row execute function public.set_updated_at();

create table if not exists public.content_imports (
  table_name     text not null check (table_name in ('destinations', 'attractions')),
  row_id         text not null,
  -- What the import wrote, so a run with the same content changes nothing.
  content_hash   text not null,
  -- The row's updated_at right after the import wrote it. Any other value: edited since.
  row_updated_at timestamptz not null,
  imported_at    timestamptz not null default now(),
  primary key (table_name, row_id)
);

comment on table public.content_imports is
  'Rows npm run content:import created. It updates one only while its updated_at is still row_updated_at.';

commit;
