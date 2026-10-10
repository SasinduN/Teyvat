import { useSyncExternalStore } from 'react';

/**
 * The light and dark themes (redesign PR 5). `public/theme-init.js` sets
 * `<html data-theme>` before the first paint and follows the system while
 * the visitor hasn't chosen; this module reads it, and saves a choice.
 */
export type Theme = 'light' | 'dark';

/** Where the visitor's choice is kept (the same key as theme-init.js). */
export const THEME_KEY = 'site:theme';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Applies `theme` and keeps it as the visitor's choice (for this visit only if storage is blocked). */
export function chooseTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies to this page.
  }
}

/** Calls `listener` whenever the theme changes (a choice, the system, another tab). */
export function onThemeChange(listener: (theme: Theme) => void): () => void {
  const observer = new MutationObserver(() => listener(currentTheme()));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

/** The theme on screen, re-rendering when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(onThemeChange, currentTheme, () => 'light');
}

/** A colour token's value now (for SVG attributes and canvases, where var() doesn't resolve). */
export function tokenValue(name: string, fallback = 'currentColor'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
