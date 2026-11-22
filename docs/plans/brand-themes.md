# Plan: the new logo, three colour themes, and the new font mix

Written 23 Nov 2026 for the advisor's Task 3. **A plan only: nothing is built until it's approved.**
Branch `design/brand-themes`, off `main` after #71.

Decided by Sasindu (not reopened here):
- **The logo:** the client's sun, Sigiriya and elephant.
- **Three colour themes**, chosen only by an admin: **Sunset** (the new default), **Emerald** (today's colours, unchanged) and **Ocean**.
- **The visitor's light/dark button stays**, so each theme needs light and dark values: six sets in all.
- **Fonts:** a script for short accent words, a classic serif for headings, and DM Sans for everything else.

Design method: the UI UX Pro Max skill.
- Its luxury-travel pairing is Playfair Display with a sans body.
- Its script and serif pairing is a script for accents with a readable serif.
- Its rules applied here: 4.5:1 text contrast and 3:1 for edges and large text; light and dark designed together; semantic tokens only; preload only the critical font.

The 21st.dev Magic MCP isn't connected (its API key is missing). Nothing here needs it: the admin picker is built from the admin's existing radio cards.

---

## 1. The logo

### What the files are

- **Wrappers, not vectors.** `logo.svg` and `logo1.svg` (about 710 KB each) are the same thing: a 1024 × 1024 RGB PNG plus a 1024 × 1024 luminance mask, applied with an SVG `<mask>`.
- **The emblem is a clip.** `logo1.svg` draws the same image clipped to its top 771 px, so it shows the emblem without the lettering.
- **Sampled colours:**

| Part | Colour |
|---|---|
| Silhouette and lettering (maroon) | `#3E0612` |
| Disc, top (saffron) | `#E9B431` |
| Disc, middle (orange) | `#F57E11` |
| Disc, bottom (red-orange) | `#E43E2B` |

### Where the files live

- **`design/brand/`** (new, outside `public/`, never shipped):
  - `logo.svg` and `logo1.svg`, exactly as given;
  - `README.md`, saying what they are and how the assets are made.

  The two files add 1.4 MB to the repo's history once.
- **`npm run brand:assets`** (`scripts/brand-assets.ts`) makes every shipped file from the embedded PNG and mask.
  - It's run by hand and its output is committed. The build never runs it.
  - It needs `sharp` as a dev dependency (question 4).
  - `favicon.ico` is written directly: a small header with two PNG images inside, 16 and 32 px. `sharp` can't write ICO.
- **`public/brand/`** gets the generated files. Targets come from trial versions made with Pillow from the real file:

| File | Size (px) | Target | Trial | Notes |
|---|---|---|---|---|
| `emblem-40.webp` / `.png` | 47 × 40 | ≤ 3 KB / ≤ 4 KB | 1.6 / 2.7 KB | the header and footer at 1x |
| `emblem-80.webp` / `.png` | 93 × 80 | ≤ 5 KB / ≤ 8 KB | 3.5 / 6.1 KB | 2x |
| `emblem-120.webp` / `.png` | 140 × 120 | ≤ 8 KB / ≤ 12 KB | 5.6 / 10.3 KB | 3x |
| `favicon.ico` | 16 + 32 | ≤ 4 KB | 2.9 KB | |
| `favicon-32.png` | 32 | ≤ 3 KB | 2.1 KB | |
| `apple-touch-icon.png` | 180 | ≤ 10 KB | 3.8 KB at 128 colours | on the page colour (iOS fills transparency black) |
| `icon-192.png` | 192 | ≤ 12 KB | 5.4 KB at 128 colours | manifest, `any` |
| `icon-512.png` | 512 | ≤ 45 KB | 21.7 KB at 128 colours | manifest, `any` |
| `icon-maskable-512.png` | 512 | ≤ 45 KB | 13.5 KB at 128 colours | manifest, `maskable`; the emblem inside the central 80% circle (82 px padding), on the page colour |
| `email-logo.png` | 240 wide | ≤ 15 KB | 9.2 KB at 128 colours | see question 2 |
| `og-default.jpg` | 1200 × 630 | ≤ 80 KB | 37.5 KB (q85) | the full logo centred on the light page colour |

- **No banding.** At 128 colours the disc's gradient shows bands. The script uses 256 colours with dithering, or lossless where that fits the budget, and the targets above leave room for that. Screenshots in PR A show the 512 icon and the share image at full size.
- **Retired:** today's `favicon.svg` (the "SL" square). `BRAND_ASSETS` in `shared/brand.ts` names the new files: `favicon`, `ogImage`, `icons`, `emblem`.
- **Head tags:** `index.html` and `renderHead` get the favicon, `apple-touch-icon` and manifest links. `/site.webmanifest` lists 192, 512 and the maskable icon.
- **The image guard, narrowly.** `no-committed-images` today allows any file named `favicon.*` or `logo.*` anywhere under `public/`. It becomes an exact list of the files above, under `public/brand/` only (plus nothing else).
  - Its own test gains two cases: a stray `public/brand/photo.jpg` fails, and so does a `logo.png` anywhere else.
  - Photos still go through Admin → Media.
- **A new test, `brand-assets`:**
  - every listed file exists, has its exact size in pixels, and is within budget;
  - the manifest and head tags point at them;
  - a page with no share image of its own uses `og-default.jpg`.

### The emblem plus the name as live text

The logo's maroon lettering vanishes on dark backgrounds, so it's never shipped as an image. `Logo` becomes:

```
[emblem]  SERENDIB LUXE        ← Playfair Display 600, capitals, tracking .04em, the header's text colour
          T O U R S            ← DM Sans 600, text-xs, tracking .32em, --logo-accent
```

- **Where it appears:** the header, footer, admin login, the 404 page and the admin sidebar. In the share image only, the lettering is part of the picture.
- **The image:** `<img srcset="emblem-40.webp 1x, emblem-80.webp 2x, emblem-120.webp 3x" width="47" height="40" alt="">`, inside a `<picture>` with the PNG fallback.
  - The `alt` is empty because the name next to it is the link's text. Nothing is read twice.
  - The width and height are set, so it reserves its space.
- **Size:** 40 px tall in the header and footer, 32 px on phones up to 430 px, and 64 px on the admin login and the 404 page.
- **Both lines** still come from `wordmarkLines(brand)`, so a name saved in Admin → Settings still shows. `--logo-accent` stays a per-background token chosen for AA.
- **Header width:**
  - The emblem adds about 3.3rem.
  - `browser-text-size`, `browser-header-nav` and `browser-wishlist` must pass unchanged at 320, 1100 and 1280 px and at 120% text size. No assertion is loosened.
  - If 320 px gets tight, the existing rule for phones under 21.4rem (`.te-wish-icon--phone`) already hands the wishlist to the menu. The "TOURS" line would be the next thing to go below 21.4rem, and the emblem stays.
  - If the full header needs more room, the container query that collapses the links (`.te-nav-links`) moves up, by what `browser-text-size` measures.

### The emblem on dark backgrounds

Rendered on each theme's dark background (the previews go in PR A's description):
- **What works:** the disc reads well on all three.
- **The problem:** the maroon ground line and the palms on the right sit outside the disc and fade into a dark background. The emblem then looks like a sun with its bottom cut off. At 40 px the elephant and Sigiriya still read, but the palms and the staircase don't.
- **Proposed fix: a soft backing**, only on dark ground (the dark theme, the footer, over photos).
  - It's a circle just larger than the sun (about 108% of its width), filled with `--emblem-backing`: a warm ivory at about 12% opacity over the background.
  - It's a CSS radial gradient on the emblem's frame, so no second image.
  - That gives the maroon edge something to sit on without a visible ring.
