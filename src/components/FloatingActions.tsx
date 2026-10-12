import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { paths } from '@shared/site-paths';
import { FloatingBookingCTA } from './FloatingBookingCTA';
import { WhatsAppButton } from './WhatsAppButton';
import '../styles/floating-booking.css';

// Protect whole cards (including photos/text), not just their nested actions.
const CARDS = '.te-card, .destination-card, .home-destination-card';
const PROTECTED = `${CARDS}, .te-nav, .leaflet-control, [data-keep-clear], footer,
  main a, main button, main input, main select, main textarea, main [tabindex],
  form button, form input, form select, form textarea,
  [role="dialog"], [data-cookie-banner], [data-chat-widget], [data-sticky-footer]`;

function intersects(a: DOMRect, b: DOMRect, margin: number) {
  return b.width > 0 && b.height > 0 && b.left < a.right + margin &&
    b.right > a.left - margin && b.top < a.bottom + margin && b.bottom > a.top - margin;
}

/** One fixed stack, one observer set, stable slots, immediate hide / delayed restore. */
export function FloatingActions({ whatsappHref, bookingAllowed = true, hidden = false }: {
  whatsappHref: string | null; bookingAllowed?: boolean; hidden?: boolean;
}) {
  const location = useLocation();
  const bookingEnabled = bookingAllowed && location.pathname.replace(/\/+$/, '') !== paths.booking;
  const stack = useRef<HTMLDivElement>(null);
  const booking = useRef<HTMLAnchorElement>(null);
  const chat = useRef<HTMLAnchorElement>(null);
  const [state, setState] = useState({ booking: true, chat: true, compact: false });

  useLayoutEffect(() => {
    let frame = 0;
    let restore = 0;
    let disposed = false;
    let current = { booking: true, chat: true, compact: false };
    setState(current);
    const nearby = new Set<Element>();
    const observed = new Set<Element>();
    const commit = (next: typeof current) => {
      if (next.booking !== current.booking || next.chat !== current.chat || next.compact !== current.compact) {
        current = next; setState(next);
      }
    };
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      return !element.closest('[inert], [aria-hidden="true"]') && style.visibility !== 'hidden' &&
        style.display !== 'none' && (element.matches(CARDS) || Number(style.opacity) > 0);
    };
    const check = (allowRestore = false) => {
      if (disposed || !stack.current) return;
      const candidates = [...nearby].filter(visible);
      const modal = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
      const collision = (control: HTMLAnchorElement | null, blocked: boolean) => {
        if (!control) return null;
        const rect = control.getBoundingClientRect();
        // Extra clearance before restoring prevents edge jitter while scrolling.
        return candidates.find(element => intersects(rect, element.getBoundingClientRect(),
          element.matches(CARDS) ? (blocked ? 48 : 40) : (blocked ? 16 : 8))) ?? null;
      };
      const bookingConflict = collision(booking.current, current.booking);
      const chatConflict = collision(chat.current, current.chat);
      const b = stack.current.getBoundingClientRect();
      const fullFootprint = new DOMRect(b.right - 200, b.top, 200, b.height);
      const compact = candidates.some(element => element.matches(CARDS) &&
        intersects(fullFootprint, element.getBoundingClientRect(), 24));
      const nextBooking = hidden || modal || Boolean(bookingConflict);
      const nextChat = hidden || modal || Boolean(chatConflict);

      // A focused floating action must not silently disappear under the user.
      for (const [control, conflict, willHide] of [
        [booking.current, bookingConflict, nextBooking], [chat.current, chatConflict, nextChat]
      ] as const) {
        if (willHide && control === document.activeElement) {
          const destination = conflict?.matches('a,button,input,select,textarea,[tabindex]')
            ? conflict : conflict?.querySelector('a,button,input,select,textarea,[tabindex]');
          const fallback = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"], #main-content');
          (destination instanceof HTMLElement ? destination : fallback)?.focus({ preventScroll: true });
          if (document.activeElement === control) fallback?.focus({ preventScroll: true });
        }
      }
      commit({ compact, booking: nextBooking || (!allowRestore && current.booking),
        chat: nextChat || (!allowRestore && current.chat) });
      if ((!nextBooking && current.booking) || (!nextChat && current.chat)) {
        if (!restore) restore = window.setTimeout(() => { restore = 0; check(true); }, 200);
      } else {
        window.clearTimeout(restore); restore = 0;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; check(); });
    };
    const intersection = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) nearby.add(entry.target); else nearby.delete(entry.target);
      }
      schedule();
    }, { rootMargin: '80px' });
    const resize = new ResizeObserver(schedule);
    const refresh = () => {
      for (const element of document.querySelectorAll(PROTECTED)) {
        if (stack.current?.contains(element) || observed.has(element)) continue;
        observed.add(element); intersection.observe(element); resize.observe(element);
      }
      for (const element of observed) {
        if (!element.isConnected) {
          observed.delete(element); nearby.delete(element); intersection.unobserve(element); resize.unobserve(element);
        }
      }
      schedule();
    };
    const mutation = new MutationObserver(records => {
      if (records.every(record => stack.current?.contains(record.target))) return;
      if (records.some(record => record.type === 'childList')) refresh(); else schedule();
    });
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'style', 'inert', 'aria-hidden', 'aria-expanded', 'data-revealed'] });
    refresh();
    if (stack.current) resize.observe(stack.current);
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    document.addEventListener('focusin', schedule);
    document.addEventListener('transitionend', schedule, true);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      disposed = true; cancelAnimationFrame(frame); window.clearTimeout(restore);
      intersection.disconnect(); resize.disconnect(); mutation.disconnect();
      document.removeEventListener('scroll', schedule, true);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('transitionend', schedule, true);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [hidden, bookingEnabled, whatsappHref]);

  return <div ref={stack} className="te-floating-actions" data-floating-actions data-compact={state.compact}>
    {bookingEnabled && <FloatingBookingCTA ref={booking} hidden={hidden || state.booking} />}
    {whatsappHref && <WhatsAppButton ref={chat} href={whatsappHref} hidden={hidden || state.chat} />}
  </div>;
}
