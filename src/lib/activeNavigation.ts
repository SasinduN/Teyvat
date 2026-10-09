import { NAV_LINKS } from '@shared/site-paths';

/**
 * Which Navbar link is the current page: a section link (`/#explore-map`,
 * `/about#contact`) when the URL names that section, otherwise the page or
 * the list a detail page belongs to (`/tours/x` → Tours). Undefined when no
 * link matches.
 */
export function activeNavigationTarget(pathname: string, hash: string): string | undefined {
  const path = pathname.replace(/\/$/, '') || '/';
  const section = NAV_LINKS.find(link => {
    const [target, fragment] = link.to.split('#');
    return fragment && target === path && hash === `#${fragment}`;
  });
  if (section) return section.to;
  return NAV_LINKS.filter(link => !link.to.includes('#')).find(link => link.to === '/' ? path === '/' : path === link.to || path.startsWith(`${link.to}/`))?.to;
}
