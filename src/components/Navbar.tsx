import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Menu, X, Compass, ArrowRight } from 'lucide-react';
import { useModalFocus } from '@/hooks/useModalFocus';
import { activeNavigationTarget } from '@/lib/activeNavigation';
import { BRAND_NAME } from '@shared/brand';
import { NAV_LINKS, paths } from '@shared/site-paths';
import { Logo } from './Logo';
import { SiteLink } from './SiteLink';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  onOpenSearch: () => void;
}

/**
 * The header: dark glass once the page has scrolled, over a dark gradient on
 * the page's photo before that (index.css, `.te-nav`). The current page's
 * link is marked (`aria-current`, a gold underline). On phones the links
 * open in a solid full-screen menu that holds focus until it closes (Escape,
 * the close button, or a link). No animation library: CSS transitions only.
 */
export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch }) => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuRef = useModalFocus(mobileMenuOpen, () => setMobileMenuOpen(false));
  const activeTarget = activeNavigationTarget(location.pathname, location.hash);

  // A navigation closes the menu, and so does widening past the phone layout.
  useEffect(() => setMobileMenuOpen(false), [location.key]);
  useEffect(() => {
    const desktop = matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = () => setMobileMenuOpen(false);
  const current = (to: string) =>
    activeTarget === to ? { 'aria-current': to.includes('#') ? ('location' as const) : ('page' as const), 'data-active': true } : {};

  return (
    <>
      <header
        data-scrolled={isScrolled}
        className="te-nav glass glass--inverse glass--strong fixed top-0 left-0 right-0 z-50"
      >
        <div className="te-container">
          <div className="flex items-center justify-between gap-2">
            {/* Brand Logo */}
            <SiteLink
              to="/"
              onClick={handleLinkClick}
              className="text-left rounded-lg p-1 transition-opacity hover:opacity-90"
              aria-label={`${BRAND_NAME} Homepage`}
            >
              <Logo variant="light" size="md" />
            </SiteLink>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6" aria-label="Main Navigation">
              {NAV_LINKS.map((link) => (
                <SiteLink
                  key={link.to}
                  to={link.to}
                  onClick={handleLinkClick}
                  className="te-nav-link text-sm font-medium tracking-wide"
                  {...current(link.to)}
                >
                  {link.label}
                  <span aria-hidden="true" className="te-nav-indicator" />
                </SiteLink>
              ))}
            </nav>

            {/* Right Side Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              <ThemeToggle />
              <button
                type="button"
                onClick={onOpenSearch}
                className="te-button te-button--icon te-button--ghost-inverse"
                aria-label="Search Destinations"
                title="Search Destinations"
              >
                <Search className="w-5 h-5" aria-hidden="true" />
              </button>

              <SiteLink to={paths.plan} onClick={handleLinkClick} className="te-button te-button--primary">
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Plan Your Trip</span>
              </SiteLink>
            </div>

            {/* Mobile: the theme, search and the menu */}
            <div className="flex items-center gap-1 lg:hidden">
              <ThemeToggle className="sm:hidden" />
              <button
                type="button"
                onClick={onOpenSearch}
                className="te-button te-button--icon te-button--ghost-inverse sm:hidden"
                aria-label="Search"
              >
                <Search className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="te-button te-button--icon te-button--ghost-inverse"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu: a dialog that keeps focus inside while open. */}
      {mobileMenuOpen && (
        <div
          ref={menuRef}
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          tabIndex={-1}
          className="fixed inset-0 z-[60] bg-[var(--inverse-deep)] text-[var(--on-inverse)] pt-24 px-6 pb-8 flex flex-col justify-between overflow-y-auto lg:hidden"
        >
          {/* Solid, not glass: a full-screen menu over moving page content must stay readable. */}
          <SiteLink to="/" onClick={handleLinkClick} className="absolute top-5 left-5 rounded-lg p-1" aria-label={`${BRAND_NAME} Homepage`}>
            <Logo variant="light" size="md" />
          </SiteLink>
          <button
            type="button"
            aria-label="Close menu"
            onClick={handleLinkClick}
            className="te-button te-button--icon te-button--ghost-inverse absolute top-5 right-5"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
          <nav aria-label="Mobile navigation" className="space-y-6">
            <div className="border-b border-[rgb(var(--pearl-channels)/.12)] pb-4">
              <p className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">Navigation</p>
              <div className="grid grid-cols-1 gap-2">
                {NAV_LINKS.map((link) => (
                  <SiteLink
                    key={link.to}
                    to={link.to}
                    onClick={handleLinkClick}
                    className="te-nav-link te-nav-link--mobile flex items-center justify-between text-left py-3 text-lg font-heading font-medium border-b border-[rgb(var(--pearl-channels)/.08)]"
                    {...current(link.to)}
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-60" aria-hidden="true" />
                  </SiteLink>
                ))}
              </div>
            </div>

            <SiteLink to={paths.plan} onClick={handleLinkClick} className="te-button te-button--primary w-full py-3.5">
              <Compass className="w-5 h-5" aria-hidden="true" />
              <span>Plan Your Journey</span>
            </SiteLink>
          </nav>

          <div className="pt-8 border-t border-[rgb(var(--pearl-channels)/.12)] text-center text-xs text-[var(--palette-muted-text)] space-y-1">
            <p className="font-heading italic text-sm text-[var(--accent)]">“See Sri Lanka Through a Different Eye.”</p>
            <p>© 2026 Travel Eye Sri Lanka</p>
          </div>
        </div>
      )}
    </>
  );
};
