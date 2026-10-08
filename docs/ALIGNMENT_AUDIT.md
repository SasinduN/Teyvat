# Travel Eye complete alignment audit

2026-10-06. Static route/component inspection and markup regressions are distinct from rendered acceptance. No geometry PASS is claimed when Chrome is unavailable. See the latest browser log and qa-results/responsive-checks.json.

## Root causes and shared architecture

- Inner hero last-child width:100% defeated the te-container width, producing different hero edges from navigation/content. Removed.
- Fixed vh/Tailwind height classes, percentage child height and duplicate hero CSS competed. Replaced with content-driven minimum heights and section-owned padding.
- Article and 404 wrappers used separate centered max-width/gutter formulas. Replaced with the global container; readable article measure remains an inner left-aligned column.
- Centered homepage section headings and final CTA introduced another visual axis. They now use the same left grid and shared section-header/CTA classes.
- Navbar scroll states used different vertical padding. Header height/border geometry is now constant, with color/blur changes only.
- Intro text added a second md:pl-6 indentation. Removed in favor of the grid gap.

## Reusable rules

Container max: 80rem (1280px). Gutter: clamp(1rem, 3vw, 2.5rem). Header height: 5.5rem, 5rem below 640px. Reading column: 46rem, headline: 55rem. Section space: clamp(3.5rem, 7vw, 6rem). Shared grid gap: clamp(1.25rem, 2.5vw, 2rem).

Home hero: clamp(42rem, 95svh, 56rem) minimum; compact hero: clamp(24rem, 48svh, 32rem); detail hero: clamp(30rem, 65svh, 44rem). Every hero grows when its content needs space. Top padding accounts for the header token. Backgrounds remain full bleed; text remains container-bound.

Theme selectors change colors only; all structural tokens/rules are outside theme selectors. Header buttons keep constant dimensions. Paired bounding-rectangle checks were added to the browser audit; actual no-shift acceptance is pending browser execution.

Intentional exceptions: reading columns are narrower inside the global grid; modal/login forms are compact centered interfaces; admin content is constrained within its sidebar shell; card overlays/markers/cursor are legitimately absolute. None of those require primary page layout positioning hacks. No overflow-x:hidden mask was added.

## Route checklist

### /

Page: Home / hash section
Route: /
Hero: Cinematic homepage variant; hash navigation targets a real section
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /#explore-map

Page: Home / hash section
Route: /#explore-map
Hero: Cinematic homepage variant; hash navigation targets a real section
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations

Page: Public page / route target
Route: /destinations
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /experiences

Page: Public page / route target
Route: /experiences
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /tours

Page: Public page / route target
Route: /tours
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /about

Page: Public page / route target
Route: /about
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /about#contact

Page: Public page / route target
Route: /about#contact
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /#planner

Page: Home / hash section
Route: /#planner
Hero: Cinematic homepage variant; hash navigation targets a real section
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /#journal

Page: Home / hash section
Route: /#journal
Hero: Cinematic homepage variant; hash navigation targets a real section
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /photo-credits

Page: Public page / route target
Route: /photo-credits
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations?category=Wildlife

Page: Public page / route target
Route: /destinations?category=Wildlife
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/ella

Page: Public page / route target
Route: /destinations/ella
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/sigiriya

Page: Public page / route target
Route: /destinations/sigiriya
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/galle

Page: Public page / route target
Route: /destinations/galle
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/mirissa

Page: Public page / route target
Route: /destinations/mirissa
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/kandy

Page: Public page / route target
Route: /destinations/kandy
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/jaffna

Page: Public page / route target
Route: /destinations/jaffna
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/yala

Page: Public page / route target
Route: /destinations/yala
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/nuwara-eliya

Page: Public page / route target
Route: /destinations/nuwara-eliya
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/arugam-bay

Page: Public page / route target
Route: /destinations/arugam-bay
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/trincomalee

Page: Public page / route target
Route: /destinations/trincomalee
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/anuradhapura

Page: Public page / route target
Route: /destinations/anuradhapura
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/polonnaruwa

Page: Public page / route target
Route: /destinations/polonnaruwa
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/udawalawe

Page: Public page / route target
Route: /destinations/udawalawe
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/horton-plains

Page: Public page / route target
Route: /destinations/horton-plains
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/weligama

Page: Public page / route target
Route: /destinations/weligama
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/dambulla

Page: Public page / route target
Route: /destinations/dambulla
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/colombo

Page: Public page / route target
Route: /destinations/colombo
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/knuckles

Page: Public page / route target
Route: /destinations/knuckles
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/bentota

Page: Public page / route target
Route: /destinations/bentota
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/haputale

