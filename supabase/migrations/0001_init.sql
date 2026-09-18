-- =============================================================================
-- Teyvat / Travel Eye Sri Lanka — initial schema
-- =============================================================================
-- Run this in the Supabase SQL editor (or via `supabase db push`) BEFORE
-- 0002_seed.sql.
--
-- Conventions used throughout:
--   * Content tables use a human-readable text slug as the primary key, so ids
--     stay readable and stable (`ella`, `island-in-7-days`) rather than opaque
--     UUIDs. Slugs are permanent once set — the admin panel locks the field
--     after creation.
--   * Every content table carries `sort_order` (the original array index) and
--     `published`, so the admin can reorder/hide content without code changes.
--   * The destination spotlight is driven by `featured = true` ordered by
--     `sort_order` — NOT by a hardcoded id list in the component. The six rows
--     seeded with featured = true are exactly the six the approved design
--     shows, at sort_order 0-5, so the rendered order is unchanged.
--   * RLS is enabled on every table. Anonymous users may read published rows
--     and insert enquiries; everything else requires an authenticated admin.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Shared helpers
-- -----------------------------------------------------------------------------

-- Keeps updated_at honest without relying on the client.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Admin allow-list. A row here is what grants write access; simply having an
-- auth.users account is not enough.
create table if not exists public.admins (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

comment on table public.admins is
  'Allow-list of auth users permitted to manage content. Insert a row here after creating the auth user.';

-- SECURITY DEFINER so policies can consult `admins` without every caller
-- needing select rights on it, and so the lookup does not recurse through RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Reference value lists (kept as CHECK constraints to mirror the TS unions)
-- -----------------------------------------------------------------------------
-- CategoryType   : 'Beaches' | 'Mountains' | 'Culture' | 'Wildlife'
--                  | 'Adventure' | 'Food' | 'Hidden Gems'   ('All' is UI-only)
-- Destination.region : 'South' | 'Central' | 'East' | 'North'
--                      | 'Cultural Triangle' | 'West'
-- TourPackage.category : 'Luxury' | 'Culture' | 'Wildlife'
--                        | 'Adventure' | 'Full Island'

create or replace function public.is_category_array(vals text[])
returns boolean
language sql
immutable
as $$
  select vals is not null
     and cardinality(vals) = (
       select count(*) from unnest(vals) v
       where v in ('Beaches','Mountains','Culture','Wildlife','Adventure','Food','Hidden Gems')
     );
$$;

-- -----------------------------------------------------------------------------
-- 3. Content tables
-- -----------------------------------------------------------------------------

-- 3.1 Destinations -------------------------------------------------------------
create table if not exists public.destinations (
  id                text primary key,
  name              text not null,
  latitude          double precision not null check (latitude between -90 and 90),
  longitude         double precision not null check (longitude between -180 and 180),
  region            text not null check (region in ('South','Central','East','North','Cultural Triangle','West')),
  province          text not null,
  category          text[] not null default '{}' check (public.is_category_array(category)),
  short_description text not null,
  long_description  text not null,
  image             text not null,
  gallery           text[] not null default '{}',
  best_time         text not null,
  experiences       text[] not null default '{}',
  highlights        text[] not null default '{}',
  rating            numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  elevation         text,
  ideal_for         text[] not null default '{}',
  featured          boolean not null default false,
  sort_order        integer not null default 0,
  published         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists destinations_sort_idx on public.destinations (sort_order, id);
create index if not exists destinations_published_idx on public.destinations (published);

-- 3.2 Experience categories (the "What kind of trip" tiles) --------------------
create table if not exists public.experience_categories (
  id          text primary key,
  title       text not null,
  category    text not null check (category in ('Beaches','Mountains','Culture','Wildlife','Adventure','Food','Hidden Gems')),
  subtitle    text not null,
  image       text not null,
  description text not null,
  sort_order  integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists experience_categories_sort_idx on public.experience_categories (sort_order, id);

-- 3.3 Featured experiences ------------------------------------------------------
create table if not exists public.featured_experiences (
  id              text primary key,
  title           text not null,
  subtitle        text,
  location        text not null,
  duration        text not null,
  category        text not null check (category in ('Beaches','Mountains','Culture','Wildlife','Adventure','Food','Hidden Gems')),
  image           text not null,
  description     text not null,
  highlights      text[] not null default '{}',
  recommended_time text,
  rating          numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  sort_order      integer not null default 0,
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists featured_experiences_sort_idx on public.featured_experiences (sort_order, id);

-- 3.4 Tours ---------------------------------------------------------------------
create table if not exists public.tours (
  id              text primary key,
  title           text not null,
  subtitle        text not null,
  days            integer not null check (days > 0),
  route           text[] not null default '{}',
  short_desc      text not null,
  full_desc       text not null,
  image           text not null,
  highlights      text[] not null default '{}',
  included_places text[] not null default '{}',
  price_from      numeric(10,2) not null default 0 check (price_from >= 0),
  category        text not null check (category in ('Luxury','Culture','Wildlife','Adventure','Full Island')),
  -- [{ day: int, title: text, description: text, location: text }, ...]
  itinerary       jsonb not null default '[]'::jsonb check (jsonb_typeof(itinerary) = 'array'),
  sort_order      integer not null default 0,
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists tours_sort_idx on public.tours (sort_order, id);

-- 3.5 Journal articles ----------------------------------------------------------
-- `published_at` is a real date; the front-end renders it as
-- "February 12, 2026" via Intl, which reproduces the original strings exactly.
create table if not exists public.articles (
  id            text primary key,
  title         text not null,
  category      text not null,
  published_at  date not null,
  read_time     text not null,
  image         text not null,
  snippet       text not null,
  author_name   text not null,
  author_avatar text not null,
  author_role   text not null,
  content       text[] not null default '{}',
  sort_order    integer not null default 0,
  published     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists articles_sort_idx on public.articles (sort_order, id);

-- 3.6 Hidden gems ---------------------------------------------------------------
create table if not exists public.hidden_gems (
  id          text primary key,
  name        text not null,
  region      text not null,
  image       text not null,
  description text not null,
  why_visit   text not null,
  tag         text not null,
  sort_order  integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists hidden_gems_sort_idx on public.hidden_gems (sort_order, id);

-- 3.7 Photo stories -------------------------------------------------------------
create table if not exists public.photo_stories (
  id         text primary key,
  title      text not null,
  location   text not null,
  category   text not null,
  image      text not null,
  caption    text not null,
  aspect     text check (aspect in ('square','portrait','landscape')),
  sort_order integer not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photo_stories_sort_idx on public.photo_stories (sort_order, id);

-- 3.8 Hero slides ---------------------------------------------------------------
-- The full-screen rotating hero carousel on the landing page.
create table if not exists public.hero_slides (
  id         text primary key,
  image      text not null,
  title      text not null,
  caption    text not null,
  sort_order integer not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hero_slides_sort_idx on public.hero_slides (sort_order, id);

comment on column public.hero_slides.image is
  'Named `image` for consistency with every other content table; the component prop is `url`.';

-- 3.9 Pillars -------------------------------------------------------------------
-- The "Why Travel Eye" value propositions.
--
-- `icon` stores a Lucide icon NAME, not a component — a database cannot hold a
-- React component. The rendering component maps the name back to an icon. The
-- CHECK below is the same allow-list as `PillarIcon` in src/types/index.ts and
-- the component's lookup map; all three change together, which is deliberate:
-- a typo here would otherwise silently blank an icon in production.
create table if not exists public.pillars (
  id          text primary key,
  icon        text not null check (icon in (
                'Users','Compass','Sliders','Leaf','Heart','ShieldCheck',
                'Star','MapPin','Camera','Globe','Sparkles','Award',
                'Clock','Handshake','Mountain','Waves','Utensils','Binoculars'
              )),
  title       text not null,
  description text not null,
  sort_order  integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists pillars_sort_idx on public.pillars (sort_order, id);

comment on column public.pillars.description is
  'Named `description`, not `desc` — DESC is a reserved word in SQL. The component prop is `desc`.';

-- -----------------------------------------------------------------------------
-- 4. Enquiries (captured from the public InquiryModal)
-- -----------------------------------------------------------------------------
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 120),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (phone is null or length(phone) <= 40),
  travelers   text not null check (length(travelers) <= 80),
  dates       text not null check (length(dates) <= 80),
  subject     text not null default '' check (length(subject) <= 300),
  message     text not null default '' check (length(message) <= 5000),
  status      text not null default 'new'
                check (status in ('new','in_progress','responded','closed','archived')),
  admin_notes text check (admin_notes is null or length(admin_notes) <= 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
create index if not exists inquiries_status_idx on public.inquiries (status);

-- -----------------------------------------------------------------------------
-- 5. updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'destinations','experience_categories','featured_experiences',
    'tours','articles','hidden_gems','photo_stories',
    'hero_slides','pillars','inquiries'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.admins                enable row level security;
alter table public.destinations          enable row level security;
alter table public.experience_categories enable row level security;
alter table public.featured_experiences  enable row level security;
alter table public.tours                 enable row level security;
alter table public.articles              enable row level security;
alter table public.hidden_gems           enable row level security;
alter table public.photo_stories         enable row level security;
alter table public.hero_slides           enable row level security;
alter table public.pillars               enable row level security;
alter table public.inquiries             enable row level security;

-- 6.1 admins: an admin may read the allow-list (needed by the admin UI to
--     confirm its own role). Nobody may write it from the client — add admins
--     via the SQL editor / service role only.
drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row"
  on public.admins for select
  to authenticated
  using (id = auth.uid());

-- 6.2 Content tables: anonymous + authenticated may read PUBLISHED rows;
--     admins may read everything and write everything.
do $$
declare
  t text;
begin
  foreach t in array array[
    'destinations','experience_categories','featured_experiences',
    'tours','articles','hidden_gems','photo_stories',
    'hero_slides','pillars'
  ]
  loop
    execute format('drop policy if exists "public read published" on public.%I;', t);
    execute format($f$
      create policy "public read published" on public.%I
        for select to anon, authenticated
        using (published = true or public.is_admin());
    $f$, t);

    execute format('drop policy if exists "admin insert" on public.%I;', t);
    execute format($f$
      create policy "admin insert" on public.%I
        for insert to authenticated
        with check (public.is_admin());
    $f$, t);

    execute format('drop policy if exists "admin update" on public.%I;', t);
    execute format($f$
      create policy "admin update" on public.%I
        for update to authenticated
        using (public.is_admin()) with check (public.is_admin());
    $f$, t);

    execute format('drop policy if exists "admin delete" on public.%I;', t);
    execute format($f$
      create policy "admin delete" on public.%I
        for delete to authenticated
        using (public.is_admin());
    $f$, t);
  end loop;
end;
$$;

-- 6.3 Enquiries: anyone may submit one; only admins may read or manage them.
drop policy if exists "anyone can submit an inquiry" on public.inquiries;
create policy "anyone can submit an inquiry"
  on public.inquiries for insert
  to anon, authenticated
  with check (status = 'new' and admin_notes is null);

drop policy if exists "admin read inquiries" on public.inquiries;
create policy "admin read inquiries"
  on public.inquiries for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin update inquiries" on public.inquiries;
create policy "admin update inquiries"
  on public.inquiries for update
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete inquiries" on public.inquiries;
create policy "admin delete inquiries"
  on public.inquiries for delete
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. Storage bucket for admin-uploaded media
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/avif','image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media public read" on storage.objects;
create policy "media public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media admin update" on storage.objects;
create policy "media admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_admin());
