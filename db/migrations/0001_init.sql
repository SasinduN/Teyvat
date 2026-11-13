-- =============================================================================
-- Teyvat / Travel Eye Sri Lanka — initial schema
-- =============================================================================
-- Self-managed Postgres (Railway). Applied by the repo's own runner:
--
--     npm run migrate                 # applies every pending file in order
--     npm run migrate -- --dry-run    # lists what would be applied
--
-- This file runs BEFORE 0002_seed.sql. It is idempotent — every statement is
-- `create ... if not exists`, `create or replace`, or an `on conflict do
-- nothing` insert — so a re-run is a no-op and never clobbers live data.
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
--   * There are NO row-level security policies, and RLS is not enabled on any
--     table. Every connection to this database is the API service using one
--     Postgres role, so a policy would have nothing to discriminate on.
--     Authorisation lives in Express middleware (`requireAdmin`), and the API
--     is the only thing that ever holds a credential — the browser never talks
--     to Postgres. Do not re-add policies here expecting them to protect
--     anything: they would be evaluated against the service role and pass
--     unconditionally, which is worse than no policy at all because it reads
--     like protection.
--   * Two guarantees the dropped policies used to enforce are now the API's
--     job, and nothing in this file can hold the line on them:
--       - the public enquiry endpoint must build its INSERT from a whitelist
--         of visitor-supplied fields, so `status` stays 'new' and
--         `admin_notes` stays null (was: the `anyone can submit an inquiry`
--         policy's WITH CHECK);
--       - the public content endpoint must filter `published = true` itself
--         (was: the `public read published` policy's USING clause).
-- =============================================================================

begin;
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
-- 6. Authentication
-- -----------------------------------------------------------------------------
-- Replaces the Supabase `admins` allow-list. There is no external identity
-- provider any more: this table IS the user store, and a row here is what
-- grants access to /admin.
--
-- `password_hash` holds a PHC-format argon2id string produced by the API
-- (`@node-rs/argon2`), e.g.
--     $argon2id$v=19$m=19456,t=2,p=1$<salt>$<digest>
-- The CHECK on its prefix is deliberate: it makes it structurally impossible to
-- store a plaintext password, a bcrypt hash, or an argon2i/argon2d hash in this
-- column by mistake. The cost parameters live inside the string, so they can be
-- raised later without invalidating hashes already stored.
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  password_hash text not null check (password_hash like '$argon2id$%'),
  full_name     text,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Login is by email. The old `admins` table had no unique constraint on it at
-- all — two rows sharing an address would have made "which user is this?"
-- depend on physical row order. Lower()ed so `Hello@x.lk` cannot shadow
-- `hello@x.lk`; the API lowercases on lookup to match.
create unique index if not exists users_email_key on public.users (lower(email));

comment on table public.users is
  'Admin users. A row here grants access to /admin; there is no other user store.';

-- Server-side sessions. This table is what makes logout mean something:
-- invalidation is a DELETE, not an expiry the client is trusted to respect.
--     one row                -> log out of this browser
--     by user_id             -> log out everywhere
--     on password change     -> delete every row for that user
--
-- `token_hash` is the SHA-256 (hex, 64 chars) of the random 32-byte token the
-- cookie carries — never the token itself. A database dump or a read-only SQL
-- injection therefore yields nothing a caller can present as a session. The
-- length CHECK enforces that: a raw base64url token is 43 characters and would
-- be rejected outright. SHA-256 rather than argon2 is correct here because the
-- input is already full-entropy random, so there is no search space to slow an
-- attacker down, and this hash is recomputed on every authenticated request.
--
-- `expires_at` is authoritative and must be re-checked in the lookup
-- (`where expires_at > now()`). The cookie's own Max-Age is a client-side
-- convenience and is not trusted.
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  token_hash   text not null unique check (length(token_hash) = 64),
  user_agent   text check (user_agent is null or length(user_agent) <= 400),
  ip           inet,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null check (expires_at > created_at)
);

create index if not exists sessions_user_idx    on public.sessions (user_id);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

comment on column public.sessions.token_hash is
  'SHA-256 hex of the cookie token. The token itself is never stored.';

-- `sessions` deliberately gets no set_updated_at trigger: it tracks
-- `last_seen_at`, which the session middleware advances on purpose.
--
-- Attached as plain statements rather than by extending the array in section 5,
-- so that loop stays exactly as it was for the ten content/enquiry tables.
drop trigger if exists set_updated_at on public.users;
create trigger set_updated_at before update on public.users
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Site settings
-- -----------------------------------------------------------------------------
-- Single-row table — the CHECK on `id` is what enforces "single" — not
-- key/value.
--
-- Key/value would have thrown away per-field validation, which is the one thing
-- this schema leans on everywhere else: a contact email, a phone number and
-- seven links each have a different shape, and a lone `value text` column
-- cannot express that. One row also maps 1:1 onto a TypeScript interface and
-- onto the existing schema-driven admin form, so `select * from site_settings`
-- is already the shape the API returns. The cost is one migration line per new
-- setting, which is cheaper than it looks: adding a setting always means
-- touching the shared types, the admin field descriptors and the component
-- anyway, so the "no migration needed" flexibility of key/value is largely
-- illusory.
--
-- Every value here was hardcoded in `src/components/Footer.tsx`. The defaults
-- below are those exact strings, including the dead `#instagram`-style anchors,
-- so wiring the Footer to this table changes nothing on screen.
create or replace function public.is_link(val text)
returns boolean
language sql
immutable
as $$
  select val is not null
     and length(val) <= 500
     and val ~ '^(https?://[^\s]+|/[^\s]*|#[A-Za-z0-9_-]+)$';
$$;

comment on function public.is_link(text) is
  'Accepts an absolute http(s) URL, a root-relative path, or a #fragment. The '
  'fragment form is what lets the current placeholder links seed unchanged.';

create table if not exists public.site_settings (
  id                 boolean primary key default true check (id),
  postal_address     text not null check (length(btrim(postal_address)) between 1 and 300),
  phone              text not null check (length(btrim(phone)) between 1 and 40),
  contact_email      text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  instagram_url      text not null check (public.is_link(instagram_url)),
  facebook_url       text not null check (public.is_link(facebook_url)),
  tiktok_url         text not null check (public.is_link(tiktok_url)),
  youtube_url        text not null check (public.is_link(youtube_url)),
  privacy_url        text not null check (public.is_link(privacy_url)),
  terms_url          text not null check (public.is_link(terms_url)),
  sustainability_url text not null check (public.is_link(sustainability_url)),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.site_settings is
  'Exactly one row, enforced by the CHECK on `id`. UPDATE it; never INSERT.';

-- `do nothing`, not `do update`: this seeds the initial values only. Re-running
-- this file must never overwrite settings an admin has since edited — unlike
-- 0002_seed.sql, which is a deliberate reset-to-baseline and is upsert-shaped
-- on purpose.
insert into public.site_settings (
  id,
  postal_address,
  phone,
  contact_email,
  instagram_url,
  facebook_url,
  tiktok_url,
  youtube_url,
  privacy_url,
  terms_url,
  sustainability_url
) values (
  true,
  'Level 12, Galle Face Terrace, Colombo 03, Sri Lanka',  -- Footer.tsx:81
  '+94 11 234 5678',                                      -- Footer.tsx:85
  'hello@traveleye.lk',                                   -- Footer.tsx:89-90
  '#instagram',                                           -- Footer.tsx:39
  '#facebook',                                            -- Footer.tsx:42
  '#tiktok',                                              -- Footer.tsx:45
  '#youtube',                                             -- Footer.tsx:48
  '#privacy',                                             -- Footer.tsx:137
  '#terms',                                               -- Footer.tsx:138
  '#sustainability'                                       -- Footer.tsx:139
)
on conflict (id) do nothing;

drop trigger if exists set_updated_at on public.site_settings;
create trigger set_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

commit;
