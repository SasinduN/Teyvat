/**
 * The site-wide text size (Admin → Settings, `site_settings.text_size`): a
 * percent of the visitor's browser default. Express writes it on <html> as
 * `data-text-size`, and `src/index.css` has a rule for each value. A CHECK in
 * migration 0019 holds the same list.
 */
export const TEXT_SIZES = [90, 100, 110, 120] as const;

export type TextSize = (typeof TEXT_SIZES)[number];

export const DEFAULT_TEXT_SIZE: TextSize = 100;

export const isTextSize = (value: unknown): value is TextSize => TEXT_SIZES.includes(value as TextSize);
