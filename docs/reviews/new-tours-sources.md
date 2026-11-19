# New tour drafts: sources

What `scripts/content/tours.json` (the 11 drafts) and Kitulgala in `scripts/content/places.json` rest
on. Checked on 20 November 2026. `npm run content:import` writes them as unpublished drafts with no
price (`docs/plans/new-tours.md`); nothing is public until someone publishes it in the admin.

## Sources read

1. **Rough Guides**, When to go (updated 15 May 2025): <https://www.roughguides.com/sri-lanka/when-to-go/>
   (also source 4 in `when-to-go-sources.md`).
2. **`docs/reviews/when-to-go-sources.md`**: the seasons already checked for the When to go page
   (Department of Meteorology, Sri Lanka Tourism, Scott Dunn).
3. **Wikivoyage, Arugam Bay**: <https://en.wikivoyage.org/wiki/Arugam_Bay>
4. **Wikipedia, Arugam Bay**: <https://en.wikipedia.org/wiki/Arugam_Bay>
5. **Newsfirst, 30 Aug 2019**, Yala park to be closed for two months:
   <https://newsfirst.lk/2019/08/30/yala-park-to-be-closed-for-two-months-from-september-1st>
6. **Newsfirst, 7 Sep 2026**, Yala National Park blocks 1 and 2 to close temporarily:
   <https://newsfirst.lk/2026/09/07/yala-national-park-blocks-1-and-2-to-close-temporarily-from-september-14>
7. **Sankalpa et al. (2021)**, Cetacean occurrence and diversity in whale-watching waters off Mirissa,
   *Integrative Zoology* 16(4): 462–476 (abstract):
   <https://research-portal.uea.ac.uk/en/publications/cetacean-occurrence-and-diversity-in-whale-watching-waters-off-mi/>
8. **Wikipedia, Kitulgala**: <https://en.wikipedia.org/wiki/Kitulgala>
9. **OpenStreetMap, Kithulgala** (place=town, node 1150497671): <https://www.openstreetmap.org/node/1150497671>
10. **Wikipedia, Udawalawe National Park**: <https://en.wikipedia.org/wiki/Udawalawe_National_Park>
11. **Wikipedia, Horton Plains National Park**: <https://en.wikipedia.org/wiki/Horton_Plains_National_Park>
12. **Wikivoyage, Horton Plains National Park**: <https://en.wikivoyage.org/wiki/Horton_Plains_National_Park>
13. **Wikivoyage, Ella**: <https://en.wikivoyage.org/wiki/Ella>
14. **Wikipedia, Ella, Sri Lanka**: <https://en.wikipedia.org/wiki/Ella,_Sri_Lanka>
15. **Wikivoyage, Sigiriya**: <https://en.wikivoyage.org/wiki/Sigiriya>
16. **Wikipedia, Pidurangala Vihara**: <https://en.wikipedia.org/wiki/Pidurangala_Vihara>
17. **Wikipedia, Knuckles Mountain Range**: <https://en.wikipedia.org/wiki/Knuckles_Mountain_Range>
18. **Wikipedia, Trincomalee**: <https://en.wikipedia.org/wiki/Trincomalee>
19. **Wikipedia, Haputale**: <https://en.wikipedia.org/wiki/Haputale>
20. **Wikipedia, Bentota**: <https://en.wikipedia.org/wiki/Bentota>
21. **Wikipedia, Dambulla cave temple**: <https://en.wikipedia.org/wiki/Dambulla_cave_temple>
22. **Newsfirst, 20 Jun 2026**, Badulla–Nanu Oya train services resume today:
    <https://english.newsfirst.lk/2026/06/20/badullananu-oya-train-services-resume-today>
23. **Sunday Times, 21 Jun 2026**, Podi Menike hits the tracks from Nanu Oya to Badulla:
    <https://www.sundaytimes.lk/260621/news/podi-menike-hits-the-tracks-from-nanu-oya-to-badulla-marking-latest-phase-of-restoration-646913.html>
24. **Wikimedia Commons**, Kelani Ganga at Kithulgala Rest House (Pol van den Scheetek…, CC BY 3.0):
    <https://commons.wikimedia.org/wiki/File:Kelani_Ganga_at_Kithulgala_Rest_House_-_panoramio_(1).jpg>

