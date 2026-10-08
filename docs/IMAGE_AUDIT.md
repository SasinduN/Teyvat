# Current read-only image audit — 2026-10-08

Executed scripts/audit-public-images.ts against the running local public API and current mappers. Inventory: 62 image/gallery/slide references, 61 with matching local credit/source/license metadata. The one unverified source is hiddenGems/belilena, still using an Unsplash reference. Inventory includes names/descriptions, mapped source, responsive candidates and credit record: qa-results/web-debug/image-inventory.json. Credit presence is not proof of pixel accuracy or loading.

Fresh primary source metadata/licensing spot-checks: [Ella Nine Arches Bridge](https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg), [Sigiriya](https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg), [Galle Lighthouse](https://commons.wikimedia.org/wiki/File:Galle_Fort_Lighthouse.jpg) identify the named subjects and CC BY-SA 4.0. Remaining catalog checks from earlier audits are historical, not freshly repeated here. Belilena source research did not establish an inspectable/licensed replacement; no unrelated cave or beautiful landscape was substituted.

All existing CMS sources, guarded corrections, galleries and attribution retained. Responsive candidates, source/original retry and modern-format pipeline from previous work remain. External download restrictions and browser disconnection prevent current all-image pixel/decode/sharpness/crop verification and WebP generation. Existing Belilena and fine editorial-caption questions remain OPEN. Every inventory row explicitly marks visual/loading/crop NEEDS MANUAL VERIFICATION. Do not interpret the inventory as a completed full visual image audit.

Fix in this pass: 404's first photo now eager/high/100vw; hero gradients lighter without blur. No database writes or image substitutions. Focused photo/mapper/retry/responsive checks PASS. Historical evidence follows.

# 2026-10-08 — Active backend compatibility audit

VERIFIED: the existing local API still returns legacy seeded photo references, so migration-only corrections were insufficient in this running environment. `shared/public-photos.ts` applies the existing named-record correction catalog to 58 exact legacy primary references and two exact seeded galleries, through the client mappers and Express share-image resolver. Admin replacements are preserved. Jaffna uses the credited Nallur original. Dedicated tests cover all 58 mappings, credits, owner preservation and gallery guards. Live API-to-mapper comparison PASS for all nine collections (63 records); no database writes were made.

All 32 Commons source pages were reopened and source descriptions/locations/licenses reviewed. The existing catalog and `/photo-credits` retain author/license/source links. These are source metadata checks, not visual inspection. Examples: Nallur fronts Jaffna; Gal Viharaya is Polonnaruwa; Yala source names the Sri Lankan leopard; Ella source names Nine Arches Bridge; Gal Oya image documents Ekgal Oya reservoir with the Gal Oya range, so it illustrates the region rather than proving the described national-park boat safari.

All 32 derivative URLs were attempted through the web tool: Knuckles and Mirissa-sunset fetched; the remaining 30 returned tool accessibility/cache failures. Such failures do not prove browser HTTP failures. Original-image retry remains available. Shell external HTTPS and browser rendering remain blocked. Evidence: qa-results/restructure-photo-fetch.json. Browser decode, desktop/mobile crops, sharpness and network requests are NOT VERIFIED.

Source review additionally identified tea-worker Nuwara Eliya versus the old Hatton label, and fishermen Ahangama versus old Koggala/Weligama. Guarded mapper corrections now match those two labels to source geography, preserving owner-edited photographs/labels. Regression tests cover both.

Known unresolved items remain explicit: Belilena lacks a verified replacement; seeded photo-story captions contain unverified timing/pose/color details. Exact fine-caption associations still require visual/editorial review. No unrelated substitute was chosen to hide missing photography. This pass does not claim every image/name/caption is fully resolved.

# Travel Eye image audit

2026-10-06. Source metadata and geographic subject were compared for every named record below. Replacement URLs are reviewed Commons files, not generic stock substitutions. External image bytes and rendered crops could not be tested: outbound shell HTTPS is restricted and Chrome disconnects. Therefore loading/crop sign-off is NEEDS MANUAL VERIFICATION, even where metadata matches. Belilena remains OPEN. Caption details such as time of day, mist, animal pose and train colour require rendered review.

## destinations / ella / image

Page: /destinations/ella
Section: destinations
Displayed Name: Ella
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg
Author: MichaelJames2468
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / ella / gallery[0]

Page: /destinations/ella
Section: destinations
Displayed Name: Ella
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg
Author: MichaelJames2468
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / ella / gallery[1]

Page: /destinations/ella
Section: destinations
Displayed Name: Ella
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Nine-Arch_Bridge_in_Sri_Lanka.jpg/1280px-Nine-Arch_Bridge_in_Sri_Lanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Nine-Arch_Bridge_in_Sri_Lanka.jpg
Author: Ravindu Thaksara
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / ella / gallery[2]

Page: /destinations/ella
Section: destinations
Displayed Name: Ella
Current Image (before): https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Gallery was shortened/replaced with verified location photographs; see current inventory
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: NEEDS MANUAL VERIFICATION
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Gallery consolidated to correct location images
Replacement: Removed mismatched extra gallery frame
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION

## destinations / sigiriya / image

Page: /destinations/sigiriya
Section: destinations
Displayed Name: Sigiriya
Current Image (before): https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg
Author: Chamixth
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / sigiriya / gallery[0]

Page: /destinations/sigiriya
Section: destinations
Displayed Name: Sigiriya
Current Image (before): https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg
Author: Chamixth
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / sigiriya / gallery[1]

Page: /destinations/sigiriya
Section: destinations
Displayed Name: Sigiriya
Current Image (before): https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Gallery was shortened/replaced with verified location photographs; see current inventory
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: NEEDS MANUAL VERIFICATION
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Gallery consolidated to correct location images
Replacement: Removed mismatched extra gallery frame
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION

## destinations / galle / image

Page: /destinations/galle
Section: destinations
Displayed Name: Galle Fort
Current Image (before): https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Galle_Fort_Lighthouse.jpg/1280px-Galle_Fort_Lighthouse.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Galle_Fort_Lighthouse.jpg
Author: Rovin Shanila
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / mirissa / image

Page: /destinations/mirissa
Section: destinations
Displayed Name: Mirissa
Current Image (before): https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Mirissa_beach%2C_Srilanka.jpg
Author: Abishek Palraj
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / kandy / image

Page: /destinations/kandy
Section: destinations
Displayed Name: Kandy
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg/1280px-Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg
Author: Niranjan Ramamurthy
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / jaffna / image

Page: /destinations/jaffna
Section: destinations
Displayed Name: Jaffna
Current Image (before): https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Full_view_of_nallur_front.JPG/1280px-Full_view_of_nallur_front.JPG
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Full_view_of_nallur_front.JPG
Author: Aathavan jaffna
License: CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)

