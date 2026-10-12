# Public content cleanup — 2026-10-12

The user authorized public markup cleanup and a floating ride link. Reviewed actual React routes, shared section components, metadata, booking constraints and the Green & Pearl/Sky Blue tokens. No database content was deleted or rewritten.

| Route/area | Candidate | Classification and action |
| --- | --- | --- |
| Home `/` | Premium experience label and current-photo caption, dots/wrappers/spacing | Safe to remove: both removed exactly as requested; slideshow metadata, photos and controls preserved. |
| Home planning section | “Made personal. Designed locally.” | Safe to remove: heading and description already communicate this. Removed label. |
| Explore `/explore` | “Find Your Way Around the Island” hero eyebrow | Safe to remove: duplicates Explore heading/description. Removed; search filters, map legend, route controls and hidden-gem information preserved. |
| Destinations `/destinations` | “Places Worth Getting Lost In” eyebrow | Safe to remove: decorative promotional label. Removed. Filters, counts, category labels, region/destination descriptions and detail links preserved. |
| Experiences `/experiences` | Repeated “Unforgettable Moments”, decorative “Tailored Journeys” | Safe to remove: removed hero and section badges. Needs simplification: introductory sentence shortened to Sri Lankan activities, views and local experiences. Actual experience duration/rating/location and category information preserved. |
| Tours `/tours` | Repeated “Signature Itineraries” | Safe to remove: removed page/section promotional labels. Needs simplification: local multi-day journey introduction shortened. Prices, days, routes, package descriptions, inclusions and tour enquiry/booking actions preserved. |
| Ride `/booking`, tour query flow | GPS disclosure, capacity guidance, pending status, callback and form errors | Important to preserve: these prevent incorrect locations, unavailable vehicles and unreachable anonymous requests. No booking fields, backend contracts or form behavior changed. Floating ride link hidden here, including tour query URLs. |
| Journal `/journal` | Promotional hero eyebrow, “Stories & Insights”, “Visual Storytelling” badge | Safe to remove: removed labels while preserving section headings. Needs simplification: introductory marketing sentence shortened. Article dates, reading times, categories, body content, photo titles/captions and modal controls preserved. |
| About `/about` | “Who We Are”, “Welcome to Travel Eye”, “The Travel Eye Difference” | Safe to remove: headings already explain these sections. Removed decorative labels; core introduction, statistics and service pillars preserved. |
| Contact `/about#contact` | “Get in Touch” above “Contact Us” | Safe to remove: redundant label removed. Important to preserve: address, phone, email, WhatsApp, enquiry form guidance, privacy consent and validation. |
| Shared navigation/footer/detail pages | Breadcrumbs, category/region chips, contact links, newsletter/legal/privacy links, photo credits | Important to preserve: retained; metadata/structured data and shared page-title contracts unchanged. |
| About/Contact claims and database content | Numeric statistics, reply-within-12-hours promise, seeded contact details, reviews, prices | Requires review before removal: business factual claims need owner verification. Preserved and flagged here; no invented replacements or silent deletions. |
| Remaining promotional copy | Photo gallery introduction, discovery preview, unique section headings | Important to preserve for context: not every short introduction is redundant. No sections/features removed. |

Modified public files: `HeroSection`, `HomePage`, six index/about page headers, `FeaturedExperiences`, `ExperiencesSection`, `ToursSection`, `JournalSection`, `PhotoStorySection`, `IntroSection`, `WhyTravelEye`, `PublicLayout`, `WhatsAppButton`, `ScrollToTop`, new `FloatingBookingCTA`, `index.css` and new `floating-booking.css`. QA adds `browser-floating-booking.test.ts`. No external script, dependency or asset added.

QA also found two existing defects: cached first-photo readiness could be cleared before Previous used it, and the 320px header clipped its last control. Both fixes are included and tracked as BUG-058/059. Mobile navigation now also protects both floating links from overlap. See `HOMEPAGE_HERO_CLEANUP.md`, `FLOATING_BOOKING_CTA.md` and the current section of `FINAL_QA.md` for implementation/evidence.
