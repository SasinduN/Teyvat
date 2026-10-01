# Plan: WhatsApp chat button

Status: APPROVED as recommended (2026-10-01), with two additions:

- numbers starting `940` are rejected too (decision 3);
- a "Test in WhatsApp" link in admin Settings (see Data).

Note for phase 8: `?tour=` and `?destination=` links must redirect to the
new page URLs, so links already shared over WhatsApp keep working. Recorded
in CLAUDE.md.

A floating round button on the public site that opens
`https://wa.me/<number>?text=<message>`, with the message pre-filled from
what the visitor is looking at. The number is a new `site_settings` field.
While it is empty the button renders nothing, so this can ship before the
number is set.

## Decisions (answered: as recommended)

1. **The page link needs deep links.** The public site is a single page:
   every tour and destination is a modal on `/`, and any other path redirects
   to `/`. So "the page link" today is the home page, which doesn't show the
   person answering what the visitor was looking at.

   **Recommended:** add two query parameters that open the modal on load:

   - `/?tour=<id>` opens that tour's "View Full Journey" modal;
   - `/?destination=<id>` opens that destination's modal.

   Ids are the existing slugs (`island-in-7-days`, `ella`), so the links are
   readable: `https://<site>/?destination=ella`. An unknown or unpublished id
   is ignored. Once the modal opens, the parameter is removed from the
   address bar (`history.replaceState`), so closing the modal and reloading
   doesn't open it again.

   *Alternative:* send the plain site link (`https://<site>/`) and rely on
   the tour or destination name in the message.

2. **What counts as "viewing a tour."** **Recommended:** the tour's detail
   modal is open, **or** its route is on the map *and the map is on screen*.
   If both a destination modal and a tour are active, the destination wins,
   because the modal is on top. Everything else gets the general message.

3. **Number input is forgiving, storage is strict.** **Recommended:** the
   admin field accepts `+94 77 123 4567`, `94-77-123-4567` and similar, and
   strips spaces, dashes, brackets and a leading `+` before validating. It
   always stores digits only. Rules:
   - 8–15 digits (the E.164 maximum);
   - the first digit is not `0`. The error for this says "Start with the
     country code (94 for Sri Lanka), not 0", because `0771234567` is the
     most likely mistake;
   - *(added)* not `940…` (the country code plus the local 0). The error is
     "Remove the 0 after 94".

   The database CHECK enforces the same pattern: `^[1-9][0-9]{7,14}$` or
   NULL.

## Where the button shows, and what it stays clear of

- **Every public page, never the admin.** It is rendered in `PublicSite.tsx`
  only. `/admin/*` doesn't mount it.
- **Bottom right**, 56 px round. On phones it sits 16 px from the edges, on
  desktop 24 px, and it respects `env(safe-area-inset-bottom)`.
- **Over the destination and tour modals it stays visible** (z-index above
  their `z-50`), because that's when the contextual message matters.
- **While the enquiry modal or the search modal is open, it is hidden.** So
  it can never cover the enquiry form's submit button, and a visitor already
  writing an enquiry isn't offered a second channel on top of it.
