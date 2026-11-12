-- =============================================================================
-- site_settings.text_size
-- =============================================================================
-- The site-wide text size, a percent of the visitor's browser default. Express
-- writes it on <html> in every page it sends, and the stylesheet makes it the
-- root font-size, so there is no flash and the CSP needs nothing new.
--
-- The CHECK is the same rule as `shared/text-size.ts`. Existing sites keep
-- today's size: the default is 100. Idempotent: re-running it is a no-op.
-- =============================================================================

begin;

alter table public.site_settings add column if not exists text_size smallint not null default 100;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.site_settings'::regclass
       and conname = 'site_settings_text_size_allowed'
  ) then
    alter table public.site_settings add constraint site_settings_text_size_allowed check (
      text_size in (100, 110, 120)
    );
  end if;
end;
$$;

commit;
