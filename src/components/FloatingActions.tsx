import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { paths } from '@shared/site-paths';
import { FloatingBookingCTA } from './FloatingBookingCTA';
import { WhatsAppButton } from './WhatsAppButton';
import '../styles/floating-booking.css';

/**
 * The only things the stack moves for: they stay put on screen, or nearly, so a visitor can
 * need them where the buttons are. Everything else scrolls away, and passes underneath.
 */
const AVOID = '.te-hero-controls, .leaflet-control, #explore-map [data-keep-clear], [data-scroll-top], [data-footer-last-row]';
const MODAL = '[role="dialog"][aria-modal="true"]';

/** Clearance when rising to a spot, and what it takes to come back down. The gap is the hysteresis. */
const MARGIN = 8;
const ROOMY_MARGIN = 24;
/** The stack holds still until the page has been still this long. */
const SCROLL_QUIET_MS = 150;
/** Phones: how long the labels stay after load, and after stopping near the top. */
const LABELS_MS = 5_000;
const NEAR_TOP_PX = 240;

type Box = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;

/**
 * The least lift, from `from` up, that puts every box clear of every obstacle: each one in the
 * way pushes the stack just above itself, until nothing is in the way. Null above `most`.
 */
function liftClearOf(boxes: Box[], obstacles: Box[], from: number, most: number, margin = MARGIN): number | null {
  for (let lift = from; ;) {
    let next = lift;
    for (const box of boxes) {
      for (const o of obstacles) {
        if (o.left < box.right + margin && o.right > box.left - margin &&
          o.top < box.bottom - lift + margin && o.bottom > box.top - lift - margin) {
          next = Math.max(next, box.bottom - o.top + margin);
        }
      }
    }
    if (next > most) return null;
    if (next === lift) return lift;
    lift = next;
  }
}

/**
 * Where the stack goes from `current`. Rising, it takes the extra room at once; coming down
 * needs that room at the lower spot, or it stays. So a page stopped right at a boundary can't
 * flip it back and forth.
 */
function nextLift(boxes: Box[], obstacles: Box[], current: number, most: number): number {
  const lowest = liftClearOf(boxes, obstacles, 0, most) ?? 0;
  if (lowest > current) return Math.max(lowest, Math.min(lowest + ROOMY_MARGIN - MARGIN, most));
  if (lowest === current) return current;
  const stillClear = liftClearOf(boxes, obstacles, current, most) === current;
  const roomy = liftClearOf(boxes, obstacles, 0, most, ROOMY_MARGIN);
  return stillClear && roomy !== lowest ? current : lowest;
}

/**
 * The WhatsApp and Book a ride buttons, one fixed stack at the bottom right.
 *
 * They hold still while the page scrolls, and content passes underneath, as under any floating
 * button: rising for every row of a list looked broken (#54). Once the page has been still for
 * a moment they look once, and if they're on one of the few things in `AVOID` they rise above it
 * in one smooth move (`--te-float-lift`), and come back down when it has gone. They hide only
 * while a modal is open (`hidden`, or any modal dialog: the enquiry form, search, the phone menu).
 * The footer's padding means the end of every page can be scrolled clear of them.
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
    let quiet = 0;
    let scrolling = false;

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
      if (scrolling) return;

      // Where the buttons would be with no lift, mid-transition or not. Labels count once showing.
      const moved = new DOMMatrixReadOnly(getComputedStyle(root).transform).m42;
      const boxes = [...root.querySelectorAll('a, .te-floating-label')]
        .filter((element) => element.tagName === 'A' || getComputedStyle(element).visibility !== 'hidden')
        .map((element) => {
          const r = element.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top - moved, bottom: r.bottom - moved };
        });
      if (boxes.length === 0) return;
      const obstacles = [...document.querySelectorAll(AVOID)]
        .filter(usable)
        .map((element) => element.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);
      const ceiling = (document.querySelector('.te-nav')?.getBoundingClientRect().bottom ?? 0) + MARGIN;
      const most = Math.min(...boxes.map((box) => box.top)) - ceiling;

      const next = nextLift(boxes, obstacles, lifted.current, most);
      if (next !== lifted.current) {
        lifted.current = next;
        root.style.setProperty('--te-float-lift', `${next}px`);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    reposition.current = schedule;
    const onScroll = () => {
      scrolling = true;
      window.clearTimeout(quiet);
      quiet = window.setTimeout(() => { scrolling = false; schedule(); }, SCROLL_QUIET_MS);
    };
    // Something moved with no scroll: a page changing, photos arriving, the window resizing.
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    if (stack.current) resize.observe(stack.current);
    const mutation = new MutationObserver(records => {
      if (!records.every(record => stack.current?.contains(record.target))) schedule();
    });
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['inert', 'aria-hidden', 'aria-modal', 'data-visible'] });
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame); window.clearTimeout(quiet);
      reposition.current = () => undefined;
      resize.disconnect(); mutation.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
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