- **Light themes** need no backing: maroon on ivory is 15:1.

---

## 2. The three colour themes

### Values

All three themes keep the current structure: the semantic tokens (`--background`, `--brand-primary`, `--text-link`, `--button-primary-bg`…) each get a per-theme value. Components keep using only semantic tokens.

- **Emerald** keeps today's values from `tokens.css`, exactly.
- **Sunset** is sampled from the logo. The maroon is darkened or lightened per role for contrast. Saffron is a fill under dark text, never small text on light ground; there it's the bronze `#8A4A06`.
- **Ocean** is a deep teal-blue with warm sand.

| Token | Sunset light | Sunset dark | Ocean light | Ocean dark |
|---|---|---|---|---|
| `--background` | `#FCF8F3` warm ivory | `#1A0F12` | `#F9F7F2` | `#0B1A20` |
| `--background-secondary` (tint band) | `#F7EADD` | `#241519` | `#EFE6D6` sand | `#11252D` |
| `--surface` (cards) | `#FFFFFF` | `#2E1B20` | `#FFFFFF` | `#173039` |
| `--text-primary` | `#2E1E22` | `#F8EEE7` | `#1E2C32` | `#EEF3F1` |
| `--text-secondary` / `--text-muted` | `#6A5357` | `#D2BDB5` | `#4F6168` | `#AFC3C8` |
| `--brand-primary` (headings) | `#4A0D1A` maroon | `#F8EEE7` | `#0D3A49` | `#EEF3F1` |
| `--brand-secondary` (fill under white) | `#7C1D2D` | `#7C1D2D` | `#146476` | `#146476` |
| `--text-link` and focus ring | `#9A2F12` burnt orange | `#F6B66B` | `#146476` | `#80D0DD` |
| `--accent` (fill) | `#EDA73A` saffron | `#F0B44C` | `#DDBF8E` | `#E3C48F` |
| `--accent-text` (small text) | `#8A4A06` | `#F0B44C` | `#7A5A26` | `#E3C48F` |
| `--text-on-tint` | `#5E4549` | `#D2BDB5` | `#4A5A60` | `#AFC3C8` |
| `--logo-accent` ("TOURS") | `#8A4A06` | `#F0B44C` | `#7A5A26` | `#E3C48F` |
| `--button-primary-bg` / hover | `#7C1D2D` / `#4A0D1A` | `#F2A93B` / `#F7C474` | `#146476` / `#0D3A49` | `#80D0DD` / `#A8E1EA` |
| `--button-primary-text` | `#FFFFFF` | `#2A0710` | `#FFFFFF` | `#0B2E3A` |
| `--button-secondary-bg` / hover | `#FBEBD9` / `#F5D4AE` | `#3B2328` / `#4D2E34` | `#E3F1F4` / `#C4E2E9` | `#173B47` / `#22505F` |
| `--button-secondary-text` | `#4A0D1A` | `#F8EEE7` | `#0D3A49` | `#EEF3F1` |
| `--on-accent` | `#2E1E22` | `#2E1E22` | `#1E2C32` | `#1E2C32` |
| `--inverse-surface` (footer) | `#3E0612` the logo's maroon | `#2A0710` | `#0B2E3A` | `#0B2E3A` |
| `--on-inverse` / `--inverse-accent` | `#FBF1E8` / `#F2B544` | `#F8EEE7` / `#F0B44C` | `#F4F0E7` / `#E3C48F` | `#EEF3F1` / `#E3C48F` |
| `--border-strong` (input edges) | `#8A7772` | ivory at 46% | `#768A90` | ivory at 46% |
| `--danger` / `--success` | as today | as today | as today | as today |

