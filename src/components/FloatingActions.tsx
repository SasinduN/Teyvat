import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { paths } from '@shared/site-paths';
import { FloatingBookingCTA } from './FloatingBookingCTA';
import { WhatsAppButton } from './WhatsAppButton';
import '../styles/floating-booking.css';

/** What the stack always moves clear of, and it moves as far as it takes. */
const IMPORTANT = `.leaflet-control, [data-keep-clear], [data-scroll-top], [data-footer-last-row],
  form button[type="submit"], [data-cookie-banner], [data-chat-widget], [data-sticky-footer]`;
/** Everything else a visitor can press. If no spot clears these too, it clears `IMPORTANT` at least. */
const CONTROLS = `main a, main button, main input, main select, main textarea,
  form button, form input, form select, form textarea, footer a, footer button, footer input`;
const MODAL = '[role="dialog"][aria-modal="true"]';

/** Breathing room around the buttons, in px. */
const MARGIN = 8;
/** While the page scrolls the stack only rises; it settles this long after the scroll stops. */
const SCROLL_QUIET_MS = 180;
/** Phones: how long the labels stay after load, and after stopping near the top. */
const LABELS_MS = 5_000;
const NEAR_TOP_PX = 240;

type Box = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;

/**
 * The least lift, from `from` up, that puts every box clear of every obstacle: each one in the
 * way pushes the stack just above itself, until nothing is in the way. Null above `most`.
 */
function liftClearOf(boxes: Box[], obstacles: Box[], from: number, most: number): number | null {
  for (let lift = from; ;) {
    let next = lift;
    for (const box of boxes) {
      for (const o of obstacles) {
        if (o.left < box.right + MARGIN && o.right > box.left - MARGIN &&
          o.top < box.bottom - lift + MARGIN && o.bottom > box.top - lift - MARGIN) {
          next = Math.max(next, box.bottom - o.top + MARGIN);
        }
      }
    }
    if (next > most) return null;
    if (next === lift) return lift;
    lift = next;
  }
}

/**
 * The WhatsApp and Book a ride buttons, one fixed stack at the bottom right.
 *
 * They are always on screen, except while a modal is open (`hidden`, or any modal dialog: the
 * enquiry form, search, the phone menu). When they would sit on something a visitor needs they
 * rise smoothly above it (`--te-float-lift`). They never hide for that: they used to, for
 * anything within 40 px of a card, a link or the footer, which on a phone was most of every page.
 *
 * They float over photos and text, as any floating button does, and the footer's padding keeps
 * the end of the page clear of them. A link the size of a whole card isn't an obstacle: there
 * is no way past it, and the visitor can press the rest of it.
 */
