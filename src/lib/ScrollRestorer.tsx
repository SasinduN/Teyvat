import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Positions by history entry, kept for the tab's life (and across a reload). */
const STORAGE_KEY = 'site:scroll-positions';

/**
 * Navigation state for a change of the page's own query (a filter, clearing
 * a route): the page stays where it is, and focus where it was. React
 * Router's `preventScrollReset` only works with its data router.
 */
export const KEEP_SCROLL = { keepScroll: true } as const;

export const keepsScroll = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && (state as { keepScroll?: unknown }).keepScroll === true;

function load(): Map<string, number> {
  try {
    return new Map(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as [string, number][]);
  } catch {
    return new Map();
  }
}

/**
 * Scroll positions across navigation: a new page opens at the top, and Back
 * and Forward return to where that page was left.
 *
 * React Router's own `<ScrollRestoration>` needs its data router, which adds
 * about 20 KB (gzipped) to every page; this is the part of it the site uses.
 * Positions are recorded as the page scrolls, under the current history
 * entry's key, so the clamp a shorter next page causes never overwrites them
 * (scroll events arrive after the commit that changes the key). A link to a
 * hash is left to the layout, which scrolls to that section, and a
 * navigation with `KEEP_SCROLL` stays put.
 */
export function ScrollRestorer() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Map<string, number>>(load());
  const current = useRef(location.key);

  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    const record = () => positions.current.set(current.current, Math.round(window.scrollY));
    const persist = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...positions.current].slice(-100)));
      } catch {
        // Storage full or blocked: positions still work for this page's life.
      }
    };
    window.addEventListener('scroll', record, { passive: true });
    window.addEventListener('pagehide', persist);
    return () => {
      window.removeEventListener('scroll', record);
      window.removeEventListener('pagehide', persist);
    };
  }, []);

  useLayoutEffect(() => {
    current.current = location.key;
    if (navigationType === 'POP') {
      const y = positions.current.get(location.key);
      if (y !== undefined) window.scrollTo({ top: y, behavior: 'instant' });
    } else if (!location.hash && !keepsScroll(location.state)) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.key, navigationType, location.hash]);

  return null;
}
