-- ---------------------------------------------------------------------------
-- Teyvat — the stats strip, and plainer seed copy (design/less-generic)
--
-- site_settings.stats: up to four numbers on the home and About pages
-- (shared/site-stats.ts). Seeded only with what has a source; the sources are in
-- docs/reviews/generic-ui-audit.md. National parks is left out: the Department of
-- Wildlife Conservation's own page disagrees with itself.
--
-- The copy below replaces a column only while it still holds the exact seed
-- text, so anything an admin wrote stays. Re-runnable: a second run matches nothing.
-- ---------------------------------------------------------------------------

begin;

alter table public.site_settings add column if not exists stats jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.site_settings'::regclass and conname = 'site_settings_stats_shape'
  ) then
    alter table public.site_settings add constraint site_settings_stats_shape check (
      jsonb_typeof(stats) = 'array' and jsonb_array_length(stats) <= 4
    );
  end if;
end $$;

comment on column public.site_settings.stats is
  'The stats strip: up to four {label, number, suffix, order}. Empty hides it.';

update public.site_settings
   set stats = '[{"label":"UNESCO World Heritage sites","number":8,"suffix":"","order":1},{"label":"of coastline, approximately","number":1620,"suffix":"km","order":2},{"label":"years since a cutting of the sacred fig tree reached Anuradhapura","number":2200,"suffix":"+","order":3}]'::jsonb
 where id and stats = '[]'::jsonb;

update public.destinations set "long_description" = 'Ella is a mountain village in the Central Highlands, with tea estates, waterfalls and hiking trails. The blue train crosses the Nine Arch Bridge here.'
 where id = 'ella' and "long_description" = 'Nestled in the Central Highlands, Ella is a tranquil mountain village blessed with breathtaking mountain gaps, emerald-green tea estates, cascading waterfalls, and world-renowned hiking trails. The blue train winding across the iconic Nine Arch Bridge is one of the world’s most cinematic travel moments.';

update public.destinations set "long_description" = 'Mirissa is a beach town on the south coast, known for blue whale watching. It has quiet bays, surf points and seafood grills on the sand.'
 where id = 'mirissa' and "long_description" = 'Mirissa is the quintessential tropical paradise on Sri Lanka’s south coast. Famed globally for blue whale sightings in the Indian Ocean, Mirissa boasts tranquil sandy bays, surf points, coconut-fringed hills, and lively beachside seafood barbecues under the stars.';

update public.destinations set "short_description" = 'Tamil culture, Hindu kovils, palmyra palms and the northern islands.'
 where id = 'jaffna' and "short_description" = 'Vibrant Tamil culture, golden kovils, palmyra palms, and untouched northern islands.';

update public.destinations set "long_description" = 'Jaffna is in the far north of Sri Lanka. See Hindu temples such as Nallur Kandaswamy, the Dutch fort and the shallow lagoons, and try Jaffna crab curry.'
 where id = 'jaffna' and "long_description" = 'Jaffna offers a rich, distinct cultural realm in the far north of Sri Lanka. With intricate Hindu temples like Nallur Kandaswamy, historical Dutch forts, shallow blue lagoons, and delicious unique spicy Jaffna crab curry, it is a fascinating haven for authentic explorers.';

update public.destinations set "long_description" = 'Nuwara Eliya sits at 1,868 metres, in the middle of Ceylon tea country. It has terraced plantations, waterfalls, a golf course and Tudor-style colonial villas.'
 where id = 'nuwara-eliya' and "long_description" = 'Sitting at 1,868 meters elevation, Nuwara Eliya is Sri Lanka’s cool-climate tea capital. Surrounded by terraced Ceylon tea plantations, cascades, golf courses, and Tudor-style colonial villas, it feels like a timeless highland retreat.';