Page: Public page / route target
Route: /destinations/haputale
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /experiences/sunrise-ella

Page: Public page / route target
Route: /experiences/sunrise-ella
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /experiences/safari-yala

Page: Public page / route target
Route: /experiences/safari-yala
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /experiences/sunset-mirissa

Page: Public page / route target
Route: /experiences/sunset-mirissa
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /experiences/walk-galle-fort

Page: Public page / route target
Route: /experiences/walk-galle-fort
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /tours/island-in-7-days

Page: Public page / route target
Route: /tours/island-in-7-days
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /tours/cultural-sri-lanka

Page: Public page / route target
Route: /tours/cultural-sri-lanka
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /tours/wild-sri-lanka

Page: Public page / route target
Route: /tours/wild-sri-lanka
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /tours/southern-escape

Page: Public page / route target
Route: /tours/southern-escape
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /journal/sunrise-locations-sri-lanka

Page: Public page / route target
Route: /journal/sunrise-locations-sri-lanka
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /journal/ultimate-ella-guide

Page: Public page / route target
Route: /journal/ultimate-ella-guide
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /journal/best-beaches-sri-lanka

Page: Public page / route target
Route: /journal/best-beaches-sri-lanka
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /journal/guide-sri-lankan-food

Page: Public page / route target
Route: /journal/guide-sri-lankan-food
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /journal/wildlife-safaris-where-to-go

Page: Public page / route target
Route: /journal/wildlife-safaris-where-to-go
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /journal/hidden-gems-visit

Page: Public page / route target
Route: /journal/hidden-gems-visit
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin

Page: Admin
Route: /admin
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/login

Page: Admin
Route: /admin/login
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/inquiries

Page: Admin
Route: /admin/inquiries
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/media

Page: Admin
Route: /admin/media
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/settings

Page: Admin
Route: /admin/settings
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations

Page: Admin
Route: /admin/destinations
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/new

Page: Admin
Route: /admin/destinations/new
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/experience-categories

Page: Admin
Route: /admin/experience-categories
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/experience-categories/new

Page: Admin
Route: /admin/experience-categories/new
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/featured-experiences

Page: Admin
Route: /admin/featured-experiences
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/featured-experiences/new

Page: Admin
Route: /admin/featured-experiences/new
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/tours

Page: Admin
Route: /admin/tours
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/tours/new

Page: Admin
Route: /admin/tours/new
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/articles

Page: Admin
Route: /admin/articles
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/articles/new

Page: Admin
Route: /admin/articles/new
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems

Page: Admin
Route: /admin/hidden-gems
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems/new

Page: Admin
Route: /admin/hidden-gems/new
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories

Page: Admin
Route: /admin/photo-stories
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories/new

Page: Admin
Route: /admin/photo-stories/new
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hero-slides

Page: Admin
Route: /admin/hero-slides
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hero-slides/new

Page: Admin
Route: /admin/hero-slides/new
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/pillars

Page: Admin
Route: /admin/pillars
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/pillars/new

Page: Admin
Route: /admin/pillars/new
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/ella

Page: Admin
Route: /admin/destinations/ella
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/sigiriya

Page: Admin
Route: /admin/destinations/sigiriya
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/galle

Page: Admin
Route: /admin/destinations/galle
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/mirissa

Page: Admin
Route: /admin/destinations/mirissa
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/kandy

Page: Admin
Route: /admin/destinations/kandy
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/jaffna

Page: Admin
Route: /admin/destinations/jaffna
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/yala

Page: Admin
Route: /admin/destinations/yala
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/nuwara-eliya

Page: Admin
Route: /admin/destinations/nuwara-eliya
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/arugam-bay

Page: Admin
Route: /admin/destinations/arugam-bay
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/trincomalee

Page: Admin
Route: /admin/destinations/trincomalee
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/anuradhapura

Page: Admin
Route: /admin/destinations/anuradhapura
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/polonnaruwa

Page: Admin
Route: /admin/destinations/polonnaruwa
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/udawalawe

Page: Admin
Route: /admin/destinations/udawalawe
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/horton-plains

Page: Admin
Route: /admin/destinations/horton-plains
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/weligama

Page: Admin
Route: /admin/destinations/weligama
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/dambulla

Page: Admin
Route: /admin/destinations/dambulla
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/colombo

Page: Admin
Route: /admin/destinations/colombo
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/knuckles

Page: Admin
Route: /admin/destinations/knuckles
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/bentota

Page: Admin
Route: /admin/destinations/bentota
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/destinations/haputale

Page: Admin
Route: /admin/destinations/haputale
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/experience-categories/beach-escapes

