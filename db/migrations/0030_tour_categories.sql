-- ---------------------------------------------------------------------------
-- Tour categories (docs/plans/tour-categories.md, PR 1)
--
-- public.tour_categories: travel styles (Beach, Family, Hill Country, Wellness,
-- Adventure, Honeymoon, Cultural, Wildlife), each with its page at
-- /tours/category/<id>. The id is the slug, as in every content table.
--
-- public.tour_category_links: which tours are in which categories (a tour can be
-- in several), in the order the admin picked, so a tour's first category is stable.
--
-- Also:
--   * tours.price_from may be empty: NULL (or 0) shows "Price on request". No
--     existing price changes.
--   * tours.category stays, unused by the site since this PR. Not dropped.
--   * No tour may have the id "category": /tours/category/<id> is a category page.
--
-- The seed: the 8 categories, published, with text checked against
-- docs/reviews/when-to-go-sources.md for the two best-time notes. Each photo is the
-- R2 file of a destination's verified photo (media.photo_key, 1280 px) when
-- media has it, as in production, else that destination's stored cover, as in
-- local and CI databases. Four seed tours are assigned, only while they exist.
--
-- Re-runnable: a second run changes nothing, and an existing category or link
-- (an admin's edit) is left alone.
-- ---------------------------------------------------------------------------

begin;

create table if not exists public.tour_categories (
  id             text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name           text not null check (length(btrim(name)) between 1 and 60),
  heading        text not null check (length(btrim(heading)) between 1 and 120),
  short_intro    text not null check (length(btrim(short_intro)) between 1 and 300),
  long_intro     text not null check (length(btrim(long_intro)) between 1 and 3000),
  image          text check (image is null or image like 'https://%'),
  best_time_note text check (best_time_note is null or length(btrim(best_time_note)) between 1 and 500),
  sort_order     integer not null default 0,
  published      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.tour_categories is
  'Travel styles, each with a page at /tours/category/<id> listing its published tours.';
comment on column public.tour_categories.heading is 'The page''s h1 and title, e.g. "Beach tours in Sri Lanka".';
comment on column public.tour_categories.long_intro is 'Paragraphs separated by a blank line.';
comment on column public.tour_categories.best_time_note is
  'Optional, and only where a source supports it. Shown with a link to /when-to-go.';

create index if not exists tour_categories_sort_idx on public.tour_categories (sort_order, id);

drop trigger if exists set_updated_at on public.tour_categories;
create trigger set_updated_at before update on public.tour_categories
  for each row execute function public.set_updated_at();

create table if not exists public.tour_category_links (
  tour_id     text not null references public.tours (id) on delete cascade,
  category_id text not null references public.tour_categories (id) on delete cascade,
  position    integer not null default 0 check (position >= 0),
  primary key (tour_id, category_id)
);

comment on table public.tour_category_links is
  'A tour''s categories, in the admin''s order (position 0 is the label on its card).';

create index if not exists tour_category_links_category_idx on public.tour_category_links (category_id);

-- "Price on request": no price is NULL. 0 also reads as on request.
alter table public.tours alter column price_from drop not null;
alter table public.tours alter column price_from drop default;

alter table public.tours drop constraint if exists tours_id_not_category;
alter table public.tours add constraint tours_id_not_category check (id <> 'category');

-- The seed ------------------------------------------------------------------

with seed (id, name, heading, short_intro, long_intro, photo, best_time_note, sort_order) as (
  values
  ('beach', 'Beach Tours', 'Beach tours in Sri Lanka',
   'Time on the south, west and east coasts: swimming bays, surf towns and Galle''s old fort, with drives short enough to leave the afternoons free.',
   E'Sri Lanka''s coasts have their seasons at different times of year. The south and west, from Bentota round to Mirissa, are calmer in the first months of the year; the east coast at Trincomalee and Arugam Bay has its season in the middle of the year.\n\nOur beach tours keep the driving short. Most days start or end by the sea, with time for a swim, a surf lesson at Weligama or a walk on Galle Fort''s walls.\n\nAny of them can add a few days inland, in the hills or at a national park.',
   'mirissa',
   'The west and south coasts are usually driest from December to March, and the east coast from May to September.',
   0),
  ('family', 'Family Tours', 'Family tours in Sri Lanka',
   'Routes with shorter drives and slower days, mixing places children enjoy with time to rest.',
   E'Travelling with children changes how far you can go in a day. These tours keep the drives short and plan one main outing a day, so there''s time for a pool, a nap or an early night.\n\nDays can include a jeep safari at Udawalawe to see elephants, the train through the tea country, or a morning on a calm beach.\n\nTell us the children''s ages when you ask, and we''ll suggest the pace and the stops.',
   'udawalawe', null, 1),
  ('hill-country', 'Hill Country Tours', 'Hill country tours in Sri Lanka',
   'Tea estates, cool mornings and walks in the central highlands, from Kandy up to Nuwara Eliya, Ella and Haputale.',
   E'The hill country is in the middle of the island and much cooler than the coast. Roads wind slowly between tea estates, so these tours plan fewer stops and longer stays.\n\nDays can include the train between Kandy and Ella, an early walk on Horton Plains, a tea factory visit and short hikes around Ella.\n\nBring a warm layer: mornings and evenings in Nuwara Eliya can be cold.',
   'ella',
   'The hill country is usually driest from December to March. From May to September the southwest monsoon brings rain to the hills.',
   2),
  ('wellness', 'Wellness Tours', 'Wellness tours in Sri Lanka',
   'Slower trips built around rest: fewer moves, longer stays, and time for Ayurveda treatments, yoga or quiet days by the sea or in the hills.',
   E'These tours are for travelling slowly. Most stay three or more nights in one place, with no early starts unless you want them.\n\nMany hotels and retreats in Sri Lanka offer Ayurveda treatments and yoga. We can include them, or leave the days open.\n\nTell us what kind of rest you''re after, and we''ll plan the stays around it.',
   'bentota', null, 3),
  ('adventure', 'Adventure Tours', 'Adventure tours in Sri Lanka',
   'Active days: hikes in the hills, early climbs up rock fortresses, and surf on the south and east coasts.',
   E'For travellers who''d rather walk, climb or paddle than watch from a car window. Each activity is matched to a place known for it.\n\nThat can mean a hike in the Knuckles range, a sunrise climb up Sigiriya, a walk across Horton Plains, or surf at Arugam Bay or Weligama.\n\nTell us your experience and fitness when you ask, and we''ll pitch the days to suit.',
   'knuckles', null, 4),
  ('honeymoon', 'Honeymoon Tours', 'Honeymoon tours in Sri Lanka',
   'Slow trips for two: quiet stays in the hills and on the coast, a car and driver, and time left free.',
   E'These tours keep the pace easy and the days your own: fewer stops, longer stays and evenings with nothing planned.\n\nA typical route pairs a few days in the hills, around Ella or Nuwara Eliya, with a stretch of coast near Galle or Mirissa.\n\nTell us your dates and what you''d like, and we''ll suggest where to stay.',
   'nuwara-eliya', null, 5),
  ('cultural', 'Cultural Tours', 'Cultural tours in Sri Lanka',
   'Ancient cities, cave temples and living traditions in the Cultural Triangle, Kandy and Jaffna, with time to see each site properly.',
   E'Sri Lanka''s early capitals are in the north-central plains: Anuradhapura, Polonnaruwa and the rock fortress at Sigiriya, with the cave temples of Dambulla nearby.\n\nKandy, in the hills, is home to the Temple of the Tooth. Further north, Jaffna has its own Hindu temples, food and history.\n\nMost sites are best seen early. We plan visits for the cooler hours and leave the middle of the day free.',
   'sigiriya', null, 6),
  ('wildlife', 'Wildlife Tours', 'Wildlife tours in Sri Lanka',
   'Jeep safaris in national parks such as Yala and Udawalawe, with early starts and time to watch.',
   E'Sri Lanka''s national parks are home to elephants, leopards, sloth bears, water buffalo and many kinds of birds. Udawalawe is known for its elephants, and Yala for its leopards.\n\nSafaris are in open jeeps, usually early in the morning or late in the afternoon. These are wild animals in their own habitat, so sightings can''t be guaranteed, and every drive is different.\n\nA tour can pair a park or two with a few days on the coast or in the hills.',
   'yala', null, 7)
)
insert into public.tour_categories (id, name, heading, short_intro, long_intro, image, best_time_note, sort_order, published)
select s.id, s.name, s.heading, s.short_intro, s.long_intro,
       coalesce(
         (select m.url from public.media m where m.photo_key = s.photo and m.width = 1280 and m.url like 'https://%' order by m.url limit 1),
         (select d.image from public.destinations d where d.id = s.photo and d.image like 'https://%')
       ),
       s.best_time_note, s.sort_order, true
  from seed s
on conflict (id) do nothing;

with seed (tour_id, category_id, position) as (
  values
  ('cultural-sri-lanka', 'cultural', 0),
  ('southern-escape', 'beach', 0),
  ('island-in-7-days', 'hill-country', 0),
  ('island-in-7-days', 'cultural', 1),
  ('wild-sri-lanka', 'wildlife', 0)
)
insert into public.tour_category_links (tour_id, category_id, position)
select s.tour_id, s.category_id, s.position
  from seed s
  join public.tours t on t.id = s.tour_id
  join public.tour_categories c on c.id = s.category_id
on conflict (tour_id, category_id) do nothing;

commit;