## destinations / yala / image

Page: /destinations/yala
Section: destinations
Displayed Name: Yala National Park
Current Image (before): https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sri_Lankan_Leopard_yala.jpg
Author: Sathsara Panchali
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / nuwara-eliya / image

Page: /destinations/nuwara-eliya
Section: destinations
Displayed Name: Nuwara Eliya
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Tea-plantation_Nuwara_Eliya-2567.jpg/1280px-Tea-plantation_Nuwara_Eliya-2567.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Tea-plantation_Nuwara_Eliya-2567.jpg
Author: Bergentroll
License: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)

## destinations / arugam-bay / image

Page: /destinations/arugam-bay
Section: destinations
Displayed Name: Arugam Bay
Current Image (before): https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Arugam_Bay.jpg/1280px-Arugam_Bay.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Arugam_Bay.jpg
Author: Nandun Narayana
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / trincomalee / image

Page: /destinations/trincomalee
Section: destinations
Displayed Name: Trincomalee
Current Image (before): https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Trincomalee_town_beach.jpg/1280px-Trincomalee_town_beach.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Trincomalee_town_beach.jpg
Author: C. Lalinshan
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / anuradhapura / image

Page: /destinations/anuradhapura
Section: destinations
Displayed Name: Anuradhapura
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg/1280px-Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg
Author: Philip Nalangan
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / polonnaruwa / image

