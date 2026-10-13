# Destination image accuracy audit — 2026-10-13

Active application: Teyvat-latest-20261012, confirmed by its PROJECT_STATUS.md. The parent and Teyvat-current contain different source versions and were left unchanged.

## Findings and evidence

The reported Ella → Mirissa mismatch was NOT REPRODUCED in the active local API or Chrome. Ella already resolved to the existing Nine Arch Bridge WebP. Actual 480/1280 pixel Ella assets were inspected; the Commons source describes the bridge in Ella and credits MichaelJames2468 under CC BY-SA 4.0. The actual Explore sequence included all 20 destinations and Ella → Mirissa → Ella. Production CMS replacements and deployment have not been inspected.

FOUND BY STATIC ANALYSIS: migration 0013 restores generic stock URLs if photos were not imported into R2. The API correction matched complete URL strings; changed width/query order could bypass it. The seed reused stock photographs across distinct places. IntroSection independently hardcoded two stock URLs. The optimized registry omitted Sigiriya despite existing correct local assets. Unlocalized Wikimedia images were not allowed by the production CSP. These are separate causes, not proof that every current image is wrong.

VERIFIED: actual photo pixels inspected in contact sheet and individual previews; Commons descriptions/camera coordinates and licenses read. Existing correct photography identity retained, local 480/768/1280 WebP variants added, existing larger variants reused. Filenames match SHA-256 content fingerprints. No AI-generated photography.

Corrected Gal Oya: the previous source identifies Ekgal Oya reservoir with the Gal Oya mountain range. Replaced only that identified photo/seed with AntanO’s source-identified Gal Oya National Park/Senanayake Samudraya photograph (CC BY-SA 4.0), inspected before use. Unknown CMS replacements remain intact.

Missing image: no confidently licensed and identified Belilena photograph was found. Its exact unverified seed now returns a labeled unavailable illustration. A future verified owner replacement is preserved. This remains a manual content task.

## Main destination inventory

Previous means actual local API before this task. Database ID is also the route slug. Mapping is keyed by stable IDs, never list position.