Page: Admin
Route: /admin/experience-categories/beach-escapes
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/experience-categories/wild-sri-lanka

Page: Admin
Route: /admin/experience-categories/wild-sri-lanka
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/experience-categories/ancient-sri-lanka

Page: Admin
Route: /admin/experience-categories/ancient-sri-lanka
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/experience-categories/mountain-adventures

Page: Admin
Route: /admin/experience-categories/mountain-adventures
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/experience-categories/food-and-culture

Page: Admin
Route: /admin/experience-categories/food-and-culture
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/experience-categories/hidden-sri-lanka

Page: Admin
Route: /admin/experience-categories/hidden-sri-lanka
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/featured-experiences/sunrise-ella

Page: Admin
Route: /admin/featured-experiences/sunrise-ella
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/featured-experiences/safari-yala

Page: Admin
Route: /admin/featured-experiences/safari-yala
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/featured-experiences/sunset-mirissa

Page: Admin
Route: /admin/featured-experiences/sunset-mirissa
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/featured-experiences/walk-galle-fort

Page: Admin
Route: /admin/featured-experiences/walk-galle-fort
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/tours/island-in-7-days

Page: Admin
Route: /admin/tours/island-in-7-days
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/tours/cultural-sri-lanka

Page: Admin
Route: /admin/tours/cultural-sri-lanka
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/tours/wild-sri-lanka

Page: Admin
Route: /admin/tours/wild-sri-lanka
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/tours/southern-escape

Page: Admin
Route: /admin/tours/southern-escape
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/articles/sunrise-locations-sri-lanka

Page: Admin
Route: /admin/articles/sunrise-locations-sri-lanka
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/articles/ultimate-ella-guide

Page: Admin
Route: /admin/articles/ultimate-ella-guide
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/articles/best-beaches-sri-lanka

Page: Admin
Route: /admin/articles/best-beaches-sri-lanka
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/articles/guide-sri-lankan-food

Page: Admin
Route: /admin/articles/guide-sri-lankan-food
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/articles/wildlife-safaris-where-to-go

Page: Admin
Route: /admin/articles/wildlife-safaris-where-to-go
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/articles/hidden-gems-visit

Page: Admin
Route: /admin/articles/hidden-gems-visit
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems/riverston

Page: Admin
Route: /admin/hidden-gems/riverston
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems/gal-oya

Page: Admin
Route: /admin/hidden-gems/gal-oya
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems/delft-island

Page: Admin
Route: /admin/hidden-gems/delft-island
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems/belilena

Page: Admin
Route: /admin/hidden-gems/belilena
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems/bambarakanda

Page: Admin
Route: /admin/hidden-gems/bambarakanda
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems/madulsima

Page: Admin
Route: /admin/hidden-gems/madulsima
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems/kudumbigala

Page: Admin
Route: /admin/hidden-gems/kudumbigala
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hidden-gems/kalpitiya

Page: Admin
Route: /admin/hidden-gems/kalpitiya
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories/p1

Page: Admin
Route: /admin/photo-stories/p1
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories/p2

Page: Admin
Route: /admin/photo-stories/p2
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories/p3

Page: Admin
Route: /admin/photo-stories/p3
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories/p4

Page: Admin
Route: /admin/photo-stories/p4
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories/p5

Page: Admin
Route: /admin/photo-stories/p5
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories/p6

Page: Admin
Route: /admin/photo-stories/p6
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories/p7

Page: Admin
Route: /admin/photo-stories/p7
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/photo-stories/p8

Page: Admin
Route: /admin/photo-stories/p8
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hero-slides/ella-highlands

Page: Admin
Route: /admin/hero-slides/ella-highlands
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hero-slides/sigiriya-citadel

Page: Admin
Route: /admin/hero-slides/sigiriya-citadel
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/hero-slides/mirissa-shoreline

Page: Admin
Route: /admin/hero-slides/mirissa-shoreline
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/pillars/local-knowledge

Page: Admin
Route: /admin/pillars/local-knowledge
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/pillars/authentic-experiences

Page: Admin
Route: /admin/pillars/authentic-experiences
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/pillars/flexible-journeys

Page: Admin
Route: /admin/pillars/flexible-journeys
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/pillars/responsible-travel

Page: Admin
Route: /admin/pillars/responsible-travel
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /missing

Page: Public page / route target
Route: /missing
Hero: Shared detail-height 404 hero
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/missing

Page: Public page / route target
Route: /destinations/missing
Hero: Shared detail-height 404 hero
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /tours/missing

Page: Public page / route target
Route: /tours/missing
Hero: Shared detail-height 404 hero
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /experiences/missing