Page: /destinations/polonnaruwa
Section: destinations
Displayed Name: Polonnaruwa
Current Image (before): https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Gal_Viharaya.jpg/1280px-Gal_Viharaya.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Gal_Viharaya.jpg
Author: Dumidu Madhushan Senanayake
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / udawalawe / image

Page: /destinations/udawalawe
Section: destinations
Displayed Name: Udawalawe National Park
Current Image (before): https://images.unsplash.com/photo-1581852017103-68accd5509b6?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Udawalawe_Elephants_Sri_Lanka.jpg/1280px-Udawalawe_Elephants_Sri_Lanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Udawalawe_Elephants_Sri_Lanka.jpg
Author: Sanduweragoda
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / horton-plains / image

Page: /destinations/horton-plains
Section: destinations
Displayed Name: Horton Plains & World’s End
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Horton_plains_landscape.jpg/1280px-Horton_plains_landscape.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Horton_plains_landscape.jpg
Author: Malsha Nanayakkara
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / weligama / image

Page: /destinations/weligama
Section: destinations
Displayed Name: Weligama
Current Image (before): https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Weligama_beach_(4).jpg/1280px-Weligama_beach_(4).jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Weligama_beach_(4).jpg
Author: PIERRE ANDRE LECLERCQ
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / dambulla / image

Page: /destinations/dambulla
Section: destinations
Displayed Name: Dambulla Cave Temple
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Dambulla_Cave_temple.jpg/1280px-Dambulla_Cave_temple.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Dambulla_Cave_temple.jpg
Author: Kaushiru90
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / colombo / image

Page: /destinations/colombo
Section: destinations
Displayed Name: Colombo
Current Image (before): https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/A_view_of_Colombo's_skyline_from_the_Lotus_Tower.jpg/1280px-A_view_of_Colombo's_skyline_from_the_Lotus_Tower.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:A_view_of_Colombo%27s_skyline_from_the_Lotus_Tower.jpg
Author: Thilina Alagiyawanna
License: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)

## destinations / knuckles / image

Page: /destinations/knuckles
Section: destinations
Displayed Name: Knuckles Mountain Range
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Knuckles_Mountain_Range.jpg/1280px-Knuckles_Mountain_Range.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Knuckles_Mountain_Range.jpg
Author: Kalindu Kasun
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / bentota / image

Page: /destinations/bentota
Section: destinations
Displayed Name: Bentota
Current Image (before): https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Bentota_beach_in_evening.jpg/1280px-Bentota_beach_in_evening.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Bentota_beach_in_evening.jpg
Author: Rambukwelladk
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## destinations / haputale / image

Page: /destinations/haputale
Section: destinations
Displayed Name: Haputale
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Haputale.jpg/1280px-Haputale.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Haputale.jpg
Author: Bajil1030
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## experienceCategories / beach-escapes / image

Page: Home and associated detail/index page
Section: experienceCategories
Displayed Name: Beach Escapes
Current Image (before): https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Mirissa_beach%2C_Srilanka.jpg
Author: Abishek Palraj
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## experienceCategories / wild-sri-lanka / image

Page: Home and associated detail/index page
Section: experienceCategories
Displayed Name: Wild Sri Lanka
Current Image (before): https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sri_Lankan_Leopard_yala.jpg
Author: Sathsara Panchali
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## experienceCategories / ancient-sri-lanka / image

Page: Home and associated detail/index page
Section: experienceCategories
Displayed Name: Ancient Sri Lanka
Current Image (before): https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg
Author: Chamixth
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## experienceCategories / mountain-adventures / image

Page: Home and associated detail/index page
Section: experienceCategories
Displayed Name: Mountain Adventures
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Knuckles_Mountain_Range.jpg/1280px-Knuckles_Mountain_Range.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Knuckles_Mountain_Range.jpg
Author: Kalindu Kasun
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## experienceCategories / food-and-culture / image

