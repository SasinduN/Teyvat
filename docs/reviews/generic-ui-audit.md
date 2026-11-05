# Generic and template patterns on the public site

Audit for `design/less-generic`, 5 November 2026, read from the components on
`main` at `39fbe43`. Each row gives the page, the section, the pattern and the
fix. The redesign follows this list. Anything left as it was is listed at the
end, with the reason.

**What the design guide was used for.** UI UX Pro Max's rules on contrast, touch
targets, reserved image space, one icon set and reduced motion all apply. Three of
its suggestions don't, and were rejected: Libre Bodoni (the site is DM Sans), a pink
accent (the site uses its own tokens) and a motion-led style (this brief is a calm,
photo-led one).

**21st.dev Magic.** The MCP server failed to connect (not authenticated), so nothing
here started from it. No key is in the repo.

## 1. Icon-in-a-rounded-square cards

| Page | Section | Pattern | Fix |
|---|---|---|---|
| `/about` | "Travel With A Clearer View" (`WhyTravelEye`) | Four equal cards, each a 56 px rounded square holding an icon | A numbered list with hairlines, no icons, beside a photo |
| Every detail page | `PlanCard` | A dark panel with a blurred glow and a pill | A flat panel: the heading, one line, the buttons |
| `/tours/:slug` | Itinerary | A rounded "D1" square on each day | "Day 1" as a plain label, one list with hairlines |

## 2. Stat cards with icon bubbles

| Page | Section | Pattern | Fix |
|---|---|---|---|
| `/about` | `IntroSection` | Four cards with a round icon bubble and a number counting up | `StatStrip`: plain numbers and labels between two hairlines, with no animation, from Admin → Settings |

**The numbers were unsourced and two were wrong.** See section 8.

## 3. Decorative sparkle and star icons

| Page | Section | Pattern | Fix |
|---|---|---|---|
| `/about` | `IntroSection` | `Sparkles` beside "National Parks" | Gone with the cards |
| `/experiences` | `FeaturedExperiences` | `Sparkles` before the category; a gold `Star` badge on every photo | Plain text; no badge |
| `/destinations/:slug` | Heading | `Sparkles` before "Must-Do Experiences" | Removed |
| `/destinations/:slug`, `/experiences/:slug` | `PageHero` chips | Gold `Star` beside the rating | Plain "Rated 4.8" |
| `/destinations`, home | `DestinationRevealCard` | Star rating badge on the photo | Removed from cards |
| `/explore` | Hidden gem dialog, map panel | `Sparkles` beside "Secret Uncrowded Destination" and "Top Experiences" | Removed |
| `/explore`, `/plan` | `QuickSearch`, `TravelPlanner` | `Sparkles`, `MapPin`, `Calendar` beside form labels | Removed: the labels already say it |
| Home, 404 | Buttons | `Compass`, `MapPin` inside buttons | Removed: the words say where they go |
| Lists | `CheckCircle2` before every list item | Removed: a list is already a list |

**One icon set, one size:** lucide only, 18 px, for controls and contact details.

**Ratings have no source.** The 4.x numbers are seeded, not reviews. Cards no longer
show them. Detail pages keep the plain number for now. See "Questions" below.

## 4. Glass used everywhere

| Page | Section | Pattern | Fix |
|---|---|---|---|
| `/plan` | "Let us take care of the details" | `glass--strong glass--3d` on a plain background | Plain split, no panel |
| `/plan` | `TravelPlanner` form | `backdrop-blur-xl` on a dark section | A solid raised surface |
| `/explore` | `QuickSearch` | Dark glass on the page | Solid dark surface |
| Every page | `ScrollToTop` | Glass over page content | Solid dark surface |
| Destination list cards | `DestinationSpotlightCard` | A 3D glass caption | Caption under the photo |
| `/explore` | Gem badges | `backdrop-blur-md` | Plain text |

**Glass stays on** the header, the map panels and overlays on photos (the modal close
buttons on a photo).

## 5. Every section built the same way

| Page | Section | Pattern | Fix |
|---|---|---|---|
| Everywhere | `SectionHead` | A pill eyebrow, a big heading, then a grid | A heading and one line. The pill is gone |
| Home | `DestinationSpotlight` | Four equal cards | Asymmetric: one large, three smaller |
| Home | (nothing) | Only hero, cards, a CTA panel | Adds a full-width photo band, a plain list of tours and a split photo and text |
| `/about` | `IntroSection`, `WhyTravelEye`, Contact | Three stacked card grids | Split photo and text, the strip, a numbered list, a plain contact list |
| `/experiences` | `FeaturedExperiences` | Equal two-column cards | One lead split, then simple rows |
| `/experiences` | `ExperiencesSection` | Equal cards on a dotted background | An asymmetric photo grid, captions under the photos |
| `/tours` | `ToursSection` | Equal cards with badges over photos | Alternating split rows |
| `/destinations/:slug` | Facts, experiences, highlights | Boxes and pills | A plain facts strip and simple lists |
| `/journal`, home | `JournalSection`, `ArticleCard` | Six equal cards, each with a pill and an avatar | One lead story, then rows |
| Detail pages | `TourCard`, `ExperienceCard`, `DestinationCard` | Photo with badges, shadow and hover lift | Photo and caption, no shadow, no lift |
| Every card | framer-motion fade-up on scroll | The same entrance on everything | Removed from these sections |
| `/about` | Overlapping second photo with a white border | A template collage | One photo |