Tried and not used: Sri Lanka Tourism's adventure and rafting pages (srilanka.travel) load their text
with JavaScript, and none could be read; a search summary said it gives November to April for
rafting, which couldn't be checked, so it isn't used. Wikivoyage has no Kitulgala or Knuckles page.
The 2023 study of blue whales off the south coast (*Journal of Marine Science and Engineering*
11(8): 1523) refused automated requests and was seen only through a search summary, so it isn't used.
Tour operators' pages were read only to see where sources disagree; nothing rests on them.

## Best months

| Trips | `best_months` | Rests on | Where sources disagree |
|---|---|---|---|
| East coast: #1 East Coast Beaches, #8 Rock Climbs and Surf, #10 Ancient Cities and the East Coast for Two | May to September | The east coast's dry season, "April or May to September" [1]; May to September in Scott Dunn and Sri Lanka Tourism [2] | Rough Guides starts in April or May [1]; Trincomalee's own row says April to October. The drafts use May to September, the months all agree on |
| South and west coast: #3 A Short South Coast Family Trip, #5 Rest on the Southwest Coast, #9 Hills and Coast for Two, #11 Southern Parks and Whales | December to March | "between December and March" for the west and south coasts and the hill country [1] | Scott Dunn gives the west coast October to April and the south coast late November to April [2]. The drafts use the narrower months |
| Hill country: #2 Elephants, a Train and the Beach, #4 Tea Country, Slowly, #6 Quiet Days in the Hills, #7 Rivers and Ridges | December to March | The same sentence in [1]; Horton Plains' dry season is January to March [11] | Scott Dunn: December to April; Sri Lanka Tourism calls March and April ideal [2]. #2 also ends on the south coast, whose months match |

Every draft says its months in its description ("Best from …").

## Seasons named in the text

- **Arugam Bay's surf season** (#1, #8): "The surf season is April to October", and in the wet season
  (November to March) the weather "prevents surfable waves from forming" [3]. Wikipedia says only that
  it is a popular surfing location [4]. #8's months (May to September) sit inside the surf season.
- **Yala's closures** (#11): the park, or part of it, has closed for some weeks in September and
  October in recent years, for dry weather and maintenance: all of it from 1 September to 31 October
  2019 [5]; blocks 1 and 2 from 14 September to 15 October 2026, the other blocks open [6]. Neither
  calls it a fixed yearly closure, so the draft says the dates change and are checked at booking.