Page: Home and associated detail/index page
Section: experienceCategories
Displayed Name: Food & Culture
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Sri_Lankan_Rice_and_Curry.jpg/1280px-Sri_Lankan_Rice_and_Curry.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sri_Lankan_Rice_and_Curry.jpg
Author: Lankan Foodie
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## experienceCategories / hidden-sri-lanka / image

Page: Home and associated detail/index page
Section: experienceCategories
Displayed Name: Hidden Sri Lanka
Current Image (before): https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Riverston.jpg/1280px-Riverston.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Riverston.jpg
Author: Sankaindranath
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## featuredExperiences / sunrise-ella / image

Page: Home and associated detail/index page
Section: featuredExperiences
Displayed Name: Sunrise at Ella
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1000
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg
Author: MichaelJames2468
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## featuredExperiences / safari-yala / image

Page: Home and associated detail/index page
Section: featuredExperiences
Displayed Name: Safari in Yala
Current Image (before): https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=1000
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sri_Lankan_Leopard_yala.jpg
Author: Sathsara Panchali
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## featuredExperiences / sunset-mirissa / image

Page: Home and associated detail/index page
Section: featuredExperiences
Displayed Name: Sunset in Mirissa
Current Image (before): https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg/1280px-Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg
Author: Alexey Komarov
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## featuredExperiences / walk-galle-fort / image

Page: Home and associated detail/index page
Section: featuredExperiences
Displayed Name: Walk Through Galle Fort
Current Image (before): https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=1000
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Galle_Fort_Lighthouse.jpg/1280px-Galle_Fort_Lighthouse.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Galle_Fort_Lighthouse.jpg
Author: Rovin Shanila
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## tours / island-in-7-days / image

Page: /tours/island-in-7-days
Section: tours
Displayed Name: Island in 7 Days
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg
Author: Chamixth
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## tours / cultural-sri-lanka / image

Page: /tours/cultural-sri-lanka
Section: tours
Displayed Name: Cultural Sri Lanka
Current Image (before): https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Gal_Viharaya.jpg/1280px-Gal_Viharaya.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Gal_Viharaya.jpg
Author: Dumidu Madhushan Senanayake
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## tours / wild-sri-lanka / image

Page: /tours/wild-sri-lanka
Section: tours
Displayed Name: Wild Sri Lanka Expedition
Current Image (before): https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sri_Lankan_Leopard_yala.jpg
Author: Sathsara Panchali
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## tours / southern-escape / image

Page: /tours/southern-escape
Section: tours
Displayed Name: Southern Coastal Escape
Current Image (before): https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Mirissa_beach%2C_Srilanka.jpg
Author: Abishek Palraj
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## articles / sunrise-locations-sri-lanka / image

Page: Home and associated detail/index page
Section: articles
Displayed Name: 10 Places to Watch Sunrise in Sri Lanka
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg
Author: MichaelJames2468
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## articles / sunrise-locations-sri-lanka / author_avatar

Page: Home and associated detail/index page
Section: articles
Displayed Name: 10 Places to Watch Sunrise in Sri Lanka
Current Image (before): https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200
Does Image Match Name?: Unverifiable stock author likeness; removed from visible UI
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: NEEDS MANUAL VERIFICATION
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Author initials preserve names and roles; stored portrait field retained
Replacement: Initials, no stock portrait
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION

## articles / ultimate-ella-guide / image

Page: Home and associated detail/index page
Section: articles
Displayed Name: The Ultimate Ella Travel Guide: Mountains, Trains & Tea
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Nine-Arch_Bridge_in_Sri_Lanka.jpg/1280px-Nine-Arch_Bridge_in_Sri_Lanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Nine-Arch_Bridge_in_Sri_Lanka.jpg
Author: Ravindu Thaksara
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## articles / ultimate-ella-guide / author_avatar

