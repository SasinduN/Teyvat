import { navLinks, type NavLink } from '@shared/site-paths';

/** Every fixed link the navigation can show; a hidden one just never matches. */
const NAV_LINKS = navLinks({ bookings: true });

/**
 * Which navigation link is the current page: a section link (`/about#contact`)
 * when the URL names that section, otherwise the page or the list a detail page
 * belongs to (`/tours/x` → All tours). The longest match wins, so a category's page
 * (`/tours/category/beach`) is its own link, not All tours. Undefined when no link
 * matches, as on the home page, whose link is the logo. `links`: the header's own,
 * with the tour categories in it.
 */
export function activeNavigationTarget(pathname: string, hash: string, links: ReadonlyArray<NavLink> = NAV_LINKS): string | undefined {
  const path = pathname.replace(/\/$/, '') || '/';
  const section = links.find(link => {
    const [target, fragment] = link.to.split('#');
    return fragment && target === path && hash === `#${fragment}`;
  });
  if (section) return section.to;
  return links
    .filter(link => !link.to.includes('#'))
    .filter(link => path === link.to || path.startsWith(`${link.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
}