- **Keep-clear check.** The button fades out (and becomes untappable and
  unfocusable) while its footprint overlaps a keep-clear target. It is
  re-checked on scroll (including scrolling inside a modal), on resize and
  when a modal opens. The targets are:
  - the map's zoom buttons (`.leaflet-control-zoom`, Leaflet's own class);
  - the map's Quick Jump bar;
  - the main button at the foot of the destination modal ("Plan A Trip to
    <name>") and of the tour modal ("Book / Inquire This Tour"). On a phone,
    at the end of a modal's scroll, these full-width buttons reach the
    corner where the WhatsApp button sits.

  The check runs at every width. On desktop between 1024 and 1279 px, the
  map's zoom buttons also reach that corner.
- **The mobile menu** (Navbar's drawer, `z-40`) sits under the button. Its
  bottom is centred text, so nothing is covered. The phone screenshots will
  show it.

## Look

The site's palette, not WhatsApp green:

- `bg-[#1C4737]` (hover `#0F2E23`);
- the WhatsApp glyph in `#F5EFEB`, as an inline SVG path (no icon font, no
  external file);
- a thin `#D4AF37/40` ring and `shadow-lg`, like the map overlays;
- it fades in once the content has loaded.

Its accessible name is "Chat with us on WhatsApp". It opens in a new tab with
`rel="noopener noreferrer"`.

## The link

`src/lib/whatsapp.ts`, which is pure and unit-tested:

```
https://wa.me/<digits>?text=<encodeURIComponent(message)>
```

| Context | Message |
|---|---|
| Tour | `Hi! I'm interested in the <tour title> tour. <origin>/?tour=<id>` |
| Destination | `Hi! I'd like to know more about visiting <name>. <origin>/?destination=<id>` |
| Anywhere else | `Hi! I'd like help planning a trip to Sri Lanka.` |

- `<origin>` is `window.location.origin`.
- Tour titles go in as they are. Two of them already end in a noun ("Wild
  Sri Lanka **Expedition** tour"), and I'm leaving that alone rather than
  inventing rules.
- No third-party script, no widget, no analytics, no tracking parameters. It
  is a plain `<a href>`, so **the CSP is unchanged**: navigation isn't
  governed by `script-src`, `img-src` or `connect-src`, and
  `browser-csp.test.ts` must still report zero violations.

## Changes to frozen files (`src/components/`), called out

| File | Change | Visible? |
|---|---|---|
| **new** `src/components/WhatsAppButton.tsx` | the button | yes, only when a number is set |
| `ToursSection.tsx` | two optional props: `selectedTourId` / `onSelectedTourChange`, so `PublicSite` knows which tour modal is open and can open one from `?tour=`. Same markup and same behaviour when the props are not passed. | no |
| `ToursSection.tsx` | `data-keep-clear` on the "Book / Inquire This Tour" button | no (attribute only) |
| `DestinationModal.tsx` | `data-keep-clear` on its main button | no (attribute only) |
| `InteractiveMapSection.tsx` | `data-keep-clear` on the Quick Jump bar | no (attribute only) |

No `className` or layout changes in existing components.
`git diff demo-baseline -- src/components/` will show exactly the rows above.
With no number set, the page is pixel-identical to today.

`src/pages/PublicSite.tsx` (not frozen) gets:

- the context state;
- the `?tour=` / `?destination=` handling;
- an IntersectionObserver on `#explore-map` for decision 2;
- the button.

## Data

- **Migration `0008_site_settings_whatsapp.sql`:**
  - `add column if not exists whatsapp_number text` (NULL, so "empty");
  - the CHECK from decision 3, added only if missing;
  - re-runnable.
- **Shared types and schema:**
  - `SiteSettingsRow.whatsapp_number: string | null`;
  - a new field type `whatsapp` in `shared/content-schema.ts`. Its Zod schema
    normalises, then validates, and maps empty to NULL.
- **Admin Settings:**
  - the field renders as a text input with `inputMode="tel"`;
  - help text: "International format, digits only, e.g. 94771234567. Leave
    empty to hide the WhatsApp button.";
  - `RecordForm.tsx` gets one `case`;
  - *(added)* beside the field, a small "Test in WhatsApp" link to
    `https://wa.me/<saved number>`, opening in a new tab. It uses the
    **saved** number, not what is being typed, and shows only when a number
    is saved.
- **Public API:** `whatsapp_number` joins `PUBLIC_SITE_SETTINGS_COLUMNS`. The
  number is public by nature: it is in every link.
- **Client:** `SiteSettings.whatsappNumber?: string`, so NULL becomes
  `undefined` and the button is hidden.
- **Tests:** `resetContent()` resets it to NULL.
- **Docs:**
  - `docs/SCHEMA.md`: the 0008 row and the column;
  - `docs/LAUNCH-CHECKLIST.md`: a "set the WhatsApp number in Settings"
    item.

## Tests

- **Unit** (`server/test/whatsapp-link.test.ts`): the exact `href` for the
  tour, destination and general contexts. Names containing `&`, `’`, `#` and
  `?` are encoded. Spaces encode as `%20`, never `+`.
- **API:**
  - `GET /api/content` returns `whatsapp_number: null` by default;
  - a PUT normalises `+94 77-123 4567` to `94771234567`;
  - a PUT rejects `0771234567`, `940771234567` ("Remove the 0 after 94"),
    `94abc`, 7 digits and 16 digits, with a field-level error;
  - the DB CHECK refuses a bad value written directly.
- **Chrome** (`server/test/browser-whatsapp.test.ts`):
  - with the number empty, there is no `a[href^="https://wa.me/"]` on the
    page;
  - with a number set:
    - on load, the general link;
    - open Ella's modal: the destination link;
    - open a tour's modal: the tour link;
    - "View route on map": the tour link, then the general link once the map
      is scrolled away;
  - `/?destination=ella` and `/?tour=island-in-7-days` open their modals,
    and the parameter is removed from the URL;
  - **phone (390×844):**
    - with the map's zoom buttons scrolled into the button's corner, the
      button doesn't overlap them, and `elementFromPoint` at the zoom-in
      button's centre is the zoom-in button;
    - with the enquiry modal open, the button is hidden and the submit
      button is unobstructed;
  - the CSP test still reports zero violations;
  - admin Settings: "Test in WhatsApp" is absent with no saved number, and
    links to `https://wa.me/<saved>` once one is saved.
- **Existing:** `browser-inquiry` (against `faed6bc`) and `verify:roundtrip`
  are unchanged and must pass.

## Screenshots in the PR

Phone and desktop, in `docs/screenshots/whatsapp-*.png`:

- the home page with the button;
- the destination modal;
- the tour modal;
- the map with its zoom buttons at the bottom right (phone);
- the enquiry modal (phone, button hidden);
- the mobile menu (phone);
- the admin Settings field, including an error.

## Checks

`typecheck`, `build`, `npm test`, `verify:roundtrip`. Then push
`whatsapp-button`, open a PR against `main` with the screenshots, and stop
when CI (`checks`) is green.
