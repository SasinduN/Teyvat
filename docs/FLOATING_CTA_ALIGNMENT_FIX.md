# Floating CTA alignment fix - 2026-10-12

## Root cause and scope

The owner reported overlap with Discover Experience and destination cards. Two independent fixed controls and a booking offset assuming a 56px chat slot created fragile alignment. More importantly, collision checks only recognized map zoom and manually marked keep-clear elements. Card information/actions and ordinary form/navigation controls were not protected. The prior audit sampled page tops rather than scrolling through cards. This follow-up supersedes that limited evidence for floating placement (BUG-068).

Public UI changes were explicitly called out before editing. No destination/experience/card layout, CMS data, images, SEO, booking backend or route changes.

## Shared structure

PublicLayout renders exactly one FloatingActions section. A fixed `.te-floating-actions` flex column contains the existing FloatingBookingCTA and conditional WhatsAppButton. Children are positioned relative to that stack; no independent viewport offsets remain. Booking remains a SiteLink to `paths.booking` (/booking); chat retains its exact context-aware external URL, target and rel. No configured WhatsApp number means no chat instance. Booking is unmounted on /booking, including query/trailing slash, and when the existing server bookings feature flag is disabled. GitHub main modal-focus, scroll-restoration, booking form/API and security behavior remain intact.

Shared stack: z-index 45 below navigation/dialogs; 12px gap; common right edge at 16px mobile, 20px tablet, 24px wide desktop; bottom and right safe areas. Booking height/minimum icon width 48px, chat 56px. Content-based text width with compact 12px horizontal padding. Hidden controls retain their flex slots, so chat never jumps upward and the overlay never occupies document flow. Container gaps pass through pointer events; active child links remain pointer-interactive. Hidden links use visibility/inert/tabIndex/aria-hidden rather than pointer-event disabling.

## Predictable responsive states

Below 640px: car icon only with destination-specific accessible name. From 640px: car and Book Now. From 1280px: car, Book Your Ride and arrow. Near a card in the bottom-right footprint: compact icon regardless of width. A compact state cannot solve every collision, so actual intersecting controls temporarily hide. No repositioning or scaling, no universal page padding.

## Collision and focus policy

One IntersectionObserver maintains nearby targets; one ResizeObserver and requestAnimationFrame-coalesced scroll/resize/focus/transition/visual-viewport listeners recheck geometry. MutationObserver refreshes targets on content insertion/removal and schedules checks for reveal/style changes. Whole `.te-card`, `.destination-card` and `.home-destination-card` boxes protect photographs, rating/name, description, toggle and action together. Header, main links/buttons/fields/tab targets, global form controls, footer, Leaflet controls, data-keep-clear, dialogs, and marked cookie/chat/sticky containers are protected. This applies across public routes and dynamically loaded detail content.

Collision hides immediately; ordinary controls use 8px approach/16px restore clearance plus 200ms settling. Cards are protected even before their entry fade becomes visible, using 40px approach/48px restore clearance to cover the existing 30px entry motion and prevent late overlap. A focused floating link moves focus to a protected actionable target, or the modal/main focus target before it becomes inert. If a disabled/nonfocusable target cannot accept focus, the fallback is used. A real modal hides both actions. No focus trap or duplicate screen-reader booking control.

No actual cookie banner, external chat widget or public sticky footer exists in this codebase; browser-only fixtures test marked integration regions. Future added UI must use these markers or join the protected selector list. Physical keyboard/safe-area/browser differences still require manual acceptance; this is not a whole-site WCAG certification.

## Theme and animation

Existing light Emerald/White and dark Mint/Forest tokens retained; Sky Blue focus outline and forced-color fallback. Uses the current GitHub theme button-primary background/text/hover tokens and palette-sky focus token; contrast is checked in the PR browser tests. One 600ms 3px entrance, 1px hover lift; compact padding transitions. Hide is immediate to avoid click-through collisions, restoration uses the settle delay without a fade that would leave an obstructing link active. Reduced motion disables motion/transition; no new dependencies/scripts.

## Files and verification

Changed src/components/FloatingActions.tsx (new), FloatingBookingCTA.tsx, WhatsAppButton.tsx, src/pages/PublicLayout.tsx, src/styles/floating-booking.css. Audit: server/test/browser-floating-booking.test.ts and browser-whatsapp.test.ts. Parent-workspace rendered audit remains historical evidence; exact PR-branch regression results are recorded separately in FINAL_QA.md. Final executed results and limits are in FINAL_QA.md and RESPONSIVE_AUDIT.md.

The earlier parent-workspace 200% Chrome zoom audit used a separate disposable profile's partition zoom setting, with actual devicePixelRatio/viewport verification; it does not change the user's browser profile. Preference structure checked against [Chromium's zoom implementation](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc).
