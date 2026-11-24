import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { chooseTheme, useTheme } from '@/lib/theme';

/**
 * Switches between the light and dark themes, and keeps the choice
 * (`site:theme`). Until the visitor chooses, the theme is the site's
 * default mode, light unless an admin chose otherwise (public/theme-init.js).
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} theme`;
  return (
    <button
      type="button"
      onClick={() => chooseTheme(next)}
      className={`te-button te-button--icon ${className}`}
      aria-label={label}
      title={label}
      data-theme-toggle
    >
      {/* Both, and CSS shows the one for <html data-theme> (index.css): right from the first paint,
          the server's first screen included, which can't know the theme. */}
      <Sun className="te-theme-icon te-theme-icon--sun w-5 h-5" aria-hidden="true" />
      <Moon className="te-theme-icon te-theme-icon--moon w-5 h-5" aria-hidden="true" />
    </button>
  );
};