export function FloatingActions({ whatsappHref, bookingAllowed = true, hidden = false }: {
  whatsappHref: string | null; bookingAllowed?: boolean; hidden?: boolean;
}) {
  const location = useLocation();
  const bookingEnabled = bookingAllowed && location.pathname.replace(/\/+$/, '') !== paths.booking;
  const stack = useRef<HTMLDivElement>(null);
  const reposition = useRef<() => void>(() => undefined);
  /** Kept across re-runs of the effect below: it's what the stylesheet was last told. */
  const lifted = useRef(0);
  const [modal, setModal] = useState(false);
  const [labels, setLabels] = useState(true);
  const concealed = hidden || modal;
  const hasChat = Boolean(whatsappHref);

  useLayoutEffect(() => {
    if (!bookingEnabled && !hasChat) return;
    let frame = 0;
    let settle = 0;
    let lastScroll = -Infinity;
    const nearby = new Set<Element>();
    const observed = new Set<Element>();

    const usable = (element: Element) => {
      const style = getComputedStyle(element);
      return !element.closest('[inert], [aria-hidden="true"]') && style.visibility !== 'hidden' &&
        style.display !== 'none' && Number(style.opacity) > 0;
    };
    const check = () => {
      frame = 0;
      const root = stack.current;
      if (!root) return;
      setModal(Boolean(document.querySelector(MODAL)));

      // Where the buttons would be with no lift, mid-transition or not. Labels count once showing.
      const moved = new DOMMatrixReadOnly(getComputedStyle(root).transform).m42;
      const boxes = [...root.querySelectorAll('a, .te-floating-label')]
        .filter((element) => element.tagName === 'A' || getComputedStyle(element).visibility !== 'hidden')
        .map((element) => {
          const r = element.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top - moved, bottom: r.bottom - moved };
        });
      if (boxes.length === 0) return;
      const important: Box[] = [];
      const controls: Box[] = [];
      for (const element of nearby) {
        if (!element.isConnected || !usable(element)) continue;
        const r = element.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (element.matches(IMPORTANT)) {
          if (r.height <= innerHeight / 2) important.push(r);
        } else if (r.width <= 160 || r.height <= 160) {
          controls.push(r);
        }
      }
      const ceiling = (document.querySelector('.te-nav')?.getBoundingClientRect().bottom ?? 0) + MARGIN;
      const most = Math.min(...boxes.map((box) => box.top)) - ceiling;
      const everything = [...important, ...controls];

      const scrolling = performance.now() - lastScroll < SCROLL_QUIET_MS;
      const next = (scrolling ? liftClearOf(boxes, everything, lifted.current, most) : null)
        ?? liftClearOf(boxes, everything, 0, most)
        ?? liftClearOf(boxes, important, 0, most)
        ?? 0;
      if (next !== lifted.current) {
        lifted.current = next;
        root.style.setProperty('--te-float-lift', `${next}px`);
      }
      if (scrolling) {
        window.clearTimeout(settle);
        settle = window.setTimeout(check, SCROLL_QUIET_MS + 20);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    reposition.current = schedule;
    const onScroll = () => {
      lastScroll = performance.now();
      schedule();
    };
    const intersection = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) nearby.add(entry.target); else nearby.delete(entry.target);
      }
      schedule();
    }, { rootMargin: '80px' });
    const resize = new ResizeObserver(schedule);
    const refresh = () => {
      for (const element of document.querySelectorAll(`${IMPORTANT}, ${CONTROLS}`)) {
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
      attributeFilter: ['class', 'style', 'inert', 'aria-hidden', 'aria-modal', 'aria-expanded', 'data-revealed', 'data-visible'] });
    refresh();
    check();
    if (stack.current) resize.observe(stack.current);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('focusin', schedule);
    document.addEventListener('transitionend', schedule, true);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame); window.clearTimeout(settle);
      reposition.current = () => undefined;
      intersection.disconnect(); resize.disconnect(); mutation.disconnect();
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('transitionend', schedule, true);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [bookingEnabled, hasChat]);

  // Phones (the stylesheet keeps them on elsewhere): the labels show for a while after load
  // and go once the page scrolls away, and they come back when it stops near the top.
  useEffect(() => {
    let hide = 0;
    let quiet = 0;
    const show = () => {
      setLabels(true);
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setLabels(false), LABELS_MS);
    };
    const onScroll = () => {
      if (window.scrollY > NEAR_TOP_PX) {
        window.clearTimeout(hide);
        setLabels(false);
      }
      window.clearTimeout(quiet);
      quiet = window.setTimeout(() => { if (window.scrollY <= NEAR_TOP_PX) show(); }, SCROLL_QUIET_MS);
    };
    show();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(quiet);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useLayoutEffect(() => reposition.current(), [labels]);

  return <div ref={stack} className="te-floating-actions" data-floating-actions data-labels={labels ? 'shown' : 'collapsed'}>
    {bookingEnabled && <FloatingBookingCTA hidden={concealed} />}
    {whatsappHref && <WhatsAppButton href={whatsappHref} hidden={concealed} />}
  </div>;
}
