-- ---------------------------------------------------------------------------
-- Teyvat — "When to go": each destination's best months, and the monsoon explainer
--
-- destinations.best_months: months 1 to 12, empty meaning "not set". Filled here from
-- best_time only where the text is clear; anything else stays empty for an admin to set.
-- The text itself stays: pages still show it as written.
--
-- site_settings.when_to_go_explainer: paragraphs separated by a blank line (NULL or empty
-- hides it). Sources and where they disagree: docs/reviews/when-to-go-sources.md.
--
-- Re-runnable: months already set and an explainer already saved are left alone. The
-- function is pg_temp, so it goes with the session; when-to-go.test calls it directly.
-- ---------------------------------------------------------------------------

begin;

alter table public.destinations add column if not exists best_months integer[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.destinations'::regclass and conname = 'destinations_best_months_range'
  ) then
    alter table public.destinations add constraint destinations_best_months_range
      check (best_months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  end if;
end $$;

comment on column public.destinations.best_months is
  'Best months to visit, 1 to 12. Empty: not set, so /when-to-go shows it as "not set" and leaves it out of its lists.';

alter table public.site_settings add column if not exists when_to_go_explainer text;

comment on column public.site_settings.when_to_go_explainer is
  'The monsoon explainer on /when-to-go: paragraphs separated by a blank line. NULL or empty hides it.';

-- Strict on purpose: the whole text must be understood, or the answer is empty. So
-- "Late November – April" and "Dry season" stay for a person to set.
--
--   Year-round | All year                        every month
--   Year-round (Best Dec – May)                  the months after "Best"
--   December – April | Dec-Apr | December to April   a range, across the new year too
--   June – September & December – March          ranges joined by &, "and" or a comma
--   January – April (Early mornings)             a note in brackets, if it names no month
create or replace function pg_temp.best_months_from(raw text) returns integer[]
language plpgsql immutable as $fn$
declare
  names constant text[] := array['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  month_word constant text := '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  everything constant integer[] := array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  text_ text := lower(regexp_replace(btrim(coalesce(raw, '')), '\s+', ' ', 'g'));
  bracket text[];
  part text;
  ends text[];
  first_month integer;
  last_month integer;
  found_months integer[] := '{}';
begin
  if text_ ~ '^(year[ -]round|all year( round)?)$' then
    return everything;
  end if;

  -- "Year-round (Best Dec – May)": the months it names.
  bracket := regexp_match(text_, '^(?:year[ -]round|all year(?: round)?) ?\(best ([^()]+)\)$');
  if bracket is not null then
    text_ := btrim(bracket[1]);
  else
    -- A closing note that names no month says nothing about which months.
    bracket := regexp_match(text_, '^([^()]+) ?\(([^()]*)\)$');
    if bracket is not null then
      if bracket[2] ~ ('\m' || month_word || '\M') then
        return '{}';
      end if;
      text_ := btrim(bracket[1]);
    end if;
  end if;

  if text_ = '' then
    return '{}';
  end if;

  foreach part in array regexp_split_to_array(text_, ' ?(?:&|,| and ) ?') loop
    ends := regexp_match(part, '^(' || month_word || ')(?: ?(?:–|—|-| to ) ?(' || month_word || '))?$');
    if ends is null then
      return '{}';
    end if;
    first_month := array_position(names, left(ends[1], 3));
    last_month := array_position(names, left(coalesce(ends[2], ends[1]), 3));
    loop
      found_months := found_months || first_month;
      exit when first_month = last_month;
      first_month := first_month % 12 + 1;
    end loop;
  end loop;

  return (select array_agg(distinct m order by m) from unnest(found_months) as m);
end;
$fn$;

update public.destinations
   set best_months = pg_temp.best_months_from(best_time)
 where best_months = '{}' and pg_temp.best_months_from(best_time) <> '{}';

update public.site_settings
   set when_to_go_explainer = $text$Sri Lanka has two monsoons and two inter-monsoon periods, so when one part of the island is wet, another is often drier. The months below are the ones the Department of Meteorology uses. The rain doesn't always keep to them.

Southwest monsoon, May to September: the rain falls mainly on the southwest of the island and the hill country, which takes in the west and south coasts. The east coast and the north are usually drier, so this is their better season.

Northeast monsoon, December to February: the rain falls mainly on the east and the north. This is the main season for the west coast, the south coast and the hill country.

Inter-monsoon periods, March to April and October to November: afternoon thunder showers are common over most of the island. In October and November, heavy rain can fall anywhere.

The best months on this page are set place by place, so some places differ from the regional pattern.$text$
 where id and when_to_go_explainer is null;

commit;
