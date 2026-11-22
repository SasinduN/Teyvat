/**
 * The logo files in public/brand/, made by `npm run brand:assets` from design/brand/
 * (docs/plans/brand-themes.md). One list for the script (budgets), the
 * `no-committed-images` guard (the only images allowed under public/) and
 * `brand-assets.test` (sizes and budgets).
 */
export interface BrandFile {
  name: string;
  /** Pixels; null for the .ico, which holds 16 and 32. */
  width: number | null;
  height: number | null;
  budgetKb: number;
}

export const BRAND_DIR = '/brand';

export const BRAND_FILES: readonly BrandFile[] = [
  { name: 'emblem-40.webp', width: 47, height: 40, budgetKb: 3 },
  { name: 'emblem-40.png', width: 47, height: 40, budgetKb: 4 },
  { name: 'emblem-80.webp', width: 94, height: 80, budgetKb: 5 },
  { name: 'emblem-80.png', width: 94, height: 80, budgetKb: 8 },
  { name: 'emblem-120.webp', width: 140, height: 120, budgetKb: 8 },
  { name: 'emblem-120.png', width: 140, height: 120, budgetKb: 12 },
  { name: 'favicon.ico', width: null, height: null, budgetKb: 4 },
  { name: 'favicon-32.png', width: 32, height: 32, budgetKb: 3 },
  { name: 'apple-touch-icon.png', width: 180, height: 180, budgetKb: 10 },
  { name: 'icon-192.png', width: 192, height: 192, budgetKb: 12 },
  { name: 'icon-512.png', width: 512, height: 512, budgetKb: 45 },
  { name: 'icon-maskable-512.png', width: 512, height: 512, budgetKb: 45 },
  { name: 'email-logo.png', width: 240, height: 255, budgetKb: 15 },
  { name: 'og-default.jpg', width: 1200, height: 630, budgetKb: 80 }
];

/** The emblem beside the name: `<picture>` sources, 1x to 3x of 40 px. */
export const EMBLEM = {
  width: 47,
  height: 40,
  webp: [40, 80, 120].map((h, i) => `${BRAND_DIR}/emblem-${h}.webp ${i + 1}x`).join(', '),
  png: `${BRAND_DIR}/emblem-40.png`,
  pngSet: [40, 80, 120].map((h, i) => `${BRAND_DIR}/emblem-${h}.png ${i + 1}x`).join(', ')
} as const;
