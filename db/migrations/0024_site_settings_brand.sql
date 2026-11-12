-- =============================================================================
-- site_settings: the brand's name, short name, tagline and legal name, and
-- the home page's headline
-- =============================================================================
-- The brand's defaults live in `shared/brand.ts`; these columns let an admin
-- override each one (Admin → Settings). NULL means "use the default from
-- shared/brand.ts", so this migration changes no text on an existing site.
-- hero_headline: the home page's h1. NULL: the brand's tagline.
--
-- The lengths are `BRAND_MAX_LENGTH` in `shared/brand.ts`. A value is never
-- blank: the form saves an empty box as NULL. Idempotent.
-- =============================================================================

begin;

alter table public.site_settings add column if not exists brand_name text;
alter table public.site_settings add column if not exists brand_short_name text;
alter table public.site_settings add column if not exists brand_tagline text;
alter table public.site_settings add column if not exists brand_legal_name text;
alter table public.site_settings add column if not exists hero_headline text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.site_settings'::regclass
       and conname = 'site_settings_brand_lengths'
  ) then
    alter table public.site_settings add constraint site_settings_brand_lengths check (
          (brand_name is null or char_length(btrim(brand_name)) between 1 and 60)
      and (brand_short_name is null or char_length(btrim(brand_short_name)) between 1 and 30)
      and (brand_tagline is null or char_length(btrim(brand_tagline)) between 1 and 120)
      and (brand_legal_name is null or char_length(btrim(brand_legal_name)) between 1 and 120)
      and (hero_headline is null or char_length(btrim(hero_headline)) between 1 and 120)
    );
  end if;
end;
$$;

comment on column public.site_settings.brand_name is
  'The brand''s name. NULL: the default in shared/brand.ts.';
comment on column public.site_settings.brand_short_name is
  'The brand''s short name (web manifest, admin sidebar). NULL: the default in shared/brand.ts.';
comment on column public.site_settings.brand_tagline is
  'The line under the brand (home title, footer, llms.txt). NULL: the default in shared/brand.ts.';
comment on column public.site_settings.brand_legal_name is
  'The registered company name (copyright lines, JSON-LD). NULL: the default in shared/brand.ts.';
comment on column public.site_settings.hero_headline is
  'The home page''s headline (its h1). NULL: the brand''s tagline.';

commit;
