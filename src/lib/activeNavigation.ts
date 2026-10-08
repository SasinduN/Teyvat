import { NAV_LINKS } from '@shared/site-paths';
/** Section links take priority; other hashes retain their parent page. */
export function activeNavigationTarget(pathname: string, hash: string): string | undefined {
  const path = pathname.replace(/\/$/, '') || '/';
  const section = NAV_LINKS.find(link => {
    const [target, fragment] = link.to.split('#');
    return fragment && target === path && hash === `#${fragment}`;
  });
  if (section) return section.to;
  return NAV_LINKS.filter(link => !link.to.includes('#')).find(link => link.to === '/' ? path === '/' : path === link.to || path.startsWith(`${link.to}/`))?.to;
}
