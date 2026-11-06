import { navLinks } from '@shared/site-paths';

/** Every link the navigation can show; a hidden one just never matches. */
const NAV_LINKS = navLinks({ bookings: true });

/**
 * Which navigation link is the current page: a section link (`/about#contact`)
 * when the URL names that section, otherwise the page or the list a detail page
 * belongs to (`/tours/x` → Tours). Undefined when no link matches, as on the home
 * page, whose link is the logo.
 */
export function activeNavigationTarget(pathname: string, hash: string): string | undefined {
  const path = pathname.replace(/\/$/, '') || '/';
  const section = NAV_LINKS.find(link => {
    const [target, fragment] = link.to.split('#');
    return fragment && target === path && hash === `#${fragment}`;
  });
  if (section) return section.to;
  return NAV_LINKS.filter(link => !link.to.includes('#')).find(link => path === link.to || path.startsWith(`${link.to}/`))?.to;
}