update public.destinations set "long_description" = 'Trincomalee has one of the world’s finest natural deep-water harbours. Nearby are the white sand beaches at Nilaveli, the coral reefs at Pigeon Island National Park and the Koneswaram Hindu temple on Swami Rock.'
 where id = 'trincomalee' and "long_description" = 'Trincomalee boasts one of the world’s finest natural deep-water harbors, tranquil white sand beaches at Nilaveli, vibrant coral reefs at Pigeon Island National Park, and the ancient Koneswaram Hindu Temple perching on Swami Rock cliff.';

update public.destinations set "long_description" = 'Polonnaruwa followed Anuradhapura as Sri Lanka’s capital in the 11th century. Its archaeological park has audience halls, royal baths and the Gal Vihara, four Buddha images carved into one granite wall.'
 where id = 'polonnaruwa' and "long_description" = 'Polonnaruwa succeeded Anuradhapura as Sri Lanka’s medieval capital in the 11th century. Remarkably preserved, its archaeological park contains grand audience halls, royal baths, and the breathtaking Gal Vihara—four monumental Buddha images carved into a single granite wall.';

update public.destinations set "short_description" = 'Five rock caves with 153 Buddha statues and painted ceilings.'
 where id = 'dambulla' and "short_description" = 'Five ancient rock caverns filled with 153 gilded Buddha statues and vibrant ceiling murals.';

update public.destinations set "long_description" = 'Colombo is an oceanfront city where British and Dutch colonial buildings stand beside rooftop bars. Walk the Pettah markets, visit the temple on Beira Lake and finish on Galle Face Green.'
 where id = 'colombo' and "long_description" = 'Colombo is a vibrant oceanfront metropolis where colonial British and Dutch architecture stand beside contemporary rooftop bars, bustling Pettah markets, peaceful Buddhist temples on Beira Lake, and oceanfront Galle Face Green promenade.';

update public.destinations set "long_description" = 'Haputale sits on a mountain ledge with views across the southern plains. Visit Lipton’s Seat, where Sir Thomas Lipton surveyed his tea estates, and Adisham Monastery.'
 where id = 'haputale' and "long_description" = 'Perched on a sheer mountain ledge, Haputale offers dramatic views across Sri Lanka’s southern plains. It is home to Lipton’s Seat—where Sir Thomas Lipton surveyed his vast tea empire—and the serene Adisham Monastery.';

update public.featured_experiences set "subtitle" = 'Golden beaches and ocean sunsets'
 where id = 'sunset-mirissa' and "subtitle" = 'Golden beaches and unforgettable ocean sunsets';

update public.tours set "short_desc" = 'One week across Sri Lanka: the hill capital, a train through tea country, a leopard safari and beach sunsets.'
 where id = 'island-in-7-days' and "short_desc" = 'Experience the magical highlights of Sri Lanka in one week—from sacred hill capitals and scenic train journeys to leopard safaris and tropical beach sunsets.';

update public.tours set "full_desc" = 'A first visit to Sri Lanka in seven days, across five landscapes.'
 where id = 'island-in-7-days' and "full_desc" = 'Curated for travelers seeking the ultimate introduction to Sri Lanka, this signature 7-day expedition spans the vibrant island across five distinct landscapes.';

update public.tours set "full_desc" = 'A route through the Cultural Triangle and its UNESCO World Heritage sites, for people who like history, art and temples.'
 where id = 'cultural-sri-lanka' and "full_desc" = 'An enchanting voyage through Sri Lanka’s UNESCO World Heritage Cultural Triangle, designed for lovers of history, art, and timeless spiritual traditions.';

update public.tours set "short_desc" = 'Look for leopards, sloth bears, elephants, saltwater crocodiles and blue whales across the national parks.'
 where id = 'wild-sri-lanka' and "short_desc" = 'A paradise for wildlife lovers. Track leopards, sloth bears, wild elephant herds, saltwater crocodiles, and blue whales across national sanctuaries.';

update public.articles set "title" = 'Quiet Places to Visit Before They Get Busy'
 where id = 'hidden-gems-visit' and "title" = 'Hidden Gems You Should Visit Before Everyone Else Does';

