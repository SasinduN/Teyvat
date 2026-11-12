-- =============================================================================
-- site_settings links: NULL or https://
-- =============================================================================
-- Phase 4 makes the seven footer links editable in the admin panel, and they
-- render straight into `href`. The rule for each is now:
--
--     NULL (not set: the Footer renders the link without an href)
--     or an https:// URL
--
-- 0001 seeded them with `#instagram`-style placeholders and a CHECK
-- (`public.is_link`) that allowed those and rejected NULL. This migration:
--
--   1. drops those CHECKs and the NOT NULLs on the seven columns,
--   2. turns the `#…` placeholders into NULL, and only those: any other value
--      that is not https:// makes step 3 fail and stops the deploy, rather
--      than being quietly erased,
--   3. adds the new CHECK, fully validated against the existing row.
--
-- `public.is_link()` is left in place, unused, so nothing that may reference
-- it breaks.
--
-- Idempotent: re-running it is a no-op.
-- =============================================================================

begin;

do $$
declare
  col text;
begin
  foreach col in array array[
    'instagram_url','facebook_url','tiktok_url','youtube_url',
    'privacy_url','terms_url','sustainability_url'
  ]
  loop
    execute format(
      'alter table public.site_settings drop constraint if exists %I', 'site_settings_' || col || '_check');
    execute format(
      'alter table public.site_settings alter column %I drop not null', col);
    execute format(
      'update public.site_settings set %I = null where %I like ''#%%''', col, col);

    if not exists (
      select 1 from pg_constraint
       where conrelid = 'public.site_settings'::regclass
         and conname = 'site_settings_' || col || '_https'
    ) then
      execute format(
        'alter table public.site_settings add constraint %I check '
        '(%I is null or (%I ~ ''^https://[^\s]+$'' and length(%I) <= 500))',
        'site_settings_' || col || '_https', col, col, col, col);
    end if;
  end loop;
end;
$$;

commit;
