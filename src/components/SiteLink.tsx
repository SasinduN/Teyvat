import React from 'react';
import { Link, useLocation, type LinkProps } from 'react-router-dom';
import { goToSection } from '@/lib/routeFocus';

/**
 * A link to a page of the site. A real `<a href>`, so new tabs, middle-click
 * and crawlers all work.
 *
 * A link to where you already are doesn't navigate: a section of this page
 * (`/#explore-map` on the home page) scrolls there smoothly, as the old
 * section buttons did, and the page itself scrolls to the top. Neither adds a
 * history entry, so Back still leaves the page.
 */
export const SiteLink = React.forwardRef<HTMLAnchorElement, LinkProps & { to: string }>(
  ({ to, onClick, ...rest }, ref) => {
    const location = useLocation();
    return (
      <Link
        ref={ref}
        to={to}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          const [path, hash] = to.split('#');
          if (path !== location.pathname || location.search || location.hash !== (hash ? `#${hash}` : '')) return;
          if (hash) {
            if (goToSection(hash)) e.preventDefault();
          } else {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          }
        }}
        {...rest}
      />
    );
  }
);
SiteLink.displayName = 'SiteLink';