update public.hidden_gems set "why_visit" = 'Fewer tourists, mountain gaps and quiet trekking trails.'
 where id = 'riverston' and "why_visit" = 'Fewer tourists, misty mountain gaps, and pristine trekking trails.';

update public.hidden_gems set "why_visit" = 'Kitesurfing, spinner dolphins and sandbars.'
 where id = 'kalpitiya' and "why_visit" = 'Kitesurfing, spinner dolphin pods & pristine sandbars.';

update public.pillars set "title" = 'Local knowledge'
 where id = 'local-knowledge' and "title" = 'Local Knowledge';

update public.pillars set "description" = 'Planned by people who live on the island and know the roads, the seasons and the guides.'
 where id = 'local-knowledge' and "description" = 'Discover Sri Lanka through the eyes of island natives who possess deep generational heritage, secret trails, and insider connections.';

update public.pillars set "title" = 'Beyond the main stops'
 where id = 'authentic-experiences' and "title" = 'Authentic Experiences';

update public.pillars set "description" = 'Waterfalls, spice gardens and village visits that most itineraries skip.'
 where id = 'authentic-experiences' and "description" = 'Go beyond predictable tourist hotspots. Access secluded waterfalls, ancestral spice gardens, and private cultural encounters.';

update public.pillars set "title" = 'Your pace'
 where id = 'flexible-journeys' and "title" = 'Flexible Journeys';

update public.pillars set "description" = 'Climb a mountain one day and sit on a beach the next. Any day can change.'
 where id = 'flexible-journeys' and "description" = 'Build every day around your rhythm and curiosity—from high-energy mountain climbs to unhurried beach stays.';

update public.pillars set "title" = 'Care for the places'
 where id = 'responsible-travel' and "title" = 'Responsible Travel';

update public.pillars set "description" = 'We respect wildlife habitats, look after fragile places and work with rural communities.'
 where id = 'responsible-travel' and "description" = 'Explore while actively respecting wildlife habitats, conserving fragile ecosystems, and empowering rural island communities.';

update public.articles set content = array_replace(content, 'Ella has evolved from a sleepy railway stop into the crown jewel of Sri Lanka’s highlands. At an elevation of 1,041 meters, the air is crisp, the tea is fresh, and every trail leads to breathtaking vistas.', 'Ella has grown from a railway stop into the best-known town in Sri Lanka’s highlands. At an elevation of 1,041 meters, the air is crisp, the tea is fresh, and the trails lead to wide views.')
 where id = 'ultimate-ella-guide';

update public.articles set content = array_replace(content, 'Minneriya & Kaudulla: Home to "The Gathering"—up to 300 Asian elephants assembling around reservoir shores.', 'Minneriya & Kaudulla: Home to "The Gathering", up to 300 Asian elephants assembling around reservoir shores.')
 where id = 'wildlife-safaris-where-to-go';

update public.experience_categories set "subtitle" = 'Royal kingdoms and rock fortresses'
 where id = 'ancient-sri-lanka' and "subtitle" = '2,500 years of royal kingdoms & rock fortresses';

update public.experience_categories set "title" = 'Quieter Sri Lanka'
 where id = 'hidden-sri-lanka' and "title" = 'Hidden Sri Lanka';

update public.experience_categories set "subtitle" = 'Waterfalls, remote peaks and small islands'
 where id = 'hidden-sri-lanka' and "subtitle" = 'Secret waterfalls, remote peaks & island gems';

update public.hero_slides set "caption" = 'Centuries of Sacred History'
 where id = 'sigiriya-citadel' and "caption" = '2,500 Years of Sacred History';

update public.tours set "subtitle" = 'Royal cities, cave temples and sacred sites.'
 where id = 'cultural-sri-lanka' and "subtitle" = 'Immerse yourself in 2,500 years of royal heritage and sacred architecture.';

commit;