Page: Home and associated detail/index page
Section: articles
Displayed Name: The Ultimate Ella Travel Guide: Mountains, Trains & Tea
Current Image (before): https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200
Does Image Match Name?: Unverifiable stock author likeness; removed from visible UI
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: NEEDS MANUAL VERIFICATION
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Author initials preserve names and roles; stored portrait field retained
Replacement: Initials, no stock portrait
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION

## articles / best-beaches-sri-lanka / image

Page: Home and associated detail/index page
Section: articles
Displayed Name: Best Beaches in Sri Lanka: From Surf Points to Secret Bays
Current Image (before): https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mirissa_beach%2C_Srilanka.jpg/1280px-Mirissa_beach%2C_Srilanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Mirissa_beach%2C_Srilanka.jpg
Author: Abishek Palraj
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## articles / best-beaches-sri-lanka / author_avatar

Page: Home and associated detail/index page
Section: articles
Displayed Name: Best Beaches in Sri Lanka: From Surf Points to Secret Bays
Current Image (before): https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200
Does Image Match Name?: Unverifiable stock author likeness; removed from visible UI
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: NEEDS MANUAL VERIFICATION
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Author initials preserve names and roles; stored portrait field retained
Replacement: Initials, no stock portrait
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION

## articles / guide-sri-lankan-food / image

Page: Home and associated detail/index page
Section: articles
Displayed Name: A Guide to Sri Lankan Food: Curries, Hoppers & Spices
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Sri_Lankan_Rice_and_Curry.jpg/1280px-Sri_Lankan_Rice_and_Curry.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sri_Lankan_Rice_and_Curry.jpg
Author: Lankan Foodie
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## articles / guide-sri-lankan-food / author_avatar

Page: Home and associated detail/index page
Section: articles
Displayed Name: A Guide to Sri Lankan Food: Curries, Hoppers & Spices
Current Image (before): https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200
Does Image Match Name?: Unverifiable stock author likeness; removed from visible UI
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: NEEDS MANUAL VERIFICATION
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Author initials preserve names and roles; stored portrait field retained
Replacement: Initials, no stock portrait
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION

## articles / wildlife-safaris-where-to-go / image

Page: Home and associated detail/index page
Section: articles
Displayed Name: Wildlife Safaris: Where to Go for Leopards, Elephants & Whales
Current Image (before): https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sri_Lankan_Leopard_yala.jpg
Author: Sathsara Panchali
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## articles / wildlife-safaris-where-to-go / author_avatar

Page: Home and associated detail/index page
Section: articles
Displayed Name: Wildlife Safaris: Where to Go for Leopards, Elephants & Whales
Current Image (before): https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200
Does Image Match Name?: Unverifiable stock author likeness; removed from visible UI
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: NEEDS MANUAL VERIFICATION
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Author initials preserve names and roles; stored portrait field retained
Replacement: Initials, no stock portrait
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION

## articles / hidden-gems-visit / image

Page: Home and associated detail/index page
Section: articles
Displayed Name: Hidden Gems You Should Visit Before Everyone Else Does
Current Image (before): https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Riverston.jpg/1280px-Riverston.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Riverston.jpg
Author: Sankaindranath
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## articles / hidden-gems-visit / author_avatar

Page: Home and associated detail/index page
Section: articles
Displayed Name: Hidden Gems You Should Visit Before Everyone Else Does
Current Image (before): https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200
Does Image Match Name?: Unverifiable stock author likeness; removed from visible UI
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: NEEDS MANUAL VERIFICATION
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Author initials preserve names and roles; stored portrait field retained
Replacement: Initials, no stock portrait
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION

## hiddenGems / riverston / image

Page: Home and associated detail/index page
Section: hiddenGems
Displayed Name: Riverston Peak & Pitawala Pathana
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Riverston.jpg/1280px-Riverston.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Riverston.jpg
Author: Sankaindranath
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## hiddenGems / gal-oya / image