**Every pair the tokens make**, measured with WCAG 2.x relative luminance by a script, is in the appendix. Every Sunset and Ocean pair passes, and the lowest text pair is 5.23:1 (Ocean light, secondary text on the sand band).

**Emerald already fails one check today.** Its input edge (`--border-strong`) is 2.97:1 on a white card in light and 2.09:1 in dark, against WCAG's 3:1 for edges. Sasindu said Emerald stays unchanged, so this plan doesn't touch it: question 7.

### Tokens that aren't text pairs

- **Glass:** `--brand-channels`, `--teal-channels`, `--gold-channels`, `--surface-channels` and `--inverse-channels` get per-theme values, so glass tints, borders, edge light and the scrollbar follow.
- **Photo overlays stay neutral in every theme:** `--photo-channels`, `--photo-text-secondary`, and the home hero and page hero overlays. `browser-hero-contrast` measured them under white text, and a tinted overlay would have to be measured again three times over for no visible gain.
- **Small coloured text on photos** (`--accent-on-photo`, `--photo-link`) gets per-theme pale values: Sunset `#F7CB7E` and `#FAD9A8`, Ocean `#EBD6A4` and today's sky. `browser-contrast` measures them over a white photo.
- **The map:**
  - The tiles are unchanged (light basemap in every theme).
  - `/when-to-go`'s markers follow: the "great" fill is the light theme's `--brand-primary`, and "ok" is `--accent`.
  - Panels, popups and controls follow through glass and surface tokens.
