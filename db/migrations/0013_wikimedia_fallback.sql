-- =============================================================================
-- the Wikimedia fallback
-- =============================================================================
-- From this release the CSP no longer allows upload.wikimedia.org: the photos
-- migration 0010 hotlinked from there were copied into R2 by
-- `npm run images:import`, which repointed every row that used them.
--
-- This puts any row still holding one of 0010's Wikimedia URLs back on the
-- seed photo it had before 0010, exactly reversing 0010 with the same guards,
-- so nothing is left as an image the browser would block:
--
--   * production, after images:import: nothing matches, nothing changes;
--   * a fresh local database (0002, then 0010, then this): back on the seed
--     photos, as in the fixtures;
--   * production, had images:import not run: the seed photos again, which
--     is a loss of the new photos but never a blocked image.
--
-- An admin's own choice of photo is never touched. The two captions 0011
-- matched to 0010's photos go back with them, only where both are still
-- 0011's.
--
-- Then the credits still keyed by a Wikimedia URL go: after the above no row
-- can use one (the allow-list refuses the host), and the admin's Photo
-- credits page would otherwise try to preview them and be blocked. After
-- images:import every credit in use is already on its R2 URL.
--
-- Idempotent: re-running it is a no-op.
-- =============================================================================

begin;

-- Captions first: they're guarded on 0010's photo, which the updates below replace.
update public.photo_stories set location = 'Hatton Tea Valleys'
 where id = 'p6' and location = 'Nuwara Eliya' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Nuwara_Eliya_Tea.jpg/1280px-Nuwara_Eliya_Tea.jpg';
update public.photo_stories set location = 'Koggala & Weligama'
 where id = 'p7' and location = 'Ahangama'
   and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg/1280px-Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg';

update public.destinations set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200'
 where id = 'ella' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=1200'
 where id = 'sigiriya' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=1200'
 where id = 'galle' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Galle_Fort_Lighthouse.jpg/1280px-Galle_Fort_Lighthouse.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200'
 where id = 'mirissa' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=1200'
 where id = 'kandy' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg/1280px-Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=1200'
 where id = 'jaffna' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Full_view_of_nallur_front.JPG/1280px-Full_view_of_nallur_front.JPG';
update public.destinations set image = 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=1200'
 where id = 'yala' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200'
 where id = 'nuwara-eliya' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Tea-plantation_Nuwara_Eliya-2567.jpg/1280px-Tea-plantation_Nuwara_Eliya-2567.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=1200'
 where id = 'arugam-bay' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Arugam_Bay.jpg/1280px-Arugam_Bay.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&q=80&w=1200'
 where id = 'trincomalee' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Trincomalee_town_beach.jpg/1280px-Trincomalee_town_beach.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=1200'
 where id = 'anuradhapura' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg/1280px-Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=1200'
 where id = 'polonnaruwa' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Gal_Viharaya.jpg/1280px-Gal_Viharaya.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1581852017103-68accd5509b6?auto=format&fit=crop&q=80&w=1200'
 where id = 'udawalawe' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Udawalawe_Elephants_Sri_Lanka.jpg/1280px-Udawalawe_Elephants_Sri_Lanka.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200'
 where id = 'horton-plains' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Horton_plains_landscape.jpg/1280px-Horton_plains_landscape.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=1200'
 where id = 'weligama' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Weligama_beach_(4).jpg/1280px-Weligama_beach_(4).jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=1200'
 where id = 'dambulla' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Dambulla_Cave_temple.jpg/1280px-Dambulla_Cave_temple.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=1200'
 where id = 'colombo' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/A_view_of_Colombo''s_skyline_from_the_Lotus_Tower.jpg/1280px-A_view_of_Colombo''s_skyline_from_the_Lotus_Tower.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200'
 where id = 'knuckles' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Knuckles_Mountain_Range.jpg/1280px-Knuckles_Mountain_Range.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200'
 where id = 'bentota' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Bentota_beach_in_evening.jpg/1280px-Bentota_beach_in_evening.jpg';
update public.destinations set image = 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=1200'
 where id = 'haputale' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Haputale.jpg/1280px-Haputale.jpg';
update public.experience_categories set image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800'
 where id = 'beach-escapes' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg';
update public.experience_categories set image = 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=800'
 where id = 'wild-sri-lanka' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg';
update public.experience_categories set image = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800'
 where id = 'ancient-sri-lanka' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg';
update public.experience_categories set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800'
 where id = 'mountain-adventures' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Knuckles_Mountain_Range.jpg/1280px-Knuckles_Mountain_Range.jpg';
update public.experience_categories set image = 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800'
 where id = 'food-and-culture' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Sri_Lankan_Rice_and_Curry.jpg/1280px-Sri_Lankan_Rice_and_Curry.jpg';
update public.experience_categories set image = 'https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=800'
 where id = 'hidden-sri-lanka' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Riverston.jpg/1280px-Riverston.jpg';
