-- =============================================================================
-- site_settings.palette: the site's colour theme (docs/plans/brand-themes.md, PR B)
-- =============================================================================
-- Sunset (the default, from the logo), Emerald (the colours before) or Ocean,
-- chosen in Admin → Settings. Express writes it on <html> as data-palette in
-- every page it sends, and src/styles/tokens.css gives each theme its colours,
-- so there is no flash and the CSP needs nothing new.
--
-- The CHECK is the same list as `shared/palette.ts`. The default is Sunset, so
-- the site switches to it when this runs; an admin can choose Emerald again.
-- Idempotent: re-running it is a no-op.
-- =============================================================================

begin;

alter table public.site_settings add column if not exists palette text not null default 'sunset';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.site_settings'::regclass
       and conname = 'site_settings_palette_allowed'
  ) then
    alter table public.site_settings add constraint site_settings_palette_allowed check (
      palette in ('sunset', 'emerald', 'ocean')
    );
  end if;
end;
$$;

comment on column public.site_settings.palette is
  'The colour theme: sunset (default), emerald or ocean. Written on <html> as data-palette.';

commit;
