import { focusPageHeading } from './routeFocus';

/** Keep focus at the destination and honour the visitor's motion preference. */
export function scrollToTop(): void {
  focusPageHeading();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
