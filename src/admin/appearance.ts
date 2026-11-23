import { useSyncExternalStore } from 'react';

import { isDefaultMode, resolveTheme, DEFAULT_DEFAULT_MODE, type DefaultMode } from '@shared/default-mode';
import { DEFAULT_PALETTE, isPalette, type Palette } from '@shared/palette';
import type { SiteSettingsRow } from '@shared/database.types';
import { deviceIsDark, showTheme, showVisitorTheme } from '@/lib/theme';

/**
 * The Appearance panel's preview (handoff Task 7), shared by every copy of the panel (the
 * top bar's and Admin → Settings'), so they always show the same choice.
 *
 * A choice is previewed on this tab at once (`data-palette`, `data-theme` on <html>) and
 * saved for nobody until "Save for all visitors". Cancel, closing the panel or leaving the
 * page puts back what the server sent: its palette, and the admin's own light or dark (their
 * saved choice, else the site's default mode), as theme-init.js chose them.
 */
export interface Appearance {
  palette: Palette;
  mode: DefaultMode;
}

/** The saved appearance, from the settings row. */
export function savedAppearance(row: Pick<SiteSettingsRow, 'palette' | 'default_mode'>): Appearance {
  return {
    palette: isPalette(row.palette) ? row.palette : DEFAULT_PALETTE,
    mode: isDefaultMode(row.default_mode) ? row.default_mode : DEFAULT_DEFAULT_MODE
  };
}

export const sameAppearance = (a: Appearance, b: Appearance) => a.palette === b.palette && a.mode === b.mode;

/** The light or dark a mode shows on this device (Auto follows it). */
export const modeTheme = (mode: DefaultMode) => resolveTheme(null, mode, deviceIsDark());

let draft: Appearance | null = null;
const listeners = new Set<() => void>();
const root = () => document.documentElement;
/** The palette the server wrote on this page, put back when a preview ends. */
let pagePalette: string | undefined = typeof document === 'undefined' ? undefined : root().dataset.palette;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** What is being previewed, or null when nothing is. */
export function useAppearanceDraft(): Appearance | null {
  return useSyncExternalStore(subscribe, () => draft, () => null);
}

/** Shows `next` on this tab without saving it. */
export function previewAppearance(next: Appearance): void {
  draft = next;
  root().dataset.palette = next.palette;
  showTheme(modeTheme(next.mode));
  emit();
}

/** Ends the preview: the page as the server sent it, and the admin's own light or dark. */
export function endAppearancePreview(): void {
  if (!draft) return;
  draft = null;
  if (pagePalette) root().dataset.palette = pagePalette;
  else delete root().dataset.palette;
  showVisitorTheme();
  emit();
}

/** After a save (here or in the settings form): this tab takes the saved values as its own. */
export function adoptSavedAppearance(row: Pick<SiteSettingsRow, 'palette' | 'default_mode'>): void {
  const saved = savedAppearance(row);
  draft = null;
  pagePalette = saved.palette;
  root().dataset.palette = saved.palette;
  root().dataset.defaultMode = saved.mode;
  showVisitorTheme();
  emit();
}
