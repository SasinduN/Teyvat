import { useSyncExternalStore } from 'react';
import { resolveTheme } from '@shared/default-mode';

/**
 * The light and dark themes (redesign PR 5). `public/theme-init.js` sets
 * `<html data-theme>` before the first paint (the visitor's choice, else the
 * site's default mode from `data-default-mode`, else light); this module
 * reads it, and saves a choice.
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

/** The visitor's saved choice, if any (null when storage is blocked). */
export function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** Whether the device asks for dark (what the default mode Auto follows). */
export function deviceIsDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Shows `theme` on this page without saving it as the visitor's choice (the Appearance panel's preview). */
export function showTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

/**
 * Puts back what theme-init.js chose: the visitor's saved choice, else the site's default
 * mode (`data-default-mode`), else light. Ends the Appearance panel's preview.
 */
export function showVisitorTheme(): void {
  showTheme(resolveTheme(savedTheme(), document.documentElement.dataset.defaultMode, deviceIsDark()));
}

/** Calls `listener` whenever the theme changes (a choice here or in another tab). */
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