- **The vehicle icons:** the ink and `--vehicle-gold` stay as they are (outline drawings on the card's own colour). A selected card uses `--accent`, so it follows.
- **Gold accents:** every gold use already goes through `--accent`, `--accent-text`, `--inverse-accent` or `--on-accent`, so they follow.
- **Focus rings** use `--text-link`, which is at least 3:1 on every background (see the appendix).
- **Swatches used directly:** 11 places use a swatch instead of a semantic token, and those would ignore a theme:
  - 7 in `index.css`;
  - `floating-booking.css:105,108`;
  - `ride-booking.css:104,105`.

  PR B moves each to a semantic token. A new check in `colour-tokens.test.ts` then fails on any `var(--palette-…)` outside `tokens.css`. The hex check stays exactly as strict: hex values live only in `tokens.css`.
- **The browser's theme colour:** `theme-color` (the meta tag and the manifest) follows the chosen theme: Sunset `#4A0D1A`, Emerald `#194D3B`, Ocean `#0D3A49`.
- **The admin panel follows the theme** (recommended, question 1). It already uses the same tokens, so it costs nothing, and the picker's preview then matches what admins see around it.

### How the theme reaches the page: no flash, no inline script

- **The server writes the attribute.** Express writes `data-palette="sunset|emerald|ocean"` on `<html>` in every page it serves: public pages, the admin and the 404. It works exactly like `data-text-size` (`injectPalette` next to `injectTextSize` in `server/src/pages/head.ts`), from the same `site_settings` read (`loadPageSettings`).
- **No flash.** The attribute is in the HTML before any CSS or JS runs. `public/theme-init.js` stays as it is and only sets `data-theme` (light or dark).
- **The CSS:**
  - `:root, [data-palette="sunset"]` holds Sunset light. No attribute means Sunset, so `vite dev`, which serves `index.html` without Express, still works.
  - `[data-palette="emerald"]` and `[data-palette="ocean"]` hold the other light sets.
  - `[data-palette="…"][data-theme="dark"]` holds each dark set.
  - These are attribute selectors rather than `:root[…]` only, so the admin's preview can put both attributes on a small box.
- **Nobody else can choose:**
  - No query parameter, cookie, header or `localStorage` key is read for it.
  - `theme-init.js` never touches `data-palette`.
  - Only `PUT /api/admin/content/site_settings`, signed in, changes it.

### Storage and the admin picker

- **The column:**
  - Migration **0032**: `alter table site_settings add column if not exists palette text not null default 'sunset' check (palette in ('sunset','emerald','ocean'))`, with its hash added to `applied-migrations.ts`.
  - No applied migration is edited.
  - Deploying PR B switches production to Sunset. That's the decision. Setting Emerald back is one admin save.
- **The list:** `shared/palette.ts` holds `PALETTES`, `isPalette` and the default. A `palette` field type in `content-schema.ts` is validated by Zod (from `shared/zod.ts`).
- **The picker:** Admin → Settings → "Site colour theme". Three radio cards (a native radio group, keyboard and screen-reader ready), each with:
  - the theme's name;
  - three swatches (page, brand, accent), labelled in words, not colour alone;
  - a small preview of a heading, body text, a link and a button, light and dark side by side, rendered with the real tokens by `data-palette` and `data-theme` on the preview box.
- **Saving:** the admin's own tab updates `document.documentElement.dataset.palette` at once, as `text_size` already does.
- **Cached pages:**
  - The page shell is sent `no-cache` with an ETag over its contents, so the next page load anywhere gets the new theme. The ETag changes with the attribute.
  - `site_settings` is read on every request, with no server cache.
  - A visitor's tab that's already open keeps the old theme until it loads a page from the server, because navigations inside the app don't refetch the shell. That's acceptable for a rare admin change.
  - Cloudflare doesn't cache HTML by default (question 6).

---

## 3. Fonts

### The choice

| Role | Font | Files (latin, woff2) | Why |
|---|---|---|---|
| Headings | **Playfair Display 600** (`@fontsource/playfair-display` 5.3.0, OFL) | 23.2 KB | It stays legible at the card heading's 18 to 22 px, because its x-height is larger. Cormorant Garamond at 20 px reads small and thin, worse in dark themes. It's the skill's luxury-travel heading font. |
| Accent words | **Allura 400** (`@fontsource/allura` 5.3.0, OFL) | 26.5 KB | In "Sri Lanka," it's the clearest of the three rendered. Parisienne's "S" reads like an "L", and Great Vibes (42.8 KB) has heavy swashes. |
| Everything else | DM Sans 400, 500, 600 and 700, as today | (as today) | |

- **One heading weight.** Headings get `font-synthesis-weight: none`, so `font-bold` on a heading uses the 600 file instead of a faked bold. `browser-typography` already fails on any font file not on its list, and the list gains exactly these two.
- **Figures in headings:** Playfair's default figures are old-style ("7 days" with a descending 7). Headings get `font-variant-numeric: lining-nums`.

### Rules

- **The script** is only for short accent words:
  - at most 24 characters;
  - at least 2rem as rendered, at every text size;
  - at most two uses on any page;
  - never body text, nav, buttons, form fields, prices or badges.

  It's set only through one `<Accent>` component (class `.te-accent`). `browser-typography` checks every page type for Allura outside `.te-accent`, and for any `.te-accent` that's too small or too many.
- **Headings** (`h1` to `h4`, `.font-heading`, the wordmark's main line) are in Playfair Display.
- **Everything else** is in DM Sans. Inputs stay at `--type-input` (never under 16 px).
- **Contrast:** script strokes are thin, so even at large-text sizes the target is 4.5:1, not 3:1. On the hero it's white over the dark overlay.

### Where the accents go (wording unchanged; only the style changes)

| Page | Heading | In script |
|---|---|---|
| Home hero (`h1`) | "*Sri Lanka,* / planned around you." | the part before the first comma (`heroHeadlineParts`' `lead`), in white. "planned around you." stays in the serif in `--inverse-accent`, as today. A headline saved in Admin → Settings follows the same rule. If its first part is longer than 24 characters, it stays in the serif. |
| Home, "Plan your trip" (`h2`) | "Plan *your trip*" | "your trip" |
| `/explore` (`h1`) | "Explore *Sri Lanka*" | "Sri Lanka" |

The home page has two uses and `/explore` one. Nowhere else, unless asked.

### Performance

- **Weight:** 49.7 KB more on a first visit, cached after that.
- **Preloads:** Playfair Display 600 on every page, since every page's `h1` uses it, next to DM Sans 400. Allura only on the home page, as a `<link>` that Express adds only for `/`. Both are same-origin, so the CSP is unchanged.
- **`font-display: swap`** on both.
- **Fallback metrics so CLS stays 0:**
  - a `Playfair Display Fallback` face on `local(Georgia)`, and an `Allura Fallback` face on `local('Times New Roman') italic`;
  - each with `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override` computed from the font files by a small script in PR A, with the values and method written in `fonts.css`.

  The swap then changes letter shapes but not line breaks or height.
- **A new browser check:** it delays the font files by 1 s through the existing Chrome helper's request interception and asserts CLS = 0 on home, `/explore` and a tour page, at 375 and 1280 px.
- **Lighthouse on phones, measured like the audit** (`docs/reviews/audit-2026-11.md`: Lighthouse 12.8.2, mobile defaults):
  - home and a tour page, median of three runs, before and after;
  - it must not be worse than today: performance score, LCP and CLS;
  - the home page's LCP is the headline itself, so the preloads are what keep it from getting slower.

  If it is worse, PR A doesn't open until that's fixed.

---

## 4. Delivery: two PRs, one at a time

### PR A: the logo and the fonts (colours stay Emerald)

- **Logo:** `design/brand/`, `npm run brand:assets`, `public/brand/`, favicon, manifest, `apple-touch-icon`, the share image, `BRAND_ASSETS`.
- **The emblem and the name** in the header, footer, admin sidebar, admin login and 404, with the dark backing.
- **Fonts:** Playfair Display and Allura, the rules, `<Accent>`, fallback metrics, preloads.
- **Tests:**
  - new: `brand-assets` and the font-delay CLS check;
  - updated: `no-committed-images` (narrowed) and `browser-typography` (font list and script rules);
  - must pass unchanged: `browser-text-size`, `browser-header-nav`, `browser-wishlist`, `browser-contrast` and `browser-hero-contrast`.
- **Pixel baselines** move only for sections the fonts and logo change: the header, the home sections with headings, and the enquiry form's heading. Each one is listed in the PR, with screenshots.
- **Screenshots** (`npm run screenshots -- --base origin/main --live-photos <site>`), 1280 and 375 px, light and dark:
  - header and home;
  - `/explore`;
  - `/tours` and a tour page;
  - a destination;
  - the 404;
  - admin login.

  Plus the icons at full size and the share image.

### PR B: the themes and the admin picker

- **The data and the page:** migration 0032, `shared/palette.ts`, `injectPalette`, the six token sets, the 11 swatch references moved, the `var(--palette-…)` guard, `theme-color` per theme, the admin picker.
- **Tests:**
  - `browser-contrast` for all six sets on every page type, both widths. It's split into one file per theme (`browser-contrast-sunset`, `-emerald`, `-ocean`), so each file stays within the 60 s per test and can run on its own.
  - `browser-hero-contrast` in each theme;
  - the server writes `data-palette` on public pages, the admin and the 404, with the default when the column is unset;
  - `?palette=ocean`, a cookie, an `X-Palette` header and a `site:palette` storage key all change nothing;
  - `theme-init.js` leaves the attribute alone;
  - **no flash:** with JavaScript disabled in Chrome, the first paint already has the theme's `--background`;
  - the admin picker saves: API and browser. Choose Ocean, save; the attribute changes on the admin's tab and on a fresh page load;
  - the migration's check constraint refuses an unknown theme.
- **CI time:** about three times the contrast checking. CI took about 30 minutes on #63 and #71. If that grows a lot, the split files make it visible.
- **Screenshots** (the `screenshots` script gets a `--palette <name>` flag), 1280 and 375 px, each theme in light and dark:
  - header and home;
  - a tour page;
  - a destination;
  - `/explore` (map panels);
  - `/when-to-go` (markers);
  - Admin → Settings with the picker.

---

## 5. Questions

1. **Does the admin panel follow the colour theme?** Recommended yes: it already uses the same tokens, and the picker's preview then matches. The alternative is to keep the admin on Emerald.
2. **The email logo:** today's emails (enquiry and booking alerts) are plain text, so no email can show a logo. Generate `email-logo.png` now, for a later HTML email, or leave it out until then? Recommended: generate it now; it's 9 KB.
3. **The accent wording:** the three accents in section 3 ("Sri Lanka," on the hero, "your trip", "Explore Sri Lanka"). Approve, or name others.
4. **`sharp` as a dev dependency** for `npm run brand:assets`, run by hand with its output committed. Recommended, because it's reproducible. The alternative is generating the files once outside the repo and committing only them.
5. **Production checks** (`⚠ SASINDU`): nothing needed until PR B merges, which switches the site to Sunset.
6. **Cloudflare:** is there any "Cache Everything" rule on the HTML? If so, a theme change would wait for the edge cache to expire.
7. **Emerald's input edges** fail 3:1 today (2.97:1 light, 2.09:1 dark). Leave Emerald exactly as it is, or fix that one token (`--border-strong`) in Emerald too?

---

## Appendix: contrast of every pair

WCAG 2.x contrast. The minimum is 4.5:1 for text and 3:1 for focus rings and input edges. "Emerald" is today's `tokens.css`. Values with an alpha are composited over the card colour. The only two **FAIL** rows are Emerald's input edges as they are today (question 7). Every Sunset and Ocean pair passes.

#### Emerald light (today)

| Pair | Text | Background | Ratio | Min |
|---|---|---|---|---|
| Body text on the page | `#25352E` | `#FAFBF8` | 12.42 | 4.5 |
| Body text on a card | `#25352E` | `#FFFFFF` | 12.90 | 4.5 |
| Body text on the tint band | `#25352E` | `#E5F3EA` | 11.27 | 4.5 |
| Secondary text on the page | `#5A6F64` | `#FAFBF8` | 5.19 | 4.5 |
| Secondary text on a card | `#5A6F64` | `#FFFFFF` | 5.39 | 4.5 |
| Secondary text on the tint band | `#5A6F64` | `#E5F3EA` | 4.71 | 4.5 |
| Headings on the page | `#194D3B` | `#FAFBF8` | 9.33 | 4.5 |
| Headings on a card | `#194D3B` | `#FFFFFF` | 9.70 | 4.5 |
| Links on the page | `#237A57` | `#FAFBF8` | 5.06 | 4.5 |
| Links on a card | `#237A57` | `#FFFFFF` | 5.26 | 4.5 |
| Links on the tint band | `#237A57` | `#E5F3EA` | 4.59 | 4.5 |
| Small accent text on the page | `#80683B` | `#FAFBF8` | 5.10 | 4.5 |
| Small accent text on a card | `#80683B` | `#FFFFFF` | 5.30 | 4.5 |
| Badge text on the tint | `#52675B` | `#E5F3EA` | 5.32 | 4.5 |
| Logo "TOURS" on the header | `#80683B` | `#FAFBF8` | 5.10 | 4.5 |
| Primary button | `#FFFFFF` | `#237A57` | 5.26 | 4.5 |
| Primary button, hover | `#FFFFFF` | `#194D3B` | 9.70 | 4.5 |
| Secondary button | `#194D3B` | `#EAF7FC` | 8.87 | 4.5 |
| Secondary button, hover | `#194D3B` | `#B9E3F4` | 7.09 | 4.5 |
| White on the brand fill (chips, selection) | `#FFFFFF` | `#237A57` | 5.26 | 4.5 |
| Text on a gold/saffron fill | `#25352E` | `#D5B67B` | 6.64 | 4.5 |
| Footer text | `#F1F7F2` | `#12382D` | 11.86 | 4.5 |
| Footer accent text | `#D5B67B` | `#12382D` | 6.63 | 4.5 |
| Error text on the page | `#B3261E` | `#FAFBF8` | 6.29 | 4.5 |
| Error text on a card | `#B3261E` | `#FFFFFF` | 6.54 | 4.5 |
| Success text on the page | `#146844` | `#FAFBF8` | 6.54 | 4.5 |
| Focus ring on the page (non-text) | `#237A57` | `#FAFBF8` | 5.06 | 3.0 |
| Input edge on a card (non-text) | `#849B8E` | `#FFFFFF` | 2.97 **FAIL** | 3.0 |

#### Emerald dark (today)

| Pair | Text | Background | Ratio | Min |
|---|---|---|---|---|
| Body text on the page | `#F1F7F2` | `#101F1B` | 15.66 | 4.5 |
| Body text on a card | `#F1F7F2` | `#20382F` | 11.59 | 4.5 |
| Body text on the tint band | `#F1F7F2` | `#172D26` | 13.42 | 4.5 |
| Secondary text on the page | `#B7CEC3` | `#101F1B` | 10.24 | 4.5 |
| Secondary text on a card | `#B7CEC3` | `#20382F` | 7.57 | 4.5 |
| Secondary text on the tint band | `#B7CEC3` | `#172D26` | 8.77 | 4.5 |
| Headings on the page | `#F1F7F2` | `#101F1B` | 15.66 | 4.5 |
| Headings on a card | `#F1F7F2` | `#20382F` | 11.59 | 4.5 |
| Links on the page | `#74D2A8` | `#101F1B` | 9.34 | 4.5 |
| Links on a card | `#74D2A8` | `#20382F` | 6.91 | 4.5 |
| Links on the tint band | `#74D2A8` | `#172D26` | 8.01 | 4.5 |
| Small accent text on the page | `#D5B67B` | `#101F1B` | 8.76 | 4.5 |
| Small accent text on a card | `#D5B67B` | `#20382F` | 6.48 | 4.5 |
| Badge text on the tint | `#B7CEC3` | `#172D26` | 8.77 | 4.5 |
| Logo "TOURS" on the header | `#D5B67B` | `#101F1B` | 8.76 | 4.5 |
| Primary button | `#12382D` | `#74D2A8` | 7.07 | 4.5 |
| Primary button, hover | `#12382D` | `#98E2BF` | 8.57 | 4.5 |
| Secondary button | `#F1F7F2` | `#193441` | 12.01 | 4.5 |
| Secondary button, hover | `#F1F7F2` | `#284E60` | 8.23 | 4.5 |
| White on the brand fill (chips, selection) | `#FFFFFF` | `#237A57` | 5.26 | 4.5 |
| Text on a gold/saffron fill | `#25352E` | `#D5B67B` | 6.64 | 4.5 |
| Footer text | `#F1F7F2` | `#12382D` | 11.86 | 4.5 |
| Footer accent text | `#D5B67B` | `#12382D` | 6.63 | 4.5 |
| Error text on the page | `#FFB4AB` | `#101F1B` | 10.02 | 4.5 |
| Error text on a card | `#FFB4AB` | `#20382F` | 7.41 | 4.5 |
| Success text on the page | `#9ED7B4` | `#101F1B` | 10.40 | 4.5 |
| Focus ring on the page (non-text) | `#74D2A8` | `#101F1B` | 9.34 | 3.0 |
| Input edge on a card (non-text) | `#54675F` | `#20382F` | 2.09 **FAIL** | 3.0 |

#### Sunset light (new default)

| Pair | Text | Background | Ratio | Min |
|---|---|---|---|---|
| Body text on the page | `#2E1E22` | `#FCF8F3` | 14.99 | 4.5 |
| Body text on a card | `#2E1E22` | `#FFFFFF` | 15.85 | 4.5 |
| Body text on the tint band | `#2E1E22` | `#F7EADD` | 13.41 | 4.5 |
| Secondary text on the page | `#6A5357` | `#FCF8F3` | 6.65 | 4.5 |
| Secondary text on a card | `#6A5357` | `#FFFFFF` | 7.03 | 4.5 |
| Secondary text on the tint band | `#6A5357` | `#F7EADD` | 5.95 | 4.5 |
| Headings on the page | `#4A0D1A` | `#FCF8F3` | 14.56 | 4.5 |
| Headings on a card | `#4A0D1A` | `#FFFFFF` | 15.40 | 4.5 |
| Links on the page | `#9A2F12` | `#FCF8F3` | 7.12 | 4.5 |
| Links on a card | `#9A2F12` | `#FFFFFF` | 7.53 | 4.5 |
| Links on the tint band | `#9A2F12` | `#F7EADD` | 6.37 | 4.5 |
| Small accent text on the page | `#8A4A06` | `#FCF8F3` | 6.48 | 4.5 |
| Small accent text on a card | `#8A4A06` | `#FFFFFF` | 6.86 | 4.5 |
| Badge text on the tint | `#5E4549` | `#F7EADD` | 7.33 | 4.5 |
| Logo "TOURS" on the header | `#8A4A06` | `#FCF8F3` | 6.48 | 4.5 |
| Primary button | `#FFFFFF` | `#7C1D2D` | 10.14 | 4.5 |
| Primary button, hover | `#FFFFFF` | `#4A0D1A` | 15.40 | 4.5 |
| Secondary button | `#4A0D1A` | `#FBEBD9` | 13.19 | 4.5 |
| Secondary button, hover | `#4A0D1A` | `#F5D4AE` | 10.93 | 4.5 |
| White on the brand fill (chips, selection) | `#FFFFFF` | `#7C1D2D` | 10.14 | 4.5 |
| Text on a gold/saffron fill | `#2E1E22` | `#EDA73A` | 7.69 | 4.5 |
| Footer text | `#FBF1E8` | `#3E0612` | 15.21 | 4.5 |
| Footer accent text | `#F2B544` | `#3E0612` | 9.25 | 4.5 |
| Error text on the page | `#B3261E` | `#FCF8F3` | 6.18 | 4.5 |
| Error text on a card | `#B3261E` | `#FFFFFF` | 6.54 | 4.5 |
| Success text on the page | `#146844` | `#FCF8F3` | 6.42 | 4.5 |
| Focus ring on the page (non-text) | `#9A2F12` | `#FCF8F3` | 7.12 | 3.0 |
| Input edge on a card (non-text) | `#8A7772` | `#FFFFFF` | 4.23 | 3.0 |

#### Sunset dark

| Pair | Text | Background | Ratio | Min |
|---|---|---|---|---|
| Body text on the page | `#F8EEE7` | `#1A0F12` | 16.39 | 4.5 |
| Body text on a card | `#F8EEE7` | `#2E1B20` | 14.20 | 4.5 |
| Body text on the tint band | `#F8EEE7` | `#241519` | 15.36 | 4.5 |
| Secondary text on the page | `#D2BDB5` | `#1A0F12` | 10.43 | 4.5 |
| Secondary text on a card | `#D2BDB5` | `#2E1B20` | 9.03 | 4.5 |
| Secondary text on the tint band | `#D2BDB5` | `#241519` | 9.77 | 4.5 |
| Headings on the page | `#F8EEE7` | `#1A0F12` | 16.39 | 4.5 |
| Headings on a card | `#F8EEE7` | `#2E1B20` | 14.20 | 4.5 |
| Links on the page | `#F6B66B` | `#1A0F12` | 10.55 | 4.5 |
| Links on a card | `#F6B66B` | `#2E1B20` | 9.14 | 4.5 |
| Links on the tint band | `#F6B66B` | `#241519` | 9.88 | 4.5 |
| Small accent text on the page | `#F0B44C` | `#1A0F12` | 10.11 | 4.5 |
| Small accent text on a card | `#F0B44C` | `#2E1B20` | 8.76 | 4.5 |
| Badge text on the tint | `#D2BDB5` | `#241519` | 9.77 | 4.5 |
| Logo "TOURS" on the header | `#F0B44C` | `#1A0F12` | 10.11 | 4.5 |
| Primary button | `#2A0710` | `#F2A93B` | 9.25 | 4.5 |
| Primary button, hover | `#2A0710` | `#F7C474` | 11.53 | 4.5 |
| Secondary button | `#F8EEE7` | `#3B2328` | 12.61 | 4.5 |
| Secondary button, hover | `#F8EEE7` | `#4D2E34` | 10.46 | 4.5 |
| White on the brand fill (chips, selection) | `#FFFFFF` | `#7C1D2D` | 10.14 | 4.5 |
| Text on a gold/saffron fill | `#2E1E22` | `#F0B44C` | 8.56 | 4.5 |
| Footer text | `#F8EEE7` | `#2A0710` | 16.17 | 4.5 |
| Footer accent text | `#F0B44C` | `#2A0710` | 9.98 | 4.5 |
| Error text on the page | `#FFB4AB` | `#1A0F12` | 11.03 | 4.5 |
| Error text on a card | `#FFB4AB` | `#2E1B20` | 9.56 | 4.5 |
| Success text on the page | `#9ED7B4` | `#1A0F12` | 11.45 | 4.5 |
| Focus ring on the page (non-text) | `#F6B66B` | `#1A0F12` | 10.55 | 3.0 |
| Input edge on a card (non-text) | `#8B7C7C` | `#2E1B20` | 4.07 | 3.0 |

#### Ocean light

| Pair | Text | Background | Ratio | Min |
|---|---|---|---|---|
| Body text on the page | `#1E2C32` | `#F9F7F2` | 13.42 | 4.5 |
| Body text on a card | `#1E2C32` | `#FFFFFF` | 14.37 | 4.5 |
| Body text on the tint band | `#1E2C32` | `#EFE6D6` | 11.60 | 4.5 |
| Secondary text on the page | `#4F6168` | `#F9F7F2` | 6.05 | 4.5 |
| Secondary text on a card | `#4F6168` | `#FFFFFF` | 6.48 | 4.5 |
| Secondary text on the tint band | `#4F6168` | `#EFE6D6` | 5.23 | 4.5 |
| Headings on the page | `#0D3A49` | `#F9F7F2` | 11.41 | 4.5 |
| Headings on a card | `#0D3A49` | `#FFFFFF` | 12.22 | 4.5 |
| Links on the page | `#146476` | `#F9F7F2` | 6.30 | 4.5 |
| Links on a card | `#146476` | `#FFFFFF` | 6.74 | 4.5 |
| Links on the tint band | `#146476` | `#EFE6D6` | 5.45 | 4.5 |
| Small accent text on the page | `#7A5A26` | `#F9F7F2` | 5.91 | 4.5 |
| Small accent text on a card | `#7A5A26` | `#FFFFFF` | 6.33 | 4.5 |
| Badge text on the tint | `#4A5A60` | `#EFE6D6` | 5.80 | 4.5 |
| Logo "TOURS" on the header | `#7A5A26` | `#F9F7F2` | 5.91 | 4.5 |
| Primary button | `#FFFFFF` | `#146476` | 6.74 | 4.5 |
| Primary button, hover | `#FFFFFF` | `#0D3A49` | 12.22 | 4.5 |
| Secondary button | `#0D3A49` | `#E3F1F4` | 10.56 | 4.5 |
| Secondary button, hover | `#0D3A49` | `#C4E2E9` | 8.96 | 4.5 |
| White on the brand fill (chips, selection) | `#FFFFFF` | `#146476` | 6.74 | 4.5 |
| Text on a gold/saffron fill | `#1E2C32` | `#DDBF8E` | 8.15 | 4.5 |
| Footer text | `#F4F0E7` | `#0B2E3A` | 12.59 | 4.5 |
| Footer accent text | `#E3C48F` | `#0B2E3A` | 8.57 | 4.5 |
| Error text on the page | `#B3261E` | `#F9F7F2` | 6.11 | 4.5 |
| Error text on a card | `#B3261E` | `#FFFFFF` | 6.54 | 4.5 |
| Success text on the page | `#146844` | `#F9F7F2` | 6.34 | 4.5 |
| Focus ring on the page (non-text) | `#146476` | `#F9F7F2` | 6.30 | 3.0 |
| Input edge on a card (non-text) | `#768A90` | `#FFFFFF` | 3.62 | 3.0 |

#### Ocean dark

| Pair | Text | Background | Ratio | Min |
|---|---|---|---|---|
| Body text on the page | `#EEF3F1` | `#0B1A20` | 15.83 | 4.5 |
| Body text on a card | `#EEF3F1` | `#173039` | 12.33 | 4.5 |
| Body text on the tint band | `#EEF3F1` | `#11252D` | 14.12 | 4.5 |
| Secondary text on the page | `#AFC3C8` | `#0B1A20` | 9.69 | 4.5 |
| Secondary text on a card | `#AFC3C8` | `#173039` | 7.55 | 4.5 |
| Secondary text on the tint band | `#AFC3C8` | `#11252D` | 8.64 | 4.5 |
| Headings on the page | `#EEF3F1` | `#0B1A20` | 15.83 | 4.5 |
| Headings on a card | `#EEF3F1` | `#173039` | 12.33 | 4.5 |
| Links on the page | `#80D0DD` | `#0B1A20` | 10.13 | 4.5 |
| Links on a card | `#80D0DD` | `#173039` | 7.89 | 4.5 |
| Links on the tint band | `#80D0DD` | `#11252D` | 9.04 | 4.5 |
| Small accent text on the page | `#E3C48F` | `#0B1A20` | 10.62 | 4.5 |
| Small accent text on a card | `#E3C48F` | `#173039` | 8.27 | 4.5 |
| Badge text on the tint | `#AFC3C8` | `#11252D` | 8.64 | 4.5 |
| Logo "TOURS" on the header | `#E3C48F` | `#0B1A20` | 10.62 | 4.5 |
| Primary button | `#0B2E3A` | `#80D0DD` | 8.17 | 4.5 |
| Primary button, hover | `#0B2E3A` | `#A8E1EA` | 9.97 | 4.5 |
| Secondary button | `#EEF3F1` | `#173B47` | 10.68 | 4.5 |
| Secondary button, hover | `#EEF3F1` | `#22505F` | 7.87 | 4.5 |
| White on the brand fill (chips, selection) | `#FFFFFF` | `#146476` | 6.74 | 4.5 |
| Text on a gold/saffron fill | `#1E2C32` | `#E3C48F` | 8.59 | 4.5 |
| Footer text | `#EEF3F1` | `#0B2E3A` | 12.77 | 4.5 |
| Footer accent text | `#E3C48F` | `#0B2E3A` | 8.57 | 4.5 |
| Error text on the page | `#FFB4AB` | `#0B1A20` | 10.46 | 4.5 |
| Error text on a card | `#FFB4AB` | `#173039` | 8.15 | 4.5 |
| Success text on the page | `#9ED7B4` | `#0B1A20` | 10.85 | 4.5 |
| Focus ring on the page (non-text) | `#80D0DD` | `#0B1A20` | 10.13 | 3.0 |
| Input edge on a card (non-text) | `#7A8A8E` | `#173039` | 3.86 | 3.0 |
