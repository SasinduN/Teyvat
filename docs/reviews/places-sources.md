# Places: sources for the new destinations and nearby attractions

What `scripts/content/places.json` holds, where every fact and photo came from, and what is
uncertain. Checked on 8 November 2026. `npm run content:import` writes it as drafts
(`server/src/content-import.ts`); nothing is public until someone publishes it in the admin.

## How it was checked

- **Coordinates:** every place is an OpenStreetMap object, found through Nominatim and the
  Overpass API, linked in the tables below. Where a place is an area (a lake, a park, a beach),
  the point is its centre as OpenStreetMap gives it. Two have no object of their own, and are
  flagged below.
- **Descriptions:** one or two plain sentences, each fact from English Wikipedia or Wikivoyage
  (linked per row), or, for a place's position ("east of", "just off"), from OpenStreetMap. No
  superlatives: Wikipedia's "only known blowhole", "second largest", "tallest lighthouse" and
  "last virgin rainforest" are left out, along with Wikivoyage's "best place to snorkel".
- **Best months:** only where a source gives them. The south coast's from Rough Guides
  (`docs/reviews/when-to-go-sources.md`, source 4) and Sinharaja's from Wikivoyage. Tissamaharama has
  none: no source read gives it, so `best_time` is empty. No attraction has best months.
- **Photos:** Wikimedia Commons only, licensed CC BY or CC BY-SA (2.0 to 4.0), never "fair use"
  or no licence. Each was looked at, and where its file records a GPS position, that was compared
  with the place's. The import stores the author, the licence and its link, and the Commons page in
  `image_credits`, so `/photo-credits` shows them. Where no suitable photo exists, the row has none
  and the card shows a placeholder.
- **Distances** on the site are straight lines from the destination's point, said as
  "about N km away", and the page says the road is longer.

## The current destinations (before this)

Published on 8 November 2026 (live `GET /api/content`): Ella, Sigiriya, Galle Fort, Mirissa,
Kandy, Jaffna, Yala National Park, Nuwara Eliya, Arugam Bay, Trincomalee, Anuradhapura,
Polonnaruwa, Udawalawe National Park, Horton Plains & World's End, Weligama, Dambulla Cave Temple,
Colombo, Knuckles Mountain Range, Bentota, Haputale. Unpublished rows can't be seen through the
public API.

## Grouping: what became a destination, and what an attraction

**New destinations (6).** Places a visitor would stay in, or that are a trip of their own:
Hiriketiya, Tangalle, Matara, Hikkaduwa, Tissamaharama and Sinharaja. None was a destination
before; Sinharaja was in your list as a parent, and there was no row for it.

**Attractions (30):** everything else in your list, each under the destination nearest to it in a
straight line (checked against all 26). That kept your grouping, with these changes:

- **Ussangoda** goes under **Tangalle** (22.6 km), not Tissamaharama (39.1 km).
- **Koggala Lake** and **Handunugoda Tea Estate** go under **Weligama** (11.2 and 8.5 km), not
  Galle (13.5 and 16.4 km).
- **The stilt fishermen** stay under Weligama (11.0 km; Galle is 14.3 km).
- **Kanneliya** stays under Sinharaja (22.8 km; Galle is 26.9 km). By road, though, it is reached
  from the Galle side, a long way round from Sinharaja.
