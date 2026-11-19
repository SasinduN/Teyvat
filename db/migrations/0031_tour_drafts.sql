-- ---------------------------------------------------------------------------
-- New tour drafts (docs/plans/new-tours.md, tour categories PR 2)
--
--   * tours.best_months: the months a tour suits, 1 to 12, sorted, like
--     destinations.best_months (0022). Empty: not set. The seed's four tours stay
--     empty; an admin can set them. Every draft `npm run content:import` writes
--     has its months, from docs/reviews/new-tours-sources.md.
--   * content_imports may record tours too, so the import updates a tour only
--     while nobody has saved it in the admin, and never re-creates one deleted there.
--
-- No row changes. Re-runnable.
-- ---------------------------------------------------------------------------

begin;

alter table public.tours
  add column if not exists best_months integer[] not null default '{}';

alter table public.tours drop constraint if exists tours_best_months_check;
alter table public.tours add constraint tours_best_months_check
  check (best_months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

comment on column public.tours.best_months is
  'Months 1 to 12, sorted, only where a source supports them. Empty: not set.';

alter table public.content_imports drop constraint if exists content_imports_table_name_check;
alter table public.content_imports add constraint content_imports_table_name_check
  check (table_name in ('destinations', 'attractions', 'tours'));

commit;