Page: Home and associated detail/index page
Section: hiddenGems
Displayed Name: Gal Oya National Park
Current Image (before): https://images.unsplash.com/photo-1581852017103-68accd5509b6?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Lake_in_the_jungle.jpg/1280px-Lake_in_the_jungle.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Lake_in_the_jungle.jpg
Author: SandaniWijerathne
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## hiddenGems / delft-island / image

Page: Home and associated detail/index page
Section: hiddenGems
Displayed Name: Delft Island (Neduntheevu)
Current Image (before): https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Horses_of_Delft.jpg/1280px-Horses_of_Delft.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Horses_of_Delft.jpg
Author: Gajapera
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## hiddenGems / belilena / image

Page: Home and associated detail/index page
Section: hiddenGems
Displayed Name: Belilena Prehistoric Cave
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: NOT VERIFIED; unresolved cave photograph
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: NEEDS MANUAL VERIFICATION
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Kept record and flagged mismatch; rejected Ravana Cave as a substitute for Belilena
Replacement: https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: OPEN

## hiddenGems / bambarakanda / image

Page: Home and associated detail/index page
Section: hiddenGems
Displayed Name: Bambarakanda Waterfall
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Bambarakanda_Waterfall.jpg/1280px-Bambarakanda_Waterfall.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Bambarakanda_Waterfall.jpg
Author: Kiriwattuduwa
License: CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)

## hiddenGems / madulsima / image

Page: Home and associated detail/index page
Section: hiddenGems
Displayed Name: Madulsima Mini World’s End
Current Image (before): https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Mountain_Views_at_Madulsima.jpg/1280px-Mountain_Views_at_Madulsima.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Mountain_Views_at_Madulsima.jpg
Author: SiddharthSL
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## hiddenGems / kudumbigala / image

Page: Home and associated detail/index page
Section: hiddenGems
Displayed Name: Kudumbigala Monastery
Current Image (before): https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Kumana_National_Park_(Kudumbigala_Sanctuary).JPG/1280px-Kumana_National_Park_(Kudumbigala_Sanctuary).JPG
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Kumana_National_Park_(Kudumbigala_Sanctuary).JPG
Author: AntanO
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## hiddenGems / kalpitiya / image

Page: Home and associated detail/index page
Section: hiddenGems
Displayed Name: Kalpitiya Peninsula
Current Image (before): https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Kalpitiya_Beach.jpg/1280px-Kalpitiya_Beach.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Kalpitiya_Beach.jpg
Author: Raiyans
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## photoStories / p1 / image

Page: Home and associated detail/index page
Section: photoStories
Displayed Name: Highland Mist & Blue Trains
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Nine-Arch_Bridge_in_Sri_Lanka.jpg/1280px-Nine-Arch_Bridge_in_Sri_Lanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Nine-Arch_Bridge_in_Sri_Lanka.jpg
Author: Ravindu Thaksara
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## photoStories / p2 / image

Page: Home and associated detail/index page
Section: photoStories
Displayed Name: The Golden Lion Rock
Current Image (before): https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg
Author: Chamixth
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## photoStories / p3 / image

Page: Home and associated detail/index page
Section: photoStories
Displayed Name: South Coast Sunset Glow
Current Image (before): https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg/1280px-Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg
Author: Alexey Komarov
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## photoStories / p4 / image

Page: Home and associated detail/index page
Section: photoStories
Displayed Name: Jungle Monarch
Current Image (before): https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sri_Lankan_Leopard_yala.jpg/1280px-Sri_Lankan_Leopard_yala.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sri_Lankan_Leopard_yala.jpg
Author: Sathsara Panchali
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## photoStories / p5 / image

Page: Home and associated detail/index page
Section: photoStories
Displayed Name: Colonial Ramparts at Dusk
Current Image (before): https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Galle_Fort_Lighthouse.jpg/1280px-Galle_Fort_Lighthouse.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Galle_Fort_Lighthouse.jpg
Author: Rovin Shanila
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## photoStories / p6 / image

