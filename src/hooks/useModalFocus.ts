import { useEffect, useRef } from 'react';

const focusable = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Isolate a modal, contain keyboard focus, lock scrolling and restore its trigger. */
export function useModalFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const panel = ref.current;
    if (!open || !panel) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    const isolated: Array<[HTMLElement, boolean]> = [];
    // Isolate siblings at every ancestor, without hiding the modal itself.
    let branch: HTMLElement = panel;
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== branch) {
          isolated.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    document.body.style.overflow = 'hidden';
    const controls = () => [...panel.querySelectorAll<HTMLElement>(focusable)].filter(el => el.getClientRects().length > 0 && !el.closest('[inert]'));
    const focusFirst = () => (panel.querySelector<HTMLElement>('[data-autofocus]') ?? controls()[0] ?? panel).focus({ preventScroll: true });
    const frame = requestAnimationFrame(focusFirst);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    const onFocus = (event: FocusEvent) => { if (!panel.contains(event.target as Node)) focusFirst(); };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus);
      document.body.style.overflow = overflow;
      for (const [element, inert] of isolated) element.inert = inert;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
