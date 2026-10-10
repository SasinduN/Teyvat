import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { chooseTheme, useTheme } from '@/lib/theme';

/**
 * Switches between the light and dark themes, and keeps the choice
 * (`site:theme`). Until the visitor chooses, the theme follows the system
 * (public/theme-init.js).
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
      {theme === 'dark' ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
    </button>
  );
};
