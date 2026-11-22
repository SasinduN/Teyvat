import React from 'react';

/** Accent words are short: at most this many characters (docs/plans/brand-themes.md). */
export const ACCENT_MAX_LENGTH = 24;

/** Whether `text` may be set as an accent: words a headline chose are only accented while short. */
export const accentable = (text: string): boolean => text.trim().length > 0 && text.trim().length <= ACCENT_MAX_LENGTH;

/**
 * A few words of a heading in the accent script (Allura): the only way the script is
 * used. At most two on a page, never body text, nav, buttons, forms, prices or badges;
 * `browser-typography` checks every page type for all of it.
 */
export const Accent: React.FC<{ children: string }> = ({ children }) => <span className="te-accent">{children}</span>;