update public.featured_experiences set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1000'
 where id = 'sunrise-ella' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg';
update public.featured_experiences set image = 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=1000'
 where id = 'safari-yala' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg';
update public.featured_experiences set image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000'
 where id = 'sunset-mirissa' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg/1280px-Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg';
update public.featured_experiences set image = 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=1000'
 where id = 'walk-galle-fort' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Galle_Fort_Lighthouse.jpg/1280px-Galle_Fort_Lighthouse.jpg';
update public.tours set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200'
 where id = 'island-in-7-days' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg';
update public.tours set image = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=1200'
 where id = 'cultural-sri-lanka' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Gal_Viharaya.jpg/1280px-Gal_Viharaya.jpg';
update public.tours set image = 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=1200'
 where id = 'wild-sri-lanka' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg';
update public.tours set image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200'
 where id = 'southern-escape' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg';
update public.articles set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800'
 where id = 'sunrise-locations-sri-lanka' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg';
update public.articles set image = 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800'
 where id = 'ultimate-ella-guide' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Nine-Arch_Bridge_in_Sri_Lanka.jpg/1280px-Nine-Arch_Bridge_in_Sri_Lanka.jpg';
update public.articles set image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800'
 where id = 'best-beaches-sri-lanka' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg';
update public.articles set image = 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800'
 where id = 'guide-sri-lankan-food' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Sri_Lankan_Rice_and_Curry.jpg/1280px-Sri_Lankan_Rice_and_Curry.jpg';
update public.articles set image = 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=800'
 where id = 'wildlife-safaris-where-to-go' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg';
update public.articles set image = 'https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=800'
 where id = 'hidden-gems-visit' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Riverston.jpg/1280px-Riverston.jpg';
update public.hidden_gems set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800'
 where id = 'riverston' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Riverston.jpg/1280px-Riverston.jpg';
update public.hidden_gems set image = 'https://images.unsplash.com/photo-1581852017103-68accd5509b6?auto=format&fit=crop&q=80&w=800'
 where id = 'gal-oya' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Lake_in_the_jungle.jpg/1280px-Lake_in_the_jungle.jpg';
update public.hidden_gems set image = 'https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=800'
 where id = 'delft-island' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Horses_of_Delft.jpg/1280px-Horses_of_Delft.jpg';
update public.hidden_gems set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800'
 where id = 'bambarakanda' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Bambarakanda_Waterfall.jpg/1280px-Bambarakanda_Waterfall.jpg';
update public.hidden_gems set image = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800'
 where id = 'madulsima' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Mountain_Views_at_Madulsima.jpg/1280px-Mountain_Views_at_Madulsima.jpg';
update public.hidden_gems set image = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800'
 where id = 'kudumbigala' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Kumana_National_Park_(Kudumbigala_Sanctuary).JPG/1280px-Kumana_National_Park_(Kudumbigala_Sanctuary).JPG';
update public.hidden_gems set image = 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=800'
 where id = 'kalpitiya' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Kalpitiya_Beach.jpg/1280px-Kalpitiya_Beach.jpg';
update public.photo_stories set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800'
 where id = 'p1' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Nine-Arch_Bridge_in_Sri_Lanka.jpg/1280px-Nine-Arch_Bridge_in_Sri_Lanka.jpg';
update public.photo_stories set image = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800'
 where id = 'p2' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg';
update public.photo_stories set image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800'
 where id = 'p3' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg/1280px-Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg';
update public.photo_stories set image = 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=800'
 where id = 'p4' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg';
update public.photo_stories set image = 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=800'
 where id = 'p5' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Galle_Fort_Lighthouse.jpg/1280px-Galle_Fort_Lighthouse.jpg';
update public.photo_stories set image = 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800'
 where id = 'p6' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Nuwara_Eliya_Tea.jpg/1280px-Nuwara_Eliya_Tea.jpg';
update public.photo_stories set image = 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=800'
 where id = 'p7' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg/1280px-Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg';
update public.photo_stories set image = 'https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=800'
 where id = 'p8' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Full_view_of_nallur_front.JPG/1280px-Full_view_of_nallur_front.JPG';
update public.hero_slides set image = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=2000'
 where id = 'ella-highlands' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg';
update public.hero_slides set image = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=2000'
 where id = 'sigiriya-citadel' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg';
update public.hero_slides set image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000'
 where id = 'mirissa-shoreline' and image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg/1280px-Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg';
update public.destinations set gallery = array['https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800']
 where id = 'ella' and gallery = array['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Nine-Arch_Bridge_in_Sri_Lanka.jpg/1280px-Nine-Arch_Bridge_in_Sri_Lanka.jpg'];
update public.destinations set gallery = array['https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800']
 where id = 'sigiriya' and gallery = array['https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg'];

delete from public.image_credits where url like 'https://upload.wikimedia.org/%';

commit;
