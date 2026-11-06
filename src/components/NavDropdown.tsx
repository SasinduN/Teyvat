import React, { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { NavLink } from '@shared/site-paths';
import { SiteLink } from './SiteLink';

/**
 * A group in the header: a real button that opens a list of real links (the
 * disclosure pattern, not `role="menu"`: these are links to pages). The button's
 * own Enter and Space open it; the arrow keys, Home and End move inside; Escape
 * closes it and returns to the button; so do a click outside, and Tab out of it.
 *
 * The links stay in the DOM while closed (`hidden`), so they're still links to crawlers.
 */
export const NavDropdown: React.FC<{
  label: string;
  links: ReadonlyArray<NavLink>;
  activeTarget: string | undefined;
}> = ({ label, links, activeTarget }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  /** Which link takes focus once the list is open. */
  const focusOnOpen = useRef<'first' | 'last' | null>(null);
  const location = useLocation();
  const menuId = useId();
  const active = links.some((link) => link.to === activeTarget);

  const items = () => [...(root.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];

  useEffect(() => setOpen(false), [location.key]);

  useEffect(() => {
    if (!open) return;
    if (focusOnOpen.current) {
      (focusOnOpen.current === 'first' ? items()[0] : items().at(-1))?.focus();
      focusOnOpen.current = null;
    }
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const onButton = event.target === button.current;
    if (onButton && !open) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      focusOnOpen.current = event.key === 'ArrowDown' ? 'first' : 'last';
      setOpen(true);
      return;
    }
    if (!open) return;
    event.preventDefault();
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLAnchorElement);
    const next =
      event.key === 'Home' ? 0
        : event.key === 'End' ? list.length - 1
          : event.key === 'ArrowDown' ? (at + 1) % list.length
            : (at <= 0 ? list.length : at) - 1;
    list[next]?.focus();
  };

  return (
    <div
      ref={root}
      className="te-nav-group"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        // Null when the window loses focus or a click lands on nothing focusable (handled above).
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className="te-nav-link te-nav-trigger font-medium"
        aria-expanded={open}
        aria-controls={menuId}
        aria-current={active ? 'true' : undefined}
        data-active={active || undefined}
        onClick={() => setOpen((was) => !was)}
      >
        {label}
        <ChevronDown className="te-nav-chevron" aria-hidden="true" />
        <span aria-hidden="true" className="te-nav-indicator" />
      </button>
      <ul id={menuId} className="te-nav-menu" hidden={!open}>
        {links.map((link) => (
          <li key={link.to}>
            <SiteLink
              to={link.to}
              className="te-nav-menu-link"
              onClick={() => setOpen(false)}
              {...(link.to === activeTarget
                ? { 'aria-current': link.to.includes('#') ? ('location' as const) : ('page' as const) }
                : {})}
            >
              {link.label}
            </SiteLink>
          </li>
        ))}
      </ul>
    </div>
  );
};
