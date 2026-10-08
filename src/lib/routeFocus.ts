/**
 * Moving focus after navigation, so a screen reader announces the new page
 * or section. The target gets `tabindex="-1"` here, at that moment, so the
 * components' markup doesn't change; `preventScroll` leaves scrolling to the
 * router's scroll restoration (or to the caller).
 */
export function focusTarget(el: HTMLElement): void {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.dataset.routeFocus = '';
  el.focus({ preventScroll: true });
}

/** The page's main heading, if it has rendered. */
export function focusPageHeading(): boolean {
  const h1 = document.querySelector<HTMLElement>('main h1');
  if (!h1) return false;
  focusTarget(h1);
  return true;
}

/** Scrolls to a section of the current page and focuses it. */
export function goToSection(id: string, behavior: ScrollBehavior = 'smooth'): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior, block: 'start' });
  focusTarget(el);
  return true;
}
