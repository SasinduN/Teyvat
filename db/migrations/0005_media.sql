-- =============================================================================
-- the media library
-- =============================================================================
-- One row per image uploaded to the R2 bucket through POST /api/admin/media.
--
-- The row is what makes an image "ours": a URL under R2_PUBLIC_BASE_URL with
-- no row here is treated as someone else's and is never deleted. It is also
-- what a library delete and a content save lock against each other, so an
-- image can't be deleted in the moment another save starts using it.
--
-- Nothing is deleted automatically. An image no content row uses shows as
-- "Unused" in the library until an admin deletes it there.
--
-- Idempotent, like the others.
-- =============================================================================

begin;

create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  -- <folder>/<timestamp>-<random>.<ext>
  key          text not null unique check (key ~ '^[a-z0-9-]+/[0-9]+-[0-9a-f]+\.(jpg|png|webp|avif)$'),
  url          text not null unique check (url like 'https://%'),
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp','image/avif')),
  bytes        integer not null check (bytes between 1 and 10485760),
  uploaded_by  uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists media_created_idx on public.media (created_at desc);

comment on table public.media is
  'Images uploaded to R2. A URL under R2_PUBLIC_BASE_URL is ours only if it has a row here.';

commit;
