import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Car } from 'lucide-react';
import { SiteLink } from './SiteLink';
import { paths } from '@shared/site-paths';
import '@/styles/floating-booking.css';

const KEEP_CLEAR = '.leaflet-control-zoom, [data-keep-clear], main .te-button, main button, main input, main select, main textarea, form button, form input[type="submit"], [data-cookie-banner], [data-sticky-navigation]';
const MODALS = '[aria-modal="true"], dialog[open]';

/** A single navigation link; never a second form or a WhatsApp redirect. */
export function FloatingBookingCTA({ hidden, aboveWhatsApp }: { hidden: boolean; aboveWhatsApp: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [clear, setClear] = useState(false);

  useEffect(() => {
    const button = ref.current;
    if (!button) return;
    let frame = 0;
    const check = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const b = button.getBoundingClientRect();
        const header = document.querySelector('header')?.getBoundingClientRect();
        const modal = [...document.querySelectorAll(MODALS)].some(el => el.getBoundingClientRect().height > 0);
        const blocked = [...document.querySelectorAll(KEEP_CLEAR)].some(el => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return false;
          return r.left < b.right + 8 && r.right > b.left - 8 && r.top < b.bottom + 8 && r.bottom > b.top - 8;
        });
        setClear(!modal && !blocked && b.top >= Math.max(8, header?.bottom ?? 0) + 8 && b.right <= innerWidth && b.bottom <= innerHeight);
      });
    };
    const sizes = new ResizeObserver(check);
    sizes.observe(document.body);
    const watched = new WeakSet<Element>();
    let corner: IntersectionObserver | null = null;
    const watch = () => {
      for (const el of document.querySelectorAll(KEEP_CLEAR)) {
        if (watched.has(el)) continue;
        watched.add(el); sizes.observe(el); corner?.observe(el);
      }
    };
    const resize = () => {
      corner?.disconnect();
      const b = button.getBoundingClientRect();
      const inset = (n: number) => `${-Math.max(0, Math.round(n))}px`;
      corner = new IntersectionObserver(check, { rootMargin: [inset(b.top - 8), inset(innerWidth - b.right - 8), inset(innerHeight - b.bottom - 8), inset(b.left - 8)].join(' ') });
      for (const el of document.querySelectorAll(KEEP_CLEAR)) corner.observe(el);
      check();
    };
    const changes = new MutationObserver(() => { watch(); check(); });
    changes.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'aria-modal', 'class', 'style'] });
    resize(); watch(); check();
    document.addEventListener('scroll', check, { capture: true, passive: true });
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); sizes.disconnect(); corner?.disconnect(); changes.disconnect(); document.removeEventListener('scroll', check, { capture: true }); window.removeEventListener('resize', resize); };
  }, [aboveWhatsApp]);

  const visible = clear && !hidden;
  return <SiteLink ref={ref} to={paths.booking} aria-label="Book your ride — open the ride request page" aria-hidden={!visible} tabIndex={visible ? 0 : -1}
    data-floating-booking data-state={visible ? 'shown' : 'hidden'} data-above-whatsapp={aboveWhatsApp} className="floating-booking">
    <span className="floating-booking-content"><Car size={20} aria-hidden="true" />
      <span className="floating-booking-full">Book Your Ride</span><span className="floating-booking-short">Book Now</span>
      <ArrowRight size={16} aria-hidden="true" /></span>
  </SiteLink>;
}
