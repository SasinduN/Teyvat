/**
 * The site's colour theme (Admin → Settings, `site_settings.palette`, migration 0032;
 * docs/plans/brand-themes.md). Express writes it on <html> as `data-palette` in every page
 * it sends, public and admin, and src/styles/tokens.css gives each theme its colours. Only
 * an admin chooses it: no URL parameter, cookie, header or browser storage can. The
 * visitor's light/dark choice (`data-theme`) works in every theme.
 */
export const PALETTES = ['sunset', 'emerald', 'ocean'] as const;

export type Palette = (typeof PALETTES)[number];

/** The theme with no attribute, and when nothing has been saved: Sunset, from the logo. */
export const DEFAULT_PALETTE: Palette = 'sunset';

export const isPalette = (value: unknown): value is Palette => PALETTES.includes(value as Palette);

export const PALETTE_LABELS: Record<Palette, { name: string; description: string }> = {
  sunset: { name: 'Sunset', description: 'Deep maroon and saffron, from the logo.' },
  emerald: { name: 'Emerald', description: 'Deep green and gold: the colours the site had before.' },
  ocean: { name: 'Ocean', description: 'Deep teal-blue and warm sand.' }
};

/** The browser's bar and the manifest's `theme_color`: each theme's deep brand colour. */
export const PALETTE_THEME_COLOR: Record<Palette, string> = {
  sunset: '#4A0D1A',
  emerald: '#194D3B',
  ocean: '#0D3A49'
};
