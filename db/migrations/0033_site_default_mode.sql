-- =============================================================================
-- site_settings.default_mode: what a first-time visitor sees (handoff Task 7)
-- =============================================================================
-- Light (the default: what the site did before), Dark, or Auto (the device's
-- prefers-color-scheme), chosen in Admin → Appearance. Express writes it on
-- <html> as data-default-mode in every page it sends, and public/theme-init.js
-- reads it only when the visitor hasn't chosen light or dark themselves.
--
-- The CHECK is the same list as `shared/default-mode.ts`. Idempotent:
-- re-running it is a no-op.
-- =============================================================================

begin;

alter table public.site_settings add column if not exists default_mode text not null default 'light';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.site_settings'::regclass
       and conname = 'site_settings_default_mode_allowed'
  ) then
    alter table public.site_settings add constraint site_settings_default_mode_allowed check (
      default_mode in ('light', 'dark', 'auto')
    );
  end if;
end;
$$;

comment on column public.site_settings.default_mode is
  'A first visit''s light or dark: light (default), dark or auto. Written on <html> as data-default-mode.';

commit;