Page: Public page / route target
Route: /experiences/missing
Hero: Shared detail-height 404 hero
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /journal/missing

Page: Public page / route target
Route: /journal/missing
Hero: Shared detail-height 404 hero
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /?tour=:slug

Page: Public page / route target
Route: /?tour=:slug
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /?destination=:slug

Page: Public page / route target
Route: /?destination=:slug
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /destinations/

Page: Public page / route target
Route: /destinations/
Hero: Shared PageHero compact index/about/credits or detail variant
Navbar: Shared stable-height Navbar; te-container grid
Main Content: te-container; article body keeps bounded reading column on its left edge
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Shared Footer te-container
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

### /admin/unknown

Page: Admin
Route: /admin/unknown
Hero: No marketing hero; shared admin shell or compact login form
Navbar: Admin sidebar/mobile toolbar; token gutters
Main Content: te-container within sidebar shell; login is intentionally compact
Sections: Shared section spacing and left-aligned heading system
Cards: Existing family grid/card layouts retained; consistent shared grid gap and min-width safeguards
Footer: Admin navigation shell; no public marketing footer
Mobile: 320/375/390/430 - NEEDS MANUAL VERIFICATION
Tablet: 768/820/1024 - NEEDS MANUAL VERIFICATION
Desktop: 1280/1440/1920 - NEEDS MANUAL VERIFICATION
Problems Found: Hero/container override, independent heading/reading/CTA axes or shared responsive rules affect this route family.
Changes Made: Applied the reusable rules above through its shared components; route data/copy/functionality unchanged.
Status: NEEDS MANUAL VERIFICATION

## Navigation/action destinations

Navbar and footer use shared/site-paths.ts. Destination, experience, tour and article cards link to their corresponding slug route. Explore and Journal navigate to home hashes; Contact to /about#contact. Planner/search results use existing published content and destination/category navigation. Plan/book/inquiry actions open the existing modal rather than inventing a new /plan page. Legacy tour/destination query links and trailing-slash URLs redirect to existing routes. Unknown dynamic slugs use the same aligned 404 system.

Source inspection confirms push/replace navigation resets to the top, POP restores recorded history positions, and hash targets scroll/focus intentionally. Real clicks and Back/Forward behavior still require browser verification.

## Acceptance evidence

Build: PASS (latest alignment production build). Public markup: PASS (four existing checks, expanded to all published dynamic slugs and hash/filter routes). Typecheck: PASS. HTTP routes: see qa-results/route-checks.json. Console, real clicks, geometry, overflow, photography crop, every width and theme shift: NEEDS MANUAL VERIFICATION if Chrome disconnects.

## Expected grid (calculated from tokens, not browser proof)

| Viewport | Content width | Left edge | Actual geometry |
|---|---|---|---|
| 320px | 288.00px | 16.00px | NEEDS MANUAL VERIFICATION |
| 375px | 343.00px | 16.00px | NEEDS MANUAL VERIFICATION |
| 390px | 358.00px | 16.00px | NEEDS MANUAL VERIFICATION |
| 430px | 398.00px | 16.00px | NEEDS MANUAL VERIFICATION |
| 768px | 721.92px | 23.04px | NEEDS MANUAL VERIFICATION |
| 820px | 770.80px | 24.60px | NEEDS MANUAL VERIFICATION |
| 1024px | 962.56px | 30.72px | NEEDS MANUAL VERIFICATION |
| 1280px | 1203.20px | 38.40px | NEEDS MANUAL VERIFICATION |
| 1440px | 1280.00px | 80.00px | NEEDS MANUAL VERIFICATION |
| 1920px | 1280.00px | 320.00px | NEEDS MANUAL VERIFICATION |

The theme-geometry audit temporarily disables reveal transforms/transitions for measurement, so motion does not create false theme-shift failures. It compares headers, containers, titles, CTA controls and inputs/selects/textareas, then restores normal styles. Actual navigation test attempted: browser-routes FAIL due to Chrome disconnection.

Final fresh-process shell/asset/health smoke: PASS at http://localhost:8087. See qa-results/alignment-production-smoke.json. The earlier preview URL now serves the latest alignment build. This HTTP evidence does not prove rendered layout.

## Follow-up - labels below the map

Mobile active-place sheet now gives the destination text its available flex width, uses a smaller phone thumbnail, wraps region/season metadata and puts category badges and the Explore CTA on separate mobile rows. Place names wrap at spaces without hyphenation. Spotlight metadata has a dedicated season line and fluid destination titles. Gold map CTA text is readable in both themes. API destination names were checked intact; visual acceptance remains NEEDS MANUAL VERIFICATION. Tracked as BUG-030.