## 6. Generic copy

**In code** (changed here):

| Where | Was | Now |
|---|---|---|
| Hero | "Discover hidden places, timeless culture, wild adventures and unforgettable moments across the island." | "Tea country, ancient cities, leopards and surf, all on one island." |
| Home | "Misty highlands, ancient citadels, coastal forts and tropical shores. Find your own way into the island." | Short, specific lines |
| `/about` | "Curated for Travelers Who Seek Genuine Connection", "The Travel Eye Identity", "One Island. A Thousand Stories." | Plain headings |
| Footer | "Travel Eye is Sri Lanka's premier travel discovery and experience platform. Dedicated to showcasing the island's authentic heritage, wild landscapes, and luxury sanctuaries." | A plain sentence, no brand string |
| Footer | "Contact Travel Eye", "Travel Eye Dispatch", "secret island guides" | "Contact", "Newsletter", plain |
| Headings | "Experiences You'll Remember", "Your Journey. Your Way.", "Start Somewhere Beautiful", "Unforgettable Moments" | Plain |
| `/explore` | "For curious wanderers seeking untouched horizons", "Discover Secret Spot", "Why Travel Eye Recommends It", "Secret Uncrowded Destination" | Plain |
| Filters | "Hidden Gems" as a label | "Off the path". The stored category keeps its name |
| `shared/page-meta.ts` | "Discover hidden places, timeless culture…", "every place we know and love" | Plain |

**In the database** (seed text, migration 0021, only where a row still holds the exact
seed text, so nothing an admin wrote is overwritten): ten destinations, one experience,
two experience categories, one hero slide, four tours, two journal entries, two hidden
gems and all four pillars. They said "nestled", "breathtaking", "paradise", "vibrant",
"curated", "timeless", "pristine" and "magical", and some used em dashes. Three also
said "2,500 years", which has no source (section 8).

## 7. Left as it is, on purpose

| What | Why |
|---|---|
| Hero heading "See Sri Lanka Through a Different Eye" | The tagline, tied to the undecided brand; a test pins it |
| The reveal behaviour of the destination card | Approved in the friend import (#33), and tests pin it. The grid around it changes |
| `Navbar`, `SearchModal`, `InquiryModal`, `InquiryForm` | Not generic; their icons are controls or field markers. Their pixel baselines stay |
| Map markers and legend icons | They carry meaning: each stands for a category |
| Booking pages | Behind `BOOKINGS_ENABLED`, and on the backlog separately |
| `InquiryForm` and the booking pages' icons and "Travel Eye" strings | Pixel-pinned or behind the flag; for their own PRs |
| Admin | Out of scope, apart from the stats editor |
| Journal article bodies, apart from the em dashes found | Long-form writing, for the owner to edit |

## 8. Stats, fact-checked

| Stat | Was | Now | Source | Status |
|---|---|---|---|---|
| UNESCO World Heritage sites | 8 | **8** (6 cultural, 2 natural) | [UNESCO, Sri Lanka](https://whc.unesco.org/en/statesparties/lk/) | Confirmed from a search result of that page; a direct fetch returned 403 |
| Coastline | 1,300+ km | **1,620 km** | [Coast Conservation Department](https://www.coastal.gov.lk/): "about 1620 km long" | Official figure. Other sources give 1,340 to 1,920 km, depending on how bays and islands are counted |
| Years of history | 2,500+ | **2,200+** | [UNESCO, Anuradhapura](https://whc.unesco.org/en/list/200/): a cutting of the Buddha's fig tree brought in the 3rd century B.C. | Supported, and worded as exactly that. 2,500 had no source |
| National parks | 26 | **Left out** | [DWC, Protected Areas](https://www.dwc.gov.lk/?page_id=72) | **Uncertain.** The page says "Twenty Eight (25) National Parks" and "National Park – 25". Wikipedia says 26 |

The strip is editable, so the fourth stat is one row in Admin → Settings once the
number is settled.

## Questions for Sasindu

1. **National parks:** 25, 26 or 28? The Department's own page disagrees with itself.
2. **Ratings:** the 4.x numbers have no source. Remove them from detail pages too, until
   TripAdvisor reviews are in?
3. **"A travel designer will reply within 12 hours":** kept from the old copy. Is it true?
