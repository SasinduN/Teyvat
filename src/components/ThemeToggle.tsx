import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, initialTheme, THEME_KEY, type Theme } from '@/lib/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => initialTheme());
  useEffect(() => {
    const preference = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => { const next = initialTheme(); applyTheme(next); setTheme(next); };
    sync();
    preference.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    return () => { preference.removeEventListener('change', sync); window.removeEventListener('storage', sync); };
  }, []);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next); setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* The chosen theme still applies to this visit. */ }
  }
  return <button type="button" onClick={toggle} className="te-theme-toggle te-button te-button--icon" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
    {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
  </button>;
}
