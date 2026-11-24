/**
 * What a first-time visitor sees, light or dark (Admin → Appearance,
 * `site_settings.default_mode`, migration 0033). Express writes it on <html> as
 * `data-default-mode` in every page it sends, and `public/theme-init.js` reads it before
 * the first paint, but only when the visitor hasn't chosen: their own choice (`site:theme`,
 * the light/dark button) always wins. `auto` follows the device (`prefers-color-scheme`).
 * Only an admin sets it: no URL parameter, cookie, header or browser storage can.
 */
export const DEFAULT_MODES = ['light', 'dark', 'auto'] as const;

export type DefaultMode = (typeof DEFAULT_MODES)[number];

/** Light: what the site did before there was a setting. */
export const DEFAULT_DEFAULT_MODE: DefaultMode = 'light';

export const isDefaultMode = (value: unknown): value is DefaultMode => DEFAULT_MODES.includes(value as DefaultMode);

export const DEFAULT_MODE_LABELS: Record<DefaultMode, string> = {
  light: 'Light',
  dark: 'Dark',
  auto: 'Auto'
};

/**
 * The theme a page shows: the visitor's saved choice, else the site's default mode, with
 * Auto resolved by the device. `public/theme-init.js` does the same before the first paint
 * (it can't import this); `browser-appearance` checks they agree.
 */
export function resolveTheme(saved: 'light' | 'dark' | null, mode: unknown, prefersDark: boolean): 'light' | 'dark' {
  if (saved) return saved;
  if (mode === 'dark') return 'dark';
  if (mode === 'auto') return prefersDark ? 'dark' : 'light';
  return 'light';
}