Page: Home and associated detail/index page
Section: photoStories
Displayed Name: Emerald Tea Pluckers
Current Image (before): https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Nuwara_Eliya_Tea.jpg/1280px-Nuwara_Eliya_Tea.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Nuwara_Eliya_Tea.jpg
Author: Curved.kiwix
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## photoStories / p7 / image

Page: Home and associated detail/index page
Section: photoStories
Displayed Name: Stilt Fishermen at Dawn
Current Image (before): https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg/1280px-Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg
Author: Marlene Landu
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## photoStories / p8 / image

Page: Home and associated detail/index page
Section: photoStories
Displayed Name: Northern Temple Glow
Current Image (before): https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=800
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Full_view_of_nallur_front.JPG/1280px-Full_view_of_nallur_front.JPG
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Full_view_of_nallur_front.JPG
Author: Aathavan jaffna
License: CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)

## heroSlides / ella-highlands / image

Page: Home and associated detail/index page
Section: heroSlides
Displayed Name: Ella Central Highlands
Current Image (before): https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=2000
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1280px-The_Nine_Arches_Bridge.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg
Author: MichaelJames2468
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## heroSlides / sigiriya-citadel / image

Page: Home and associated detail/index page
Section: heroSlides
Displayed Name: Sigiriya Ancient Rock Citadel
Current Image (before): https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=2000
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sigiriya_Rock_fortress.jpg/1280px-Sigiriya_Rock_fortress.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg
Author: Chamixth
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## heroSlides / mirissa-shoreline / image

Page: Home and associated detail/index page
Section: heroSlides
Displayed Name: Mirissa Palm Shoreline
Current Image (before): https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000
Does Image Match Name?: Source metadata matches the named location/theme; rendered comparison pending
Loading Correctly?: NEEDS MANUAL VERIFICATION
Quality: 1280px derivative with original retry; actual sharpness not visually tested
Crop: object-fit cover; subject review pending
Mobile Crop: NEEDS MANUAL VERIFICATION
Action Taken: Guarded correction only if the original seed URL matches; owner edits preserved
Replacement: https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg/1280px-Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg
Object Position: 50% 50%
Aspect Ratio: Component family controls ratio; no stretching
Status: NEEDS MANUAL VERIFICATION
Source: https://commons.wikimedia.org/wiki/File:Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg
Author: Alexey Komarov
License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## Hardcoded section photography

Intro main: Nuwara Eliya tea estates; intro secondary and final CTA: Mirissa sunset. Replaced unrelated stock URLs with shared credited photographs. Source metadata matches section content; loading, responsive crop and overlay readability NEEDS MANUAL VERIFICATION.

## Complete credited source registry

