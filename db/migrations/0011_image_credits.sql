-- =============================================================================
-- image_credits
-- =============================================================================
-- Who took a photo, and the licence it is shared under, keyed by the image URL
-- the content tables store. Keyed by URL, not by row, because one photo is
-- used by several rows (the Yala leopard is on six), and because a URL
-- survives the photo moving: `npm run images:import` copies the Wikimedia
-- photos into R2 and moves each credit to the new URL with them.
--
-- The public site shows the credits of the photos its published rows use, on
-- /photo-credits (CC BY-SA requires the attribution). Admins edit them under
-- Admin → Photo credits.
--
-- Seeds the 32 credits for the photos migration 0010 placed. They were in
-- shared/travel-photos.json until this migration replaced it.
--
-- Also corrects two photo-story captions to match 0010's photos (p6 is tea
-- pickers near Nuwara Eliya, p7 stilt fishermen at Ahangama), only where both
-- the caption and the photo are still the ones 0010 left. An admin's edit to
-- either keeps the row as it is.
--
-- Idempotent: re-running it is a no-op.
-- =============================================================================

begin;

create table if not exists public.image_credits (
  url         text primary key check (url like 'https://%' and length(url) <= 2000),
  author      text not null check (length(btrim(author)) between 1 and 200),
  license     text not null check (length(btrim(license)) between 1 and 100),
  license_url text check (license_url is null or license_url like 'https://%'),
  source_url  text check (source_url is null or source_url like 'https://%'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.image_credits;
create trigger set_updated_at before update on public.image_credits
  for each row execute function public.set_updated_at();

insert into public.image_credits (url, author, license, license_url, source_url) values
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg',
   'MichaelJames2468', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg',
   'Chamixth', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Galle_Fort_Lighthouse.jpg/1280px-Galle_Fort_Lighthouse.jpg',
   'Rovin Shanila', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Galle_Fort_Lighthouse.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg',
   'Abishek Palraj', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Mirissa_beach%2C_Srilanka.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg/1280px-Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg',
   'Niranjan Ramamurthy', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg',
   'Sathsara Panchali', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Sri_Lankan_Leopard_yala.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Tea-plantation_Nuwara_Eliya-2567.jpg/1280px-Tea-plantation_Nuwara_Eliya-2567.jpg',
   'Bergentroll', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/',
   'https://commons.wikimedia.org/wiki/File:Tea-plantation_Nuwara_Eliya-2567.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg/1280px-Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg',
   'Philip Nalangan', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Gal_Viharaya.jpg/1280px-Gal_Viharaya.jpg',
   'Dumidu Madhushan Senanayake', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Gal_Viharaya.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Udawalawe_Elephants_Sri_Lanka.jpg/1280px-Udawalawe_Elephants_Sri_Lanka.jpg',
   'Sanduweragoda', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Udawalawe_Elephants_Sri_Lanka.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Horton_plains_landscape.jpg/1280px-Horton_plains_landscape.jpg',
   'Malsha Nanayakkara', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Horton_plains_landscape.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Weligama_beach_(4).jpg/1280px-Weligama_beach_(4).jpg',
   'PIERRE ANDRE LECLERCQ', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Weligama_beach_(4).jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Dambulla_Cave_temple.jpg/1280px-Dambulla_Cave_temple.jpg',
   'Kaushiru90', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Dambulla_Cave_temple.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Knuckles_Mountain_Range.jpg/1280px-Knuckles_Mountain_Range.jpg',
   'Kalindu Kasun', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Knuckles_Mountain_Range.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Bentota_beach_in_evening.jpg/1280px-Bentota_beach_in_evening.jpg',
   'Rambukwelladk', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Bentota_beach_in_evening.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Haputale.jpg/1280px-Haputale.jpg',
   'Bajil1030', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Haputale.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Riverston.jpg/1280px-Riverston.jpg',
   'Sankaindranath', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Riverston.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Lake_in_the_jungle.jpg/1280px-Lake_in_the_jungle.jpg',
   'SandaniWijerathne', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Lake_in_the_jungle.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Horses_of_Delft.jpg/1280px-Horses_of_Delft.jpg',
   'Gajapera', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Horses_of_Delft.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Bambarakanda_Waterfall.jpg/1280px-Bambarakanda_Waterfall.jpg',
   'Kiriwattuduwa', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/',
   'https://commons.wikimedia.org/wiki/File:Bambarakanda_Waterfall.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Kumana_National_Park_(Kudumbigala_Sanctuary).JPG/1280px-Kumana_National_Park_(Kudumbigala_Sanctuary).JPG',
   'AntanO', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Kumana_National_Park_(Kudumbigala_Sanctuary).JPG'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Kalpitiya_Beach.jpg/1280px-Kalpitiya_Beach.jpg',
   'Raiyans', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Kalpitiya_Beach.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Nuwara_Eliya_Tea.jpg/1280px-Nuwara_Eliya_Tea.jpg',
   'Curved.kiwix', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Nuwara_Eliya_Tea.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg/1280px-Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg',
   'Marlene Landu', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Sri_Lankan_Rice_and_Curry.jpg/1280px-Sri_Lankan_Rice_and_Curry.jpg',
   'Lankan Foodie', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Sri_Lankan_Rice_and_Curry.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Trincomalee_town_beach.jpg/1280px-Trincomalee_town_beach.jpg',
   'C. Lalinshan', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Trincomalee_town_beach.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Full_view_of_nallur_front.JPG/1280px-Full_view_of_nallur_front.JPG',
   'Aathavan jaffna', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/',
   'https://commons.wikimedia.org/wiki/File:Full_view_of_nallur_front.JPG'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Arugam_Bay.jpg/1280px-Arugam_Bay.jpg',
   'Nandun Narayana', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Arugam_Bay.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Nine-Arch_Bridge_in_Sri_Lanka.jpg/1280px-Nine-Arch_Bridge_in_Sri_Lanka.jpg',
   'Ravindu Thaksara', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Nine-Arch_Bridge_in_Sri_Lanka.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg/1280px-Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg',
   'Alexey Komarov', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/A_view_of_Colombo''s_skyline_from_the_Lotus_Tower.jpg/1280px-A_view_of_Colombo''s_skyline_from_the_Lotus_Tower.jpg',
   'Thilina Alagiyawanna', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/',
   'https://commons.wikimedia.org/wiki/File:A_view_of_Colombo%27s_skyline_from_the_Lotus_Tower.jpg'),
  ('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Mountain_Views_at_Madulsima.jpg/1280px-Mountain_Views_at_Madulsima.jpg',
   'SiddharthSL', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
   'https://commons.wikimedia.org/wiki/File:Mountain_Views_at_Madulsima.jpg')
on conflict (url) do nothing;

update public.photo_stories set location = 'Nuwara Eliya'
 where id = 'p6' and location = 'Hatton Tea Valleys'
   and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Nuwara_Eliya_Tea.jpg/1280px-Nuwara_Eliya_Tea.jpg';
update public.photo_stories set location = 'Ahangama'
 where id = 'p7' and location = 'Koggala & Weligama'
   and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg/1280px-Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg';

commit;
