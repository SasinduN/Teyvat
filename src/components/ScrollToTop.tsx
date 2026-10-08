import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { scrollToTop } from '@/lib/scrollToTop';

/** Native page scrolling, with the same protected-control convention as WhatsApp. */
export function ScrollToTop({ hidden = false }: { hidden?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const button = ref.current;
        if (!button) return;
        if (window.scrollY <= Math.max(600, window.innerHeight * .8) || document.querySelector('[aria-modal="true"]')) {
          setVisible(false);
          return;
        }
        const bounds = button.getBoundingClientRect();
        const blocked = [...document.querySelectorAll('footer, .leaflet-control-zoom, [data-keep-clear]')].some(element => {
          const target = element.getBoundingClientRect();
          return target.width > 0 && target.height > 0 && target.left < bounds.right + 8 && target.right > bounds.left - 8 && target.top < bounds.bottom + 8 && target.bottom > bounds.top - 8;
        });
        setVisible(window.scrollY > Math.max(600, window.innerHeight * .8) && !blocked && !document.querySelector('[aria-modal="true"]'));
      });
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      observer.disconnect();
    };
  }, []);

  return <button ref={ref} type="button" className="glass3d glass3d--floating glass-floating te-scroll-top" data-visible={visible && !hidden}
    aria-label="Scroll to top" title="Scroll to top" tabIndex={visible && !hidden ? 0 : -1}
    onClick={scrollToTop}>
    <ArrowUp size={20} aria-hidden="true" />
  </button>;
}
