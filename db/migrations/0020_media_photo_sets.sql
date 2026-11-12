-- =============================================================================
-- photo sets in the media library
-- =============================================================================
-- One photograph at several widths, for `srcset`. `npm run images:migrate-assets`
-- moves the photos in public/assets/ into R2 and fills these in: `photo_key` is
-- the photograph's key in shared/travel-photos.json, `width` the file's width.
--
-- The public site learns each photo's R2 URLs from these rows, so a photo moves
-- as soon as its rows commit, and it reads the files in public/assets/ until
-- then. The library lists a set once (its 1280 px file) and deletes it whole, so
-- nobody can break a srcset by deleting one width.
--
-- An ordinary upload leaves both NULL.
--
-- Idempotent, like the others.
-- =============================================================================

begin;

alter table public.media
  add column if not exists photo_key text,
  add column if not exists width integer;

alter table public.media drop constraint if exists media_photo_set_check;
alter table public.media add constraint media_photo_set_check check (
  (photo_key is null and width is null)
  or (photo_key ~ '^[a-z0-9-]+$' and width between 1 and 8000)
);

create unique index if not exists media_photo_set_idx
  on public.media (photo_key, width) where photo_key is not null;

comment on column public.media.photo_key is
  'The photograph this file is a width of (shared/travel-photos.json); NULL for an ordinary upload.';
comment on column public.media.width is
  'The file''s width in px, when it belongs to a photo set.';

commit;