| Subject key | Photograph | Author | License | Source |
|---|---|---|---|---|
| ella | The Nine Arches Bridge.jpg | MichaelJames2468 | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg) |
| sigiriya | Sigiriya Rock fortress.jpg | Chamixth | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg) |
| galle | Galle Fort Lighthouse.jpg | Rovin Shanila | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Galle_Fort_Lighthouse.jpg) |
| mirissa | Mirissa beach, Srilanka.jpg | Abishek Palraj | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Mirissa_beach%2C_Srilanka.jpg) |
| kandy | Kandy Lake and the Temple of the Sacred Tooth Relic, Kandy.jpg | Niranjan Ramamurthy | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Kandy_Lake_and_the_Temple_of_the_Sacred_Tooth_Relic%2C_Kandy.jpg) |
| yala | Sri Lankan Leopard yala.jpg | Sathsara Panchali | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Sri_Lankan_Leopard_yala.jpg) |
| nuwara-eliya | Tea-plantation Nuwara Eliya-2567.jpg | Bergentroll | CC0 1.0 | [Source](https://commons.wikimedia.org/wiki/File:Tea-plantation_Nuwara_Eliya-2567.jpg) |
| anuradhapura | Ruwanwelisaya Anuradhapura Sri Lanka 1.jpg | Philip Nalangan | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Ruwanwelisaya_Anuradhapura_Sri_Lanka_1.jpg) |
| polonnaruwa | Gal Viharaya.jpg | Dumidu Madhushan Senanayake | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Gal_Viharaya.jpg) |
| udawalawe | Udawalawe Elephants Sri Lanka.jpg | Sanduweragoda | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Udawalawe_Elephants_Sri_Lanka.jpg) |
| horton-plains | Horton plains landscape.jpg | Malsha Nanayakkara | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Horton_plains_landscape.jpg) |
| weligama | Weligama beach (4).jpg | PIERRE ANDRE LECLERCQ | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Weligama_beach_(4).jpg) |
| dambulla | Dambulla Cave temple.jpg | Kaushiru90 | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Dambulla_Cave_temple.jpg) |
| knuckles | Knuckles Mountain Range.jpg | Kalindu Kasun | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Knuckles_Mountain_Range.jpg) |
| bentota | Bentota beach in evening.jpg | Rambukwelladk | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Bentota_beach_in_evening.jpg) |
| haputale | Haputale.jpg | Bajil1030 | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Haputale.jpg) |
| riverston | Riverston.jpg | Sankaindranath | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Riverston.jpg) |
| gal-oya | Lake in the jungle.jpg | SandaniWijerathne | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Lake_in_the_jungle.jpg) |
| delft-island | Horses of Delft.jpg | Gajapera | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Horses_of_Delft.jpg) |
| bambarakanda | Bambarakanda Waterfall.jpg | Kiriwattuduwa | CC BY-SA 3.0 | [Source](https://commons.wikimedia.org/wiki/File:Bambarakanda_Waterfall.jpg) |
| kudumbigala | Kumana National Park (Kudumbigala Sanctuary).JPG | AntanO | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Kumana_National_Park_(Kudumbigala_Sanctuary).JPG) |
| kalpitiya | Kalpitiya Beach.jpg | Raiyans | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Kalpitiya_Beach.jpg) |
| tea-workers | Nuwara Eliya Tea.jpg | Curved.kiwix | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Nuwara_Eliya_Tea.jpg) |
| fishermen | Stilt fishing men in Sri Lanka, Ahangama region.jpg | Marlene Landu | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Stilt_fishing_men_in_Sri_Lanka%2C_Ahangama_region.jpg) |
| food | Sri Lankan Rice and Curry.jpg | Lankan Foodie | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Sri_Lankan_Rice_and_Curry.jpg) |
| trincomalee | Trincomalee town beach.jpg | C. Lalinshan | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Trincomalee_town_beach.jpg) |
| jaffna | Full view of nallur front.JPG | Aathavan jaffna | CC BY-SA 3.0 | [Source](https://commons.wikimedia.org/wiki/File:Full_view_of_nallur_front.JPG) |
| arugam-bay | Arugam Bay.jpg | Nandun Narayana | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Arugam_Bay.jpg) |
| train | Nine-Arch Bridge in Sri Lanka.jpg | Ravindu Thaksara | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Nine-Arch_Bridge_in_Sri_Lanka.jpg) |
| mirissa-sunset | Sunset in Mirissa 5 March 2023, Sri Lanka.jpg | Alexey Komarov | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg) |
| colombo | A view of Colombo's skyline from the Lotus Tower.jpg | Thilina Alagiyawanna | CC0 1.0 | [Source](https://commons.wikimedia.org/wiki/File:A_view_of_Colombo%27s_skyline_from_the_Lotus_Tower.jpg) |
| madulsima | Mountain Views at Madulsima.jpg | SiddharthSL | CC BY-SA 4.0 | [Source](https://commons.wikimedia.org/wiki/File:Mountain_Views_at_Madulsima.jpg) |

Evidence: image-inventory-before-quality-pass.json preserves the original 70 references; image-inventory.json lists the current 68 stored references. images:audit validates allowed origins, not HTTP loading or geographic truth. 58 primary images and two galleries corrected by migration 0010. All 20 destinations, four tours, six experience categories and four featured experiences are mapped. Seven hidden gems are corrected; Belilena is the remaining unresolved named image. Tour names, prices, durations and itineraries were not changed.
