import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { focusPageHeading } from '@/lib/routeFocus';

/**
 * What the button must never sit on top of: the map's zoom buttons, the
 * WhatsApp button, and anything marked `data-keep-clear` (the map's Quick
 * Jump bar, the main buttons at the foot of the modals, the slideshow's
 * controls once they carry the mark).
 */
const KEEP_CLEAR = '.leaflet-control-zoom, [data-keep-clear], [data-whatsapp-button], [data-floating-booking]';

/** Breathing room around the button, in px. */
const MARGIN = 8;

function overlapsKeepClear(button: HTMLElement): boolean {
  const b = button.getBoundingClientRect();
  for (const el of document.querySelectorAll(KEEP_CLEAR)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.left < b.right + MARGIN && r.right > b.left - MARGIN && r.top < b.bottom + MARGIN && r.bottom > b.top - MARGIN) {
      return true;
    }
  }
  return false;
}

/**
 * "Back to top", bottom left (the WhatsApp button is bottom right). Shown
 * once the visitor is more than a screen down, and hidden while `hidden`
 * (the enquiry or search modal is open) or while it would cover a
 * keep-clear target.
 *
 * It looks again on every scroll and resize, and also when something moves
 * or changes size without a scroll (map tiles or images loading above a
 * target): a ResizeObserver watches the page and every target, and an
 * IntersectionObserver whose root is the button's own corner of the screen
 * reports any target moving into or out of it. A MutationObserver keeps both
 * watching targets that appear later.
 *
 * A click goes to the top (instantly with reduced motion) and moves focus to
 * the page's heading, so keyboard and screen-reader users land there too.
 */
export function ScrollToTop({ hidden = false }: { hidden?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const button = ref.current;
    if (!button) return;

    const check = () => {
      setScrolledDown(window.scrollY > window.innerHeight);
      setBlocked(overlapsKeepClear(button));
    };

    const watched = new WeakSet<Element>();
    const resizes = new ResizeObserver(check);
    resizes.observe(document.documentElement);

    let corner: IntersectionObserver | null = null;
    const watchCorner = () => {
      corner?.disconnect();
      const b = button.getBoundingClientRect();
      const inset = (n: number) => `${-Math.max(0, Math.round(n))}px`;
      corner = new IntersectionObserver(check, {
        rootMargin: [
          inset(b.top - MARGIN),
          inset(window.innerWidth - b.right - MARGIN),
          inset(window.innerHeight - b.bottom - MARGIN),
          inset(b.left - MARGIN)
        ].join(' ')
      });
      for (const el of document.querySelectorAll(KEEP_CLEAR)) corner.observe(el);
    };

    const watchTargets = () => {
      for (const el of document.querySelectorAll(KEEP_CLEAR)) {
        if (watched.has(el)) continue;
        watched.add(el);
        resizes.observe(el);
        corner?.observe(el);
      }
    };

    const onResize = () => {
      watchCorner();
      check();
    };

    const mutations = new MutationObserver(() => {
      watchTargets();
      check();
    });

    watchCorner();
    watchTargets();
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', onResize);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', onResize);
      resizes.disconnect();
      corner?.disconnect();
      mutations.disconnect();
    };
  }, []);

  const visible = scrolledDown && !blocked && !hidden;

  const toTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' });
    focusPageHeading();
  };

  return (
    <button
      ref={ref}
      type="button"
      data-scroll-top
      data-visible={visible}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      className="te-scroll-top glass glass--inverse glass--strong glass--round"
    >
      <ArrowUp className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