| Destination (ID / slug) | Previous Image | Problem | Corrected Image | Verification Status |
|---|---|---|---|---|
| Ella (ella) | /assets/ella-1280-0aac7f6297dfbdf1.webp | No current location mismatch observed | /assets/ella-1280-0aac7f6297dfbdf1.webp | Verified correct subject; source and pixels inspected |
| Sigiriya (sigiriya) | https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg | External delivery; same named photograph retained | /assets/sigiriya-1280-76f7d2b40a60804b.webp | Verified correct subject; source and pixels inspected |
| Galle Fort (galle) | /assets/galle-1280-0efc885d27415115.webp | No current location mismatch observed | /assets/galle-1280-0efc885d27415115.webp | Verified correct subject; source and pixels inspected |
| Mirissa (mirissa) | https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg | External delivery; same named photograph retained | /assets/mirissa-1280-ada312e4d30b26dd.webp | Verified correct subject; source and pixels inspected |
| Kandy (kandy) | https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg/1280px-Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg | External delivery; same named photograph retained | /assets/kandy-1280-54605d2fdf0b95d1.webp | Verified correct subject; source and pixels inspected |
| Jaffna (jaffna) | /assets/jaffna-1280-f3e43e5d093be421.webp | No current location mismatch observed | /assets/jaffna-1280-f3e43e5d093be421.webp | Verified correct subject; source and pixels inspected |
| Yala National Park (yala) | /assets/yala-1280-32897fa702aaa5b8.webp | No current location mismatch observed | /assets/yala-1280-32897fa702aaa5b8.webp | Verified correct subject; source and pixels inspected |
| Nuwara Eliya (nuwara-eliya) | https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Tea-plantation_Nuwara_Eliya-2567.jpg/1280px-Tea-plantation_Nuwara_Eliya-2567.jpg | External delivery; same named photograph retained | /assets/nuwara-eliya-1280-802845458a0e4797.webp | Verified correct subject; source and pixels inspected |
| Arugam Bay (arugam-bay) | https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Arugam_Bay.jpg/1280px-Arugam_Bay.jpg | External delivery; same named photograph retained | /assets/arugam-bay-1280-49419d6a9f2f43fc.webp | Verified correct subject; source and pixels inspected |
| Trincomalee (trincomalee) | https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Trincomalee_town_beach.jpg/1280px-Trincomalee_town_beach.jpg | External delivery; same named photograph retained | /assets/trincomalee-1280-af1d4ac27c0342c6.webp | Verified correct subject; source and pixels inspected |
| Anuradhapura (anuradhapura) | /assets/anuradhapura-1280-bd3988c31b92100b.webp | No current location mismatch observed | /assets/anuradhapura-1280-bd3988c31b92100b.webp | Verified correct subject; source and pixels inspected |
| Polonnaruwa (polonnaruwa) | /assets/polonnaruwa-1280-a9165d6df6c17ffd.webp | No current location mismatch observed | /assets/polonnaruwa-1280-a9165d6df6c17ffd.webp | Verified correct subject; source and pixels inspected |
| Udawalawe National Park (udawalawe) | /assets/udawalawe-1280-6a0cb2640123b34e.webp | No current location mismatch observed | /assets/udawalawe-1280-6a0cb2640123b34e.webp | Verified correct subject; source and pixels inspected |
| Horton Plains & World’s End (horton-plains) | https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Horton_plains_landscape.jpg/1280px-Horton_plains_landscape.jpg | External delivery; same named photograph retained | /assets/horton-plains-1280-d51096f4f21f2cb9.webp | Verified correct subject; source and pixels inspected |
| Weligama (weligama) | /assets/weligama-1280-a94d461f3f1a5680.webp | No current location mismatch observed | /assets/weligama-1280-a94d461f3f1a5680.webp | Verified correct subject; source and pixels inspected |
| Dambulla Cave Temple (dambulla) | https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Dambulla_Cave_temple.jpg/1280px-Dambulla_Cave_temple.jpg | External delivery; same named photograph retained | /assets/dambulla-1280-88685766562bfc69.webp | Verified correct subject; source and pixels inspected |
| Colombo (colombo) | https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/A_view_of_Colombo's_skyline_from_the_Lotus_Tower.jpg/1280px-A_view_of_Colombo's_skyline_from_the_Lotus_Tower.jpg | External delivery; same named photograph retained | /assets/colombo-1280-ccb336f89eb58808.webp | Verified correct subject; source and pixels inspected |
| Knuckles Mountain Range (knuckles) | https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Knuckles_Mountain_Range.jpg/1280px-Knuckles_Mountain_Range.jpg | External delivery; same named photograph retained | /assets/knuckles-1280-76384a2d94005ec9.webp | Verified correct subject; source and pixels inspected |
| Bentota (bentota) | https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Bentota_beach_in_evening.jpg/1280px-Bentota_beach_in_evening.jpg | External delivery; same named photograph retained | /assets/bentota-1280-c730de74381e1cdb.webp | Verified correct subject; source and pixels inspected |
| Haputale (haputale) | https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Haputale.jpg/1280px-Haputale.jpg | External delivery; same named photograph retained | /assets/haputale-1280-94e6ea90a1d1cc25.webp | Verified correct subject; source and pixels inspected |

## Additional places in hidden gems