- **Whale watching off Mirissa** (#9, #11): Rough Guides calls December to February and March to
  April good times for whale watching off the south coast [1]: the drafts say "from about December
  to April". Blue whales were 167 of the 174 large-whale encounters in a January to May 2017 survey [7],
  which supports "the large whales seen most often here". Tour operators often say November to April;
  not used. Every mention says sightings can't be guaranteed.

## Activities (Adventure and the others)

| Activity | Draft | Source | What the draft says, and what it leaves out |
|---|---|---|---|
| White-water rafting at Kitulgala | #7 | [8]: rafting "starts a few kilometres upstream" | With a licensed operator, who decides on the day whether the river's level is right. No grade and no season: none was found in a reliable source (operators disagree on both) |
| Forest birds at Kitulgala | #7 | [8]: most of Sinharaja's rainforest bird species, in lower numbers | "many of the island's rainforest birds" |
| The Horton Plains loop to World's End and Baker's Falls | #4, #7 | [12]: a 9 km circuit trail; [11]: World's End is a cliff with an 870 m drop, Baker's Falls a waterfall | Neither page says the loop passes both; the drafts follow the seed's own "Horton Plains & World's End" |
| Little Adam's Peak | #2, #4, #9 | [13]: "a relatively easy hike"; [14]: 1,141 m | "a fairly easy walk" |
| Ella Rock | #7 | [13]: about two hours each way, along the railway and through tea estates, harder than Little Adam's Peak | As the source says |
| Nine Arch Bridge walk | #2, #6 | [13]: 45 minutes' walk from the town | |
| Sigiriya climb | #1, #2, #8, #10 | [15]: about 1.5 hours with the gardens | |
| Pidurangala climb | #8 | [15]: 20 to 30 minutes, boulders at the top, many come at sunrise; [16]: about 1 km north of Sigiriya | |
| Hiking in the Knuckles | #8 | [17]: part of a UNESCO World Heritage site (2010); the higher slopes are often in cloud | No named trail or village: none in a source read. "with a local guide" is what the trip arranges, not a fact about the place |
| Surfing at Arugam Bay | #1, #8 | [3], [4] | Seasonal, as above. "a lesson if you're new to surfing" is an option the trip can add |
| Jeep safaris at Udawalawe; the Elephant Transit Home | #2, #3, #11 | [10]: about 250 resident elephants, "one of the main attractions"; jeep safaris early and late; the Transit Home (1995) looks after abandoned calves until they can return | Sightings can't be guaranteed |
| Jeep safaris at Yala | #11 | The seed's Yala row and its existing safari experience; [5], [6] for the closures | Known for leopards; sightings can't be guaranteed |
| The train in the hills | #2, #4, #6, #7, #9 | [22], [23]: Nanu Oya to Badulla reopened on 20 June 2026 after Cyclone Ditwah; [13]: trains don't continue to Kandy | The drafts take the train from Nanu Oya (near Nuwara Eliya) or Haputale to Ella, and drive from Kandy; "if it isn't running, we drive" |

## Places and other facts

- **Trincomalee** [18]: Koneswaram temple on Swami Rock; Uppuveli beach in the town and Nilaveli just
  north. The draft doesn't use "fifth largest natural harbour" or "most picturesque".
- **Haputale** [19]: about 1,431 m; Lipton's Seat, with views over five provinces; Adisham Bungalow,
  modelled on Leeds Castle; the Dambatenne tea plantation.
- **Bentota** [20]: about 65 km south of Colombo; on the Bentota River; Brief Garden, 11 km inland,
  Bevis Bawa's garden on a former rubber plantation. Wikipedia says Bentota "delivers" Ayurveda; the
  wellness drafts say only that many hotels offer treatments and yoga, and make no health claims.
- **Dambulla** [21]: five caves, 153 Buddha statues, painted ceilings, 19 km from Sigiriya; a visit
  from the Sigiriya stay in #10.
- **Kitulgala** (the new draft destination): a small town on the Kelani River, in Kegalle District,
  Sabaragamuwa Province [8], [9]; *The Bridge on the River Kwai* was filmed nearby, and only the
  bridge's concrete foundations remain [8]. Coordinates are the OpenStreetMap town node [9]. No best
  months: no reliable source gives them. Photo [24]: the river at Kithulgala Rest House; its file's GPS
  (6.99503, 80.40506) is about 0.5 km from the town's node. It shows a person bathing far off, not
  identifiable. The author's name is cut short on Commons itself (a Panoramio import), and the
  credit uses it as Commons gives it.

## Rules the drafts follow

- No prices (`price_from` empty: "Price on request").
- "Included" is the same in every draft: a car and driver for the route (for #5, the transfers),
  accommodation for the nights listed, and the transfers between stops. Everything else is "can be
  added: ask us". No hotel grades, no "luxury", "private chef" or "tented camp".
- Wellness (#5, #6): rest, long stays, and Ayurveda or yoga where hotels offer them. No health or
  medical claims; `tours-import` greps for them.
- Wildlife and whales: every safari or boat day says sightings can't be guaranteed.
- Plain copy: no em dashes and no stock phrases (`plain-copy`'s list and more, in `tours-import`).
- Covers: each draft's cover is a seed destination's verified photo in R2 (its `media` set), else that
  destination's stored cover. No new photos for tours.

## Already published text that the train news touches (not changed here)

- The Hill Country category's intro (0030, approved) says days "can include the train between Kandy and
  Ella". Since Cyclone Ditwah the train starts at Nanu Oya [22].
- The seed tour **Island in 7 Days** has "The Highland Blue Train to Ella" from Kandy on day 3.

Both are worth an edit in the admin, or a guarded migration, once the owner decides the wording.
