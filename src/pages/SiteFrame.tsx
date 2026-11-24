import type { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { Section } from './Section';

/**
 * The frame of every public page: the skip link, the header and `<main>`, with the page
 * inside and whatever follows it (the Footer, the dialogs, the floating buttons).
 *
 * `PublicLayout` renders it in the browser, and the server renders it with the first screen
 * in `<main>` (`src/ssr/first-screen.tsx`), so the two can't differ: React's first render
 * replaces the server's markup with the same markup. Nothing here may touch `window` or
 * `document` while rendering (only in handlers and effects).
 */
export function SiteFrame({ onOpenSearch, children, after }: { onOpenSearch: () => void; children: ReactNode; after?: ReactNode }) {
  return (
    <div className="site min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans selection:bg-[var(--brand-secondary)] selection:text-[var(--on-inverse)]">
      {/* The first Tab stop: straight past the header to the page. */}
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main-content');
          main?.focus({ preventScroll: true });
          main?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <Section name="Navbar">
        <Navbar onOpenSearch={onOpenSearch} />
      </Section>

      <main id="main-content" tabIndex={-1} data-route-focus>
        {children}
      </main>

      {after}
    </div>
  );
}