| Destination | Previous Image | Problem | Corrected Image | Verification Status |
|---|---|---|---|---|
| Riverston Peak & Pitawala Pathana (riverston) | https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Riverston.jpg/1280px-Riverston.jpg | External delivery; named subject retained | /assets/riverston-1280-6aaf13126f752250.webp | Verified relevant subject; source and pixels inspected |
| Gal Oya National Park (gal-oya) | https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Lake_in_the_jungle.jpg/1280px-Lake_in_the_jungle.jpg | Different reservoir identified by source | /assets/gal-oya-park-1280-062111482b9f0f60.webp | Corrected and source/pixel verified |
| Delft Island (Neduntheevu) (delft-island) | https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Horses_of_Delft.jpg/1280px-Horses_of_Delft.jpg | External delivery; named subject retained | /assets/delft-island-1280-163f25a62ee0e716.webp | Verified relevant subject; source and pixels inspected |
| Belilena Prehistoric Cave (belilena) | https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800 | Unverified stock photograph | /images/photo-unavailable.svg | Missing image / requires manual verification |
| Bambarakanda Waterfall (bambarakanda) | https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Bambarakanda_Waterfall.jpg/1280px-Bambarakanda_Waterfall.jpg | External delivery; named subject retained | /assets/bambarakanda-1280-0074cfbd96fc0103.webp | Verified relevant subject; source and pixels inspected |
| Madulsima Mini World’s End (madulsima) | https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Mountain_Views_at_Madulsima.jpg/1280px-Mountain_Views_at_Madulsima.jpg | External delivery; named subject retained | /assets/madulsima-1280-b975a3f531c53aab.webp | Verified relevant subject; source and pixels inspected |
| Kudumbigala Monastery (kudumbigala) | https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Kumana_National_Park_(Kudumbigala_Sanctuary).JPG/1280px-Kumana_National_Park_(Kudumbigala_Sanctuary).JPG | External delivery; named subject retained | /assets/kudumbigala-1280-5425febdda31ae1c.webp | Verified relevant subject; source and pixels inspected |
| Kalpitiya Peninsula (kalpitiya) | https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Kalpitiya_Beach.jpg/1280px-Kalpitiya_Beach.jpg | External delivery; named subject retained | /assets/kalpitiya-1280-32861ee14079ccc9.webp | Verified relevant subject; source and pixels inspected |

Nine Arch Bridge is an Ella landmark/gallery subject, not a separate destination record. Ahangama occurs in story p7; it is not Weligama.

## Source, content, alt text and rights

Source links provide evidence beyond filenames. Kudumbigala depicts its nearby sanctuary, not a monastery interior; Horton Plains depicts its watercourse, not the World’s End cliff.

