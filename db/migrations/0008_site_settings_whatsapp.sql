-- =============================================================================
-- Teyvat / Travel Eye Sri Lanka — site_settings.whatsapp_number
-- =============================================================================
-- The number behind the public site's WhatsApp chat button, which opens
-- https://wa.me/<number>. International format, digits only, no "+":
-- e.g. 94771234567. NULL means "not set", and the button is hidden, so this
-- can ship before the number is known.
--
-- The CHECK is the same rule as `shared/whatsapp.ts`:
--
--   * 8 to 15 digits (15 is the E.164 maximum);
--   * not starting 0 (a local number, missing its country code);
--   * not starting 940 (the country code plus the local 0).
--
-- The admin form strips spaces, dashes, brackets and a leading "+" before
-- validating, so only digits are ever stored.
--
-- Seeds nothing: the column is added empty. Idempotent: re-running it is a
-- no-op.
-- =============================================================================

begin;

alter table public.site_settings add column if not exists whatsapp_number text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.site_settings'::regclass
       and conname = 'site_settings_whatsapp_number_format'
  ) then
    alter table public.site_settings add constraint site_settings_whatsapp_number_format check (
      whatsapp_number is null
      or (whatsapp_number ~ '^[1-9][0-9]{7,14}$' and whatsapp_number !~ '^940')
    );
  end if;
end;
$$;

commit;
