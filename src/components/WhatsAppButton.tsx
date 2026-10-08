import React, { useEffect, useRef, useState } from 'react';

interface WhatsAppButtonProps {
  /** The `https://wa.me/…` link, message included (`shared/whatsapp.ts`). */
  href: string;
  /** Hidden outright, e.g. while the enquiry form is open. */
  hidden?: boolean;
}

/**
 * What the button must never sit on top of: the map's zoom buttons
 * (Leaflet's own class) and anything marked `data-keep-clear` (the map's
 * Quick Jump bar, and the main button at the foot of the destination and
 * tour modals).
 */
const KEEP_CLEAR = '.leaflet-control-zoom, [data-keep-clear]';

/** Breathing room around the button, in px. */
const MARGIN = 8;

/** Whether the button's box, grown by MARGIN, overlaps any keep-clear target. */
function overlapsKeepClear(button: HTMLElement): boolean {
  const b = button.getBoundingClientRect();
  for (const el of document.querySelectorAll(KEEP_CLEAR)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (
      r.left < b.right + MARGIN &&
      r.right > b.left - MARGIN &&
      r.top < b.bottom + MARGIN &&
      r.bottom > b.top - MARGIN
    ) {
      return true;
    }
  }
  return false;
}

/**
 * A round WhatsApp chat button, fixed at the bottom right of the public site.
 *
 * A plain link: no widget, no script, no tracking. It sits above the
 * destination and tour modals (their context is what the message names), and
 * fades out, untappable and out of the tab order, while it would cover a
 * keep-clear target. Overlap is checked on any scroll (the page's or a
 * modal's), on resize, and when the page's content changes.
 */
export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ href, hidden = false }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Fade in after the first paint.
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let frame = 0;
    let settle = 0;
    const check = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (ref.current) setBlocked(overlapsKeepClear(ref.current));
      });
    };
    // Modals and the map scale or fly into place: look again once they've settled.
    const checkSoon = () => {
      check();
      window.clearTimeout(settle);
      settle = window.setTimeout(check, 450);
    };

    check();
    document.addEventListener('scroll', check, { capture: true, passive: true });
    window.addEventListener('resize', check);
    const observer = new MutationObserver(checkSoon);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      document.removeEventListener('scroll', check, { capture: true });
      window.removeEventListener('resize', check);
      observer.disconnect();
    };
  }, []);

  const visible = ready && !hidden && !blocked;

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      data-whatsapp-button
      data-state={visible ? 'shown' : 'hidden'}
      className={`fixed z-[60] right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] w-14 h-14 rounded-full bg-[#1C4737] hover:bg-[#0F2E23] text-[#F5EFEB] ring-1 ring-[#D4AF37]/40 shadow-lg hover:shadow-xl flex items-center justify-center transition-[opacity,visibility,background-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 ${
        visible ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      {/* The WhatsApp glyph (Simple Icons, CC0), in the site's palette. */}
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    </a>
  );
};