| Photo key | Source and filename | Alt text / depicted subject | Author / license |
|---|---|---|---|
| ella | [The Nine Arches Bridge.jpg](https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg) | Nine Arch Bridge surrounded by forest in Ella, Sri Lanka | MichaelJames2468 / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| sigiriya | [Sigiriya Rock fortress.jpg](https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg) | Sigiriya Rock Fortress above the surrounding forest, Sri Lanka | Chamixth / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| galle | [Galle Fort Lighthouse.jpg](https://commons.wikimedia.org/wiki/File:Galle_Fort_Lighthouse.jpg) | Galle Fort lighthouse and coastal ramparts, Sri Lanka | Rovin Shanila / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| mirissa | [Mirissa beach, Srilanka.jpg](https://commons.wikimedia.org/wiki/File:Mirissa_beach%2C_Srilanka.jpg) | Rocky shoreline and beach in Mirissa, Sri Lanka | Abishek Palraj / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| kandy | [Kandy Lake and the Temple of the Sacred Tooth Relic, Kandy.jpg](https://commons.wikimedia.org/wiki/File:Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg) | Kandy Lake and the Temple of the Sacred Tooth Relic, Sri Lanka | Niranjan Ramamurthy / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| yala | [Sri Lankan Leopard yala.jpg](https://commons.wikimedia.org/wiki/File:Sri_Lankan_Leopard_yala.jpg) | Sri Lankan leopard in Yala National Park | Sathsara Panchali / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| nuwara-eliya | [Tea-plantation Nuwara Eliya-2567.jpg](https://commons.wikimedia.org/wiki/File:Tea-plantation_Nuwara_Eliya-2567.jpg) | Tea plantation in Nuwara Eliya, Sri Lanka | Bergentroll / [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| anuradhapura | [Ruwanwelisaya Anuradhapura Sri Lanka 1.jpg](https://commons.wikimedia.org/wiki/File:Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg) | Ruwanwelisaya stupa in Anuradhapura, Sri Lanka | Philip Nalangan / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| polonnaruwa | [Gal Viharaya.jpg](https://commons.wikimedia.org/wiki/File:Gal_Viharaya.jpg) | Gal Vihara Buddha sculpture in Polonnaruwa, Sri Lanka | Dumidu Madhushan Senanayake / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| udawalawe | [Udawalawe Elephants Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Udawalawe_Elephants_Sri_Lanka.jpg) | Elephants beside the reservoir in Udawalawe National Park, Sri Lanka | Sanduweragoda / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| horton-plains | [Horton plains landscape.jpg](https://commons.wikimedia.org/wiki/File:Horton_plains_landscape.jpg) | Waterfall and grassland in Horton Plains National Park, Sri Lanka | Malsha Nanayakkara / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| weligama | [Weligama beach (4).jpg](https://commons.wikimedia.org/wiki/File:Weligama_beach_(4).jpg) | Weligama beach and coastal waters, Sri Lanka | PIERRE ANDRE LECLERCQ / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| dambulla | [Dambulla Cave temple.jpg](https://commons.wikimedia.org/wiki/File:Dambulla_Cave_temple.jpg) | Rock face and buildings of Dambulla Cave Temple, Sri Lanka | Kaushiru90 / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| knuckles | [Knuckles Mountain Range.jpg](https://commons.wikimedia.org/wiki/File:Knuckles_Mountain_Range.jpg) | Knuckles Mountain Range at dusk, Sri Lanka | Kalindu Kasun / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| bentota | [Bentota beach in evening.jpg](https://commons.wikimedia.org/wiki/File:Bentota_beach_in_evening.jpg) | Bentota beach in the evening, Sri Lanka | Rambukwelladk / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| haputale | [Haputale.jpg](https://commons.wikimedia.org/wiki/File:Haputale.jpg) | Hill-country view from Lipton’s Seat near Haputale, Sri Lanka | Bajil1030 / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| riverston | [Riverston.jpg](https://commons.wikimedia.org/wiki/File:Riverston.jpg) | Rural path in Pitawala Pathana near Riverston, Sri Lanka | Sankaindranath / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| gal-oya | [Lake in the jungle.jpg](https://commons.wikimedia.org/wiki/File:Lake_in_the_jungle.jpg) | Ekgal Oya reservoir with the Gal Oya mountain range, Sri Lanka | SandaniWijerathne / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| delft-island | [Horses of Delft.jpg](https://commons.wikimedia.org/wiki/File:Horses_of_Delft.jpg) | Wild horses on Delft Island, Sri Lanka | Gajapera / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| bambarakanda | [Bambarakanda Waterfall.jpg](https://commons.wikimedia.org/wiki/File:Bambarakanda_Waterfall.jpg) | Bambarakanda Waterfall, Sri Lanka | Kiriwattuduwa / [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| kudumbigala | [Kumana National Park (Kudumbigala Sanctuary).JPG](https://commons.wikimedia.org/wiki/File:Kumana_National_Park_(Kudumbigala_Sanctuary).JPG) | Kudumbigala Sanctuary near the monastery complex, Sri Lanka | AntanO / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| kalpitiya | [Kalpitiya Beach.jpg](https://commons.wikimedia.org/wiki/File:Kalpitiya_Beach.jpg) | Sunset over Kalpitiya beach, Sri Lanka | Raiyans / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| tea-workers | [Nuwara Eliya Tea.jpg](https://commons.wikimedia.org/wiki/File:Nuwara_Eliya_Tea.jpg) | Tea gathering in Nuwara Eliya, Sri Lanka | Curved.kiwix / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| fishermen | [Stilt fishing men in Sri Lanka, Ahangama region.jpg](https://commons.wikimedia.org/wiki/File:Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg) | Stilt fishermen in the Ahangama region, Sri Lanka | Marlene Landu / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| food | [Sri Lankan Rice and Curry.jpg](https://commons.wikimedia.org/wiki/File:Sri_Lankan_Rice_and_Curry.jpg) | Sri Lankan rice and curry | Lankan Foodie / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| trincomalee | [Trincomalee town beach.jpg](https://commons.wikimedia.org/wiki/File:Trincomalee_town_beach.jpg) | Trincomalee town beach, Sri Lanka | C. Lalinshan / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| jaffna | [Full view of nallur front.JPG](https://commons.wikimedia.org/wiki/File:Full_view_of_nallur_front.JPG) | Nallur temple frontage in Jaffna, Sri Lanka | Aathavan jaffna / [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| arugam-bay | [Arugam Bay.jpg](https://commons.wikimedia.org/wiki/File:Arugam_Bay.jpg) | Beach and surf at Arugam Bay, Sri Lanka | Nandun Narayana / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| train | [Nine-Arch Bridge in Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Nine-Arch_Bridge_in_Sri_Lanka.jpg) | Nine Arch Bridge in Ella, Sri Lanka | Ravindu Thaksara / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| mirissa-sunset | [Sunset in Mirissa 5 March 2023, Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg) | Sunset over the coast of Mirissa, Sri Lanka | Alexey Komarov / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| colombo | [A view of Colombo's skyline from the Lotus Tower.jpg](https://commons.wikimedia.org/wiki/File:A_view_of_Colombo%27s_skyline_from_the_Lotus_Tower.jpg) | Colombo skyline viewed from the Lotus Tower, Sri Lanka | Thilina Alagiyawanna / [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| madulsima | [Mountain Views at Madulsima.jpg](https://commons.wikimedia.org/wiki/File:Mountain_Views_at_Madulsima.jpg) | Mountain landscape at Madulsima, Sri Lanka | SiddharthSL / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| gal-oya-park | [Gal Oya National Park (Senanayake Samudhraya).JPG](https://commons.wikimedia.org/wiki/File:Gal_Oya_National_Park_(Senanayake_Samudhraya).JPG) | Gal Oya National Park near Senanayake Samudraya, Sri Lanka | AntanO / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

The old Ekgal Oya asset is retained for provenance/alias matching, and is no longer assigned to Gal Oya National Park. WebP adaptation credits are in public/assets/PHOTO_CREDITS.md. Public API credits follow displayed local URLs.

## All page uses

Home cards, Explore desktop/mobile panels, Destinations list/detail/related cards and Search consume the same destination records. Hero slides, Experiences, Tours and Journal retain stable named mappings in PHOTO_CORRECTIONS. Tour stops resolve destination IDs. Detail views are keyed by destination ID. Photo elements share TravelImage; author avatars retain their distinct identity.

Original photo-story captions contradicted inspected scenes: absent blue train/fog; daytime described as dusk; walking leopard described as resting on granite; daytime temple described as evening rituals. Guarded corrections apply only to original copy with known photos. Owner edits preserved. p1 names Ella; p7 names Ahangama. Article/tour covers remain relevant contextual images, not claims to show every itinerary stop.

## Architecture and performance

shared/photo-corrections.ts owns stable named assignments; travel-photos.json owns provenance/alt/position; optimized-photos.json owns fingerprinted variants; photo-assets.ts resolves aliases/responsive metadata. No DB rows, R2 uploads, unknown CMS images or booking data are rewritten. Known Unsplash seed matching ignores sizing/query ordering but preserves host/path identity.

TravelImage preserves decorative empty alt, supplies descriptive content alt, defaults to lazy loading/async decoding, and retains existing stable photo containers. Heroes load eagerly. Retries keep the same photo, then use a labeled unavailable image. Source-keyed inner images reset retry state. No fallback to an unrelated destination.

## QA limits

Fresh results: FINAL_QA.md. Evidence directory: docs/qa-results/image-typography (before/after payloads, downloaded candidates, inspected contact sheet, browser observations/screenshots). Initial final-browser run reached 126 layouts, 22 selections and 33 decoded assets, then failed on an audit filter selector; it was corrected. Restart retry exposed stale preview HTML from a surviving process; a fresh-port preview was used for final verification.

No production deployment, physical-device/cross-browser acceptance or full WCAG certification is claimed. Belilena remains unresolved.

Final built-site verification PASS: 22 desktop/20 measured visible mobile selections; all 33 published image URLs decode; 108 responsive WebP URLs return 200. Filter/marker/theme/refresh/route and injected-error-reset assertions passed. Exact booking-fixture and broader test limits are in FINAL_QA.md.