- **Madu River** stays under Hikkaduwa (16.6 km), with Bentota close behind (17.0 km).
- **Kataragama** stays under Tissamaharama (16.5 km; Yala's point is 20.9 km).
- Mirissa and Weligama were already separate destinations, so "Mirissa/Weligama" is split:
  Coconut Tree Hill, Parrot Rock and Secret Beach under Mirissa; Taprobane Island and the rest
  under Weligama.

Four attractions in the file are already in every test database (Galle's four), and the import
leaves rows it didn't create alone, so they're a test of that too.

## To check before publishing

- **Hiriketiya has no photo.** Commons has none that is clearly Hiriketiya ("Baydickwella.jpg"
  says only "surfing beach in Dickwella"). Its OpenStreetMap beach is oddly named "Sun Loungers (no
  space) Beach"; the point is right, the bay's centre. The admin asks for a cover image at its
  first save.
- **Tissamaharama has no best time.** Set one from a source, or leave it to show "See when to go"
  only. The admin asks for one at its first save.
- **Rekawa turtle beach's point is approximate.** OpenStreetMap has no turtle-watch point;
  Wikipedia says Turtle Watch Rekawa is 10 km east of Tangalle. The point is the beach beside
  Rekawa village (8.3 km in a straight line). No open photo.
- **The stilt fishermen have no OpenStreetMap object.** The point is the GPS position of the photo,
  at Koggala; Wikivoyage places them around Ahangama too. It's a stretch of coast, not a spot.
- **Kalametiya's point** is OpenStreetMap's "Kalametiya Lagoon Bird Sanctuary & Wetland Park"
  (its visitors' office), not the lagoon's centre, which OpenStreetMap doesn't name.
- **Kirinda, Paravi Duwa, Blue Beach Island, Secret Beach, Dalawella** have no Wikipedia or
  Wikivoyage entry: their descriptions say only what OpenStreetMap and their photos show (where
  they are, a temple on a rock, a shrine on an island). Worth a line from someone who knows them.
- **Jungle Beach:** two beaches have that name. This is Galle's, below Rumassala (OpenStreetMap
  calls it "White Jungle beach"); Wikivoyage's Weligama page has another, towards Midigama.
- **Coconut Tree Hill is private land** (Wikipedia, with the 2021 fence dispute); its description
  says so.
- **Taprobane Island is a private island** with one villa; the description doesn't suggest a visit.
- **Matara's photo** is described by its uploader as Matara's town beach; it has no GPS to confirm
  it. ("Matara Beach.jpg", another file, has GPS at Tangalle, and isn't used.)
- **Photos are the uploaders' own claims of their own work**, as everything on Commons is. None is
  marked for deletion; none is "fair use".
- **Ratings:** new destinations get `rating` 0. It is required by the table, shown nowhere
  (`no-ratings`), and not a review.

## Where sources disagree

| Question | What they say | The file uses |
|---|---|---|
| The south coast's best months | December to March: Rough Guides. Late November to April: Scott Dunn (`when-to-go-sources.md`). Hikkaduwa's surfers come October/November to March/April: Wikipedia. The existing Galle, Mirissa, Weligama and Bentota rows say November to April | December to March, for all four new coast towns |
| Sinharaja's best months | December to early April, or August to September: Wikivoyage. No other source read gives months | Wikivoyage's, April included |
| Hummanaya | "The only known blowhole in Sri Lanka", "the second largest in the world": Wikipedia, unsourced there | Neither claim |
| Dondra Head lighthouse | Built by the Dutch: Wikipedia's Matara article. Completed in 1890 with British materials and funds: Wikipedia's lighthouse article | 1890 only |
| Where the stilt fishermen are | Koggala: the Commons photos. Ahangama: Wikivoyage | "Between Koggala and Ahangama" |

## What I'd add next (not added)

Southern Province, places your list doesn't have that the sources above mention:

- **Weherahena temple** (Matara; Wikivoyage), as an attraction of Matara.
- **Yatagala Raja Maha Viharaya** (Unawatuna; Wikivoyage), under Galle.
- **Kosgoda's turtle hatcheries** and **Ambalangoda's mask museums**, between Bentota and Hikkaduwa.
- **Ahangama and Koggala** as a destination of their own, if you want the surf coast between Galle
  and Weligama to have a page: then Koggala Lake, Handunugoda and the stilt fishermen would move to it.

Island-wide, obvious gaps among the destinations: **Adam's Peak (Sri Pada)**, **Wilpattu** and
**Minneriya** national parks (both already custom stops on tours), **Kalpitiya**, **Negombo**,
**Pasikudah**, **Kitulgala** and **Mannar**. These weren't researched for this PR.

## The rows

| Destination | Where (OpenStreetMap) | Best time | Sources | Photo |
|---|---|---|---|---|
| Hiriketiya (`hiriketiya`) | 5.96236, 80.7075 ([OSM relation/13329574](https://www.openstreetmap.org/relation/13329574)) | December – March ([Rough Guides](https://www.roughguides.com/sri-lanka/when-to-go/)) | [Wikipedia: Dikwella](https://en.wikipedia.org/wiki/Dikwella) | none |
| Tangalle (`tangalle`) | 6.02508, 80.79493 ([OSM node/51216347](https://www.openstreetmap.org/node/51216347)) | December – March ([Rough Guides](https://www.roughguides.com/sri-lanka/when-to-go/)) | [Wikipedia: Tangalle](https://en.wikipedia.org/wiki/Tangalle), [Wikipedia: List of beaches in Sri Lanka](https://en.wikipedia.org/wiki/List_of_beaches_in_Sri_Lanka) | [Tangalle - Badia.jpg](https://commons.wikimedia.org/wiki/File:Tangalle_-_Badia.jpg), Josep Renalias Lohen11, CC BY 4.0 |
| Matara (`matara`) | 5.947822, 80.5482919 ([OSM node/3639539242](https://www.openstreetmap.org/node/3639539242)) | December – March ([Rough Guides](https://www.roughguides.com/sri-lanka/when-to-go/)) | [Wikipedia: Matara, Sri Lanka](https://en.wikipedia.org/wiki/Matara,_Sri_Lanka), [Wikivoyage: Matara](https://en.wikivoyage.org/wiki/Matara) | [Matara beach.jpg](https://commons.wikimedia.org/wiki/File:Matara_beach.jpg), Kalana wasuka, CC BY-SA 4.0 |
| Hikkaduwa (`hikkaduwa`) | 6.14075, 80.10282 ([OSM way/1153417683](https://www.openstreetmap.org/way/1153417683)) | December – March ([Rough Guides](https://www.roughguides.com/sri-lanka/when-to-go/)) | [Wikipedia: Hikkaduwa](https://en.wikipedia.org/wiki/Hikkaduwa), [Wikivoyage: Hikkaduwa](https://en.wikivoyage.org/wiki/Hikkaduwa) | [Hikkaduwa beach.JPG](https://commons.wikimedia.org/wiki/File:Hikkaduwa_beach.JPG), Krankman, CC BY 3.0 |
| Tissamaharama (`tissamaharama`) | 6.27707, 81.28928 ([OSM node/1723384697](https://www.openstreetmap.org/node/1723384697)) | not set | [Wikipedia: Tissamaharama](https://en.wikipedia.org/wiki/Tissamaharama), [Wikipedia: Tissamaharama Raja Maha Vihara](https://en.wikipedia.org/wiki/Tissamaharama_Raja_Maha_Vihara), [Wikivoyage: Tissamaharama](https://en.wikivoyage.org/wiki/Tissamaharama) | [Tissamaharama Dagoba, 0648.jpg](https://commons.wikimedia.org/wiki/File:Tissamaharama_Dagoba,_0648.jpg), Michael Gunther, CC BY-SA 4.0 |
| Sinharaja Forest Reserve (`sinharaja`) | 6.40105, 80.50264 ([OSM relation/6012712](https://www.openstreetmap.org/relation/6012712)) | December – early April, August – September ([Wikivoyage: Sinharaja Forest Reserve](https://en.wikivoyage.org/wiki/Sinharaja_Forest_Reserve)) | [Wikipedia: Sinharaja Forest Reserve](https://en.wikipedia.org/wiki/Sinharaja_Forest_Reserve), [Wikivoyage: Sinharaja Forest Reserve](https://en.wikivoyage.org/wiki/Sinharaja_Forest_Reserve) | [Sinharaja Forest Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Sinharaja_Forest_Sri_Lanka.jpg), Ruchira159, CC BY-SA 4.0 |


### Near Hiriketiya

| Attraction | Kind | Where (OpenStreetMap) | Distance | Sources | Photo |
|---|---|---|---|---|---|
| Blue Beach Island (`blue-beach-island`) | Beaches | 5.96081, 80.71974 ([OSM node/11595481269](https://www.openstreetmap.org/node/11595481269)) | 1.4 km | [Commons](https://commons.wikimedia.org/wiki/File:Blue_beach_island_nilwella.jpg) | [Blue beach island nilwella.jpg](https://commons.wikimedia.org/wiki/File:Blue_beach_island_nilwella.jpg), Weranga Rajapaksha, CC BY-SA 4.0 |
| Hummanaya Blowhole (`hummanaya-blowhole`) | Hidden Gems | 5.97762, 80.73873 ([OSM node/917949443](https://www.openstreetmap.org/node/917949443)) | 3.8 km | [Wikipedia: Hummanaya](https://en.wikipedia.org/wiki/Hummanaya) | [Hummanaya.jpg](https://commons.wikimedia.org/wiki/File:Hummanaya.jpg), Thilanka Kasunjith, CC BY-SA 4.0 |
| Wewurukannala Vihara (`wewurukannala-vihara`) | Culture | 5.97691, 80.69905 ([OSM way/1006310931](https://www.openstreetmap.org/way/1006310931)) | 1.9 km | [Wikipedia: List of the tallest statues in Sri Lanka](https://en.wikipedia.org/wiki/List_of_the_tallest_statues_in_Sri_Lanka) | [Wewurukannala Vihara (25787824492).jpg](https://commons.wikimedia.org/wiki/File:Wewurukannala_Vihara_(25787824492).jpg), Eleleleven from Bielefeld, Deutschland, CC BY-SA 2.0 |

### Near Tangalle

| Attraction | Kind | Where (OpenStreetMap) | Distance | Sources | Photo |
|---|---|---|---|---|---|
| Goyambokka (`goyambokka-beach`) | Beaches | 6.00914, 80.78054 ([OSM relation/5886130](https://www.openstreetmap.org/relation/5886130)) | 2.4 km | [Wikipedia: Tangalle](https://en.wikipedia.org/wiki/Tangalle) | [Goyambokka Beach, Tangalle, Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Goyambokka_Beach,_Tangalle,_Sri_Lanka.jpg), Satdeep Gill, CC BY 4.0 |
| Mulkirigala Rock Temple (`mulkirigala-rock-temple`) | Culture | 6.12305, 80.73638 ([OSM node/1841305525](https://www.openstreetmap.org/node/1841305525)) | 12.7 km | [Wikipedia: Mulkirigala Raja Maha Vihara](https://en.wikipedia.org/wiki/Mulkirigala_Raja_Maha_Vihara), [Wikipedia: Tangalle](https://en.wikipedia.org/wiki/Tangalle) | [Mulkirigala temple 3.jpg](https://commons.wikimedia.org/wiki/File:Mulkirigala_temple_3.jpg), L Manju, CC BY-SA 4.0 |
| Rekawa turtle beach (`rekawa-turtle-beach`) | Wildlife | 6.0504, 80.866 ([OSM way/1554548435](https://www.openstreetmap.org/way/1554548435)) | 8.3 km | [Wikipedia: Tangalle](https://en.wikipedia.org/wiki/Tangalle) | none |
| Kalametiya (`kalametiya`) | Wildlife | 6.08044, 80.934 ([OSM node/10572932216](https://www.openstreetmap.org/node/10572932216)) | 16.6 km | [Wikipedia: Tangalle](https://en.wikipedia.org/wiki/Tangalle), [Wikivoyage: Tangalle](https://en.wikivoyage.org/wiki/Tangalle) | [Kalametiya Bird Sanctuary Reflections.jpg](https://commons.wikimedia.org/wiki/File:Kalametiya_Bird_Sanctuary_Reflections.jpg), Peter Addor, CC BY-SA 4.0 |
| Ussangoda (`ussangoda`) | Hidden Gems | 6.09711, 80.98562 ([OSM relation/5926094](https://www.openstreetmap.org/relation/5926094)) | 22.6 km | [Wikipedia: Ussangoda National Park](https://en.wikipedia.org/wiki/Ussangoda_National_Park) | [Ussangoda beach.jpg](https://commons.wikimedia.org/wiki/File:Ussangoda_beach.jpg), R.M.S. Ratnayake, CC BY-SA 4.0 |

### Near Matara

| Attraction | Kind | Where (OpenStreetMap) | Distance | Sources | Photo |
|---|---|---|---|---|---|
| Dondra Head lighthouse (`dondra-head-lighthouse`) | Culture | 5.92124, 80.59403 ([OSM way/1160894723](https://www.openstreetmap.org/way/1160894723)) | 5.9 km | [Wikipedia: Dondra Head Lighthouse](https://en.wikipedia.org/wiki/Dondra_Head_Lighthouse), [Wikivoyage: Matara](https://en.wikivoyage.org/wiki/Matara) | [Dondra Head lighthouse.jpg](https://commons.wikimedia.org/wiki/File:Dondra_Head_lighthouse.jpg), Charaka Ranasinghe, CC BY 2.0 |
| Matara Star Fort (`matara-star-fort`) | Culture | 5.94829, 80.54866 ([OSM relation/5391832](https://www.openstreetmap.org/relation/5391832)) | 0.1 km | [Wikipedia: Star Fort, Matara](https://en.wikipedia.org/wiki/Star_Fort,_Matara) | [Dutch Star Fort, Matara 0691.jpg](https://commons.wikimedia.org/wiki/File:Dutch_Star_Fort,_Matara_0691.jpg), Michael Gunther, CC BY-SA 4.0 |
| Paravi Duwa (`paravi-duwa`) | Culture | 5.94151, 80.54919 ([OSM way/1157028833](https://www.openstreetmap.org/way/1157028833)) | 0.7 km | [Commons](https://commons.wikimedia.org/wiki/File:%E0%B6%B4%E0%B6%BB%E0%B7%80%E0%B7%92_%E0%B6%AF%E0%B7%96%E0%B7%80_%E0%B7%80%E0%B7%92%E0%B7%84%E0%B7%8F%E0%B6%BB%E0%B7%83%E0%B7%8A%E0%B6%AE%E0%B7%8F%E0%B6%B1%E0%B6%BA_-_Paravi_Duwa_Temple.jpg) | [පරවි දූව විහාරස්ථානය - Paravi Duwa Temple.jpg](https://commons.wikimedia.org/wiki/File:%E0%B6%B4%E0%B6%BB%E0%B7%80%E0%B7%92_%E0%B6%AF%E0%B7%96%E0%B7%80_%E0%B7%80%E0%B7%92%E0%B7%84%E0%B7%8F%E0%B6%BB%E0%B7%83%E0%B7%8A%E0%B6%AE%E0%B7%8F%E0%B6%B1%E0%B6%BA_-_Paravi_Duwa_Temple.jpg), Nisal Senanayaka, CC BY-SA 4.0 |
| Polhena (`polhena-beach`) | Beaches | 5.93619, 80.52589 ([OSM way/170181121](https://www.openstreetmap.org/way/170181121)) | 2.8 km | [Wikivoyage: Matara](https://en.wikivoyage.org/wiki/Matara) | none |

### Near Mirissa

| Attraction | Kind | Where (OpenStreetMap) | Distance | Sources | Photo |
|---|---|---|---|---|---|
| Coconut Tree Hill (`coconut-tree-hill`) | Beaches | 5.93925, 80.46828 ([OSM node/5764539554](https://www.openstreetmap.org/node/5764539554)) | 1.5 km | [Wikipedia: Coconut Tree Hill](https://en.wikipedia.org/wiki/Coconut_Tree_Hill) | [Coconut tree hills.jpg](https://commons.wikimedia.org/wiki/File:Coconut_tree_hills.jpg), Swanthika, CC BY-SA 4.0 |
| Parrot Rock (`parrot-rock`) | Beaches | 5.94162, 80.46225 ([OSM way/229404799](https://www.openstreetmap.org/way/229404799)) | 0.9 km | [Commons](https://commons.wikimedia.org/wiki/File:People_watching_sunset_from_the_Parrot_Rock_in_Mirissa_2023-03-12.jpg) | [Parrot Rock Bridge in Mirissa Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Parrot_Rock_Bridge_in_Mirissa_Sri_Lanka.jpg), Icaptures84, CC BY-SA 4.0 |
| Secret Beach (`secret-beach-mirissa`) | Beaches | 5.94351, 80.45023 ([OSM way/573467082](https://www.openstreetmap.org/way/573467082)) | 1.0 km |  | [Secret Beach, Mirissa 2023-03-09-1.jpg](https://commons.wikimedia.org/wiki/File:Secret_Beach,_Mirissa_2023-03-09-1.jpg), Alexey Komarov, CC BY-SA 4.0 |

### Near Weligama

| Attraction | Kind | Where (OpenStreetMap) | Distance | Sources | Photo |
|---|---|---|---|---|---|
| Taprobane Island (`taprobane-island`) | Culture | 5.96793, 80.42578 ([OSM way/392614558](https://www.openstreetmap.org/way/392614558)) | 0.6 km | [Wikipedia: Taprobane Island (Weligama)](https://en.wikipedia.org/wiki/Taprobane_Island_(Weligama)), [Wikipedia: Weligama](https://en.wikipedia.org/wiki/Weligama) | [Weligama Island.jpg](https://commons.wikimedia.org/wiki/File:Weligama_Island.jpg), Rovin Shanila, CC BY-SA 4.0 |
| Stilt fishermen (`stilt-fishermen`) | Culture | 5.9848, 80.3299 (no OSM feature) | 11.0 km | [Wikivoyage: Ahangama](https://en.wikivoyage.org/wiki/Ahangama), [Wikipedia: Koggala Lagoon](https://en.wikipedia.org/wiki/Koggala_Lagoon), [Commons](https://commons.wikimedia.org/wiki/Category:Stilt_fishing_in_Sri_Lanka) | [Fishermen practicing traditional stilt fishing near Galle, southern Sri Lanka, 20260207 1419 9448.jpg](https://commons.wikimedia.org/wiki/File:Fishermen_practicing_traditional_stilt_fishing_near_Galle,_southern_Sri_Lanka,_20260207_1419_9448.jpg), Jakub Hałun, CC BY 4.0 |
| Koggala Lake (`koggala-lake`) | Wildlife | 6.00237, 80.33194 ([OSM relation/1412092](https://www.openstreetmap.org/relation/1412092)) | 11.2 km | [Wikipedia: Koggala Lagoon](https://en.wikipedia.org/wiki/Koggala_Lagoon) | [Lake Koggala.jpg](https://commons.wikimedia.org/wiki/File:Lake_Koggala.jpg), Richtr Jan, CC BY 4.0 |
| Handunugoda Tea Estate (`handunugoda-tea-estate`) | Food | 6.01364, 80.36418 ([OSM way/1030601255](https://www.openstreetmap.org/way/1030601255)) | 8.5 km | [Wikivoyage: Unawatuna](https://en.wikivoyage.org/wiki/Unawatuna) | none |

### Near Galle Fort

| Attraction | Kind | Where (OpenStreetMap) | Distance | Sources | Photo |
|---|---|---|---|---|---|
| Jungle Beach (`jungle-beach`) | Beaches | 6.01872, 80.23888 ([OSM relation/7371234](https://www.openstreetmap.org/relation/7371234)) | 4.3 km | [Wikivoyage: Unawatuna](https://en.wikivoyage.org/wiki/Unawatuna) | [Unawatuna Jungle beach (Roomassala).jpg](https://commons.wikimedia.org/wiki/File:Unawatuna_Jungle_beach_(Roomassala).jpg), Rambukwelladk, CC BY-SA 4.0 |
| Japanese Peace Pagoda (`japanese-peace-pagoda`) | Culture | 6.01587, 80.23781 ([OSM way/431413175](https://www.openstreetmap.org/way/431413175)) | 4.6 km | [Wikipedia: Peace Pagoda](https://en.wikipedia.org/wiki/Peace_Pagoda), [Wikivoyage: Unawatuna](https://en.wikivoyage.org/wiki/Unawatuna) | [Peace Pagoda, Unawatuna 1.jpg](https://commons.wikimedia.org/wiki/File:Peace_Pagoda,_Unawatuna_1.jpg), L Manju, CC BY-SA 4.0 |
| Unawatuna (`unawatuna-beach`) | Beaches | 6.00817, 80.24437 ([OSM way/303723769](https://www.openstreetmap.org/way/303723769)) | 5.7 km | [Wikipedia: Unawatuna](https://en.wikipedia.org/wiki/Unawatuna) | [Unawatuna.jpg](https://commons.wikimedia.org/wiki/File:Unawatuna.jpg), Bernard Gagnon, CC BY-SA 3.0 |
| Dalawella (`dalawella-beach`) | Beaches | 6.00172, 80.25896 ([OSM way/481558086](https://www.openstreetmap.org/way/481558086)) | 7.1 km |  | [White sands of Dalawella.jpg](https://commons.wikimedia.org/wiki/File:White_sands_of_Dalawella.jpg), Umeshani Wickramanayake, CC BY-SA 4.0 |

### Near Hikkaduwa

| Attraction | Kind | Where (OpenStreetMap) | Distance | Sources | Photo |
|---|---|---|---|---|---|
| Hikkaduwa reef and turtles (`hikkaduwa-reef`) | Wildlife | 6.13472, 80.09974 ([OSM way/195275709](https://www.openstreetmap.org/way/195275709)) | 0.8 km | [Wikipedia: Hikkaduwa National Park](https://en.wikipedia.org/wiki/Hikkaduwa_National_Park), [Wikipedia: Hikkaduwa](https://en.wikipedia.org/wiki/Hikkaduwa), [Wikivoyage: Hikkaduwa](https://en.wikivoyage.org/wiki/Hikkaduwa) | [Hikkaduwa under water.jpg](https://commons.wikimedia.org/wiki/File:Hikkaduwa_under_water.jpg), Janindu wijesoorya, CC BY-SA 4.0 |
| Madu River (`madu-river`) | Wildlife | 6.28287, 80.05803 ([OSM relation/2034083](https://www.openstreetmap.org/relation/2034083)) | 16.6 km | [Wikipedia: Madu Ganga](https://en.wikipedia.org/wiki/Madu_Ganga), [Wikivoyage: Galle](https://en.wikivoyage.org/wiki/Galle), [Wikivoyage: Hikkaduwa](https://en.wikivoyage.org/wiki/Hikkaduwa) | [Kothduwa Island in Madu Ganga.jpg](https://commons.wikimedia.org/wiki/File:Kothduwa_Island_in_Madu_Ganga.jpg), Knthabrew, CC BY-SA 4.0 |

### Near Tissamaharama

| Attraction | Kind | Where (OpenStreetMap) | Distance | Sources | Photo |
|---|---|---|---|---|---|
| Bundala National Park (`bundala-national-park`) | Wildlife | 6.20986, 81.22518 ([OSM relation/5407631](https://www.openstreetmap.org/relation/5407631)) | 10.3 km | [Wikipedia: Bundala National Park](https://en.wikipedia.org/wiki/Bundala_National_Park), [Wikivoyage: Bundala National Park](https://en.wikivoyage.org/wiki/Bundala_National_Park) | [Shammas 01.jpg](https://commons.wikimedia.org/wiki/File:Shammas_01.jpg), Sham11as, CC BY-SA 4.0 |
| Tissa Wewa (`tissa-wewa`) | Wildlife | 6.29148, 81.28458 ([OSM relation/5457149](https://www.openstreetmap.org/relation/5457149)) | 1.7 km | [Wikipedia: Tissamaharama Raja Maha Vihara](https://en.wikipedia.org/wiki/Tissamaharama_Raja_Maha_Vihara), [Wikivoyage: Tissamaharama](https://en.wikivoyage.org/wiki/Tissamaharama) | [Tissa Lake Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Tissa_Lake_Sri_Lanka.jpg), Kasuni Amarasinghe, CC BY-SA 4.0 |
| Kirinda (`kirinda`) | Culture | 6.21389, 81.3348 ([OSM node/1727709341](https://www.openstreetmap.org/node/1727709341)) | 8.6 km | [Commons](https://commons.wikimedia.org/wiki/File:Kirinda_temple_.Srilanka.jpg) | [Kirinda temple .Srilanka.jpg](https://commons.wikimedia.org/wiki/File:Kirinda_temple_.Srilanka.jpg), Sarala Gamage, CC BY-SA 4.0 |
| Kataragama (`kataragama`) | Culture | 6.4185, 81.33328 ([OSM way/320361590](https://www.openstreetmap.org/way/320361590)) | 16.5 km | [Wikipedia: Kataragama temple](https://en.wikipedia.org/wiki/Kataragama_temple), [Wikivoyage: Kataragama](https://en.wikivoyage.org/wiki/Kataragama) | [Maha Devale shrine in Kataragama, 0656.jpg](https://commons.wikimedia.org/wiki/File:Maha_Devale_shrine_in_Kataragama,_0656.jpg), Michael Gunther, CC BY-SA 4.0 |

### Near Sinharaja Forest Reserve

| Attraction | Kind | Where (OpenStreetMap) | Distance | Sources | Photo |
|---|---|---|---|---|---|
| Kanneliya (`kanneliya-forest`) | Wildlife | 6.23655, 80.37986 ([OSM relation/9343842](https://www.openstreetmap.org/relation/9343842)) | 22.8 km | [Wikipedia: Kanneliya–Dediyagala–Nakiyadeniya](https://en.wikipedia.org/wiki/Kanneliya–Dediyagala–Nakiyadeniya), [Wikivoyage: Galle](https://en.wikivoyage.org/wiki/Galle) | [Kanneliya rain forest.jpg](https://commons.wikimedia.org/wiki/File:Kanneliya_rain_forest.jpg), Asith costa, CC BY-SA 4.0 |

The file also keeps, for each row, its OpenStreetMap link (`osm`) and these sources (`sources`): notes for people, which the import ignores.
