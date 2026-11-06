import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Menu, X, Compass, ArrowRight, Heart } from 'lucide-react';
import { useModalFocus } from '@/hooks/useModalFocus';
import { useFeatures } from '@/hooks/useSiteContent';
import { activeNavigationTarget } from '@/lib/activeNavigation';
import { isNavGroup, navItems, navSections, paths } from '@shared/site-paths';
import { Logo } from './Logo';
import { NavDropdown } from './NavDropdown';
import { SiteLink } from './SiteLink';
import { ThemeToggle } from './ThemeToggle';
import { WishlistIcon } from './WishlistLink';
import { useWishlist } from '@/lib/wishlist';

interface NavbarProps {
  onOpenSearch: () => void;
}

/**
 * The header: a solid surface in the page's colours, except over the home
 * page's photo before it scrolls, where it's clear (index.css, `.te-nav`).
 * The current page's link is marked (`aria-current`, an underline), and so is the group
 * holding it (`NavDropdown`). On phones the groups are sections of a solid full-screen menu
 * that holds focus until it closes (Escape, the close button, or a link). No animation
 * library: CSS transitions only.
 */
export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch }) => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuRef = useModalFocus(mobileMenuOpen, () => setMobileMenuOpen(false));
  const activeTarget = activeNavigationTarget(location.pathname, location.hash);
  const features = useFeatures();
  const wishlist = useWishlist();
  const phoneActionsRef = useRef<HTMLDivElement>(null);

  // A navigation closes the menu, and so does widening until the links fit
  // (the menu button goes then: a container query, index.css, `.te-nav-links`).
  useEffect(() => setMobileMenuOpen(false), [location.key]);
  useEffect(() => {
    const closeOnDesktop = () => {
      if (phoneActionsRef.current && getComputedStyle(phoneActionsRef.current).display === 'none') setMobileMenuOpen(false);
    };
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
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
        data-home={location.pathname === paths.home}
        data-scrolled={isScrolled}
        className="te-nav fixed top-0 left-0 right-0 z-50"
      >
        <div className="te-container">
          <div className="flex items-center justify-between gap-2">
            {/* Brand Logo */}
            <SiteLink
              to="/"
              onClick={handleLinkClick}
              className="te-home-link text-left rounded-lg p-1 transition-opacity hover:opacity-90"
            >
              <Logo size="md" />
              <span className="sr-only"> homepage</span>
            </SiteLink>

            {/* Desktop Navigation Links */}
            <nav className="te-nav-links items-center" aria-label="Main Navigation">
              {navItems(features).map((item) =>
                isNavGroup(item) ? (
                  <NavDropdown key={item.label} label={item.label} links={item.links} activeTarget={activeTarget} />
                ) : (
                  <SiteLink
                    key={item.to}
                    to={item.to}
                    onClick={handleLinkClick}
                    className="te-nav-link font-medium"
                    {...current(item.to)}
                  >
                    {item.label}
                    <span aria-hidden="true" className="te-nav-indicator" />
                  </SiteLink>
                )
              )}
            </nav>

            {/* Right Side Buttons */}
            <div className="te-nav-actions hidden sm:flex items-center gap-3">
              <WishlistIcon onClick={handleLinkClick} />
              <ThemeToggle />
              <button
                type="button"
                onClick={onOpenSearch}
                className="te-button te-button--icon"
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
            <div ref={phoneActionsRef} className="te-nav-phone-actions flex items-center gap-1.5">
              <WishlistIcon onClick={handleLinkClick} className="sm:hidden te-wish-icon--phone" />
              <ThemeToggle className="sm:hidden" />
              <SiteLink
                to={paths.plan}
                onClick={handleLinkClick}
                className="te-button te-button--primary te-button--icon sm:hidden"
                aria-label="Plan Your Trip"
                title="Plan Your Trip"
              >
                <Compass className="w-5 h-5" aria-hidden="true" />
              </SiteLink>
              <button
                type="button"
                onClick={onOpenSearch}
                className="te-button te-button--icon sm:hidden"
                aria-label="Search"
              >
                <Search className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="te-button te-button--icon"
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
          className="te-mobile-navigation fixed inset-0 z-[60] pt-24 px-6 pb-8 flex flex-col justify-between overflow-y-auto"
        >
          {/* Solid, not glass: a full-screen menu over moving page content must stay readable. */}
          <SiteLink to="/" onClick={handleLinkClick} className="te-home-link absolute top-5 left-5 rounded-lg p-1">
            <Logo size="md" />
            <span className="sr-only"> homepage</span>
          </SiteLink>
          <button
            type="button"
            aria-label="Close menu"
            onClick={handleLinkClick}
            className="te-button te-button--icon absolute top-5 right-5"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
          <nav aria-label="Mobile navigation" className="space-y-6">
            <div className="space-y-6 pb-2" data-menu-sections>
              {navSections(features).map((section) => (
                <div key={section.label ?? section.links[0].to} data-menu-section={section.label ?? ''}>
                  {section.label && (
                    <p className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-semibold mb-2">{section.label}</p>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    {section.links.map((link) => (
                      <SiteLink
                        key={link.to}
                        to={link.to}
                        onClick={handleLinkClick}
                        className="te-nav-link te-nav-link--mobile flex items-center justify-between text-left py-3 text-lg font-heading font-medium border-b border-[var(--border)]"
                        {...current(link.to)}
                      >
                        <span>{link.label}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </SiteLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <SiteLink to={paths.plan} onClick={handleLinkClick} className="te-button te-button--primary w-full py-3.5">
              <Compass className="w-5 h-5" aria-hidden="true" />
              <span>Plan Your Journey</span>
            </SiteLink>
            {wishlist.available && (
              <SiteLink to={paths.wishlist} onClick={handleLinkClick} className="te-button te-button--secondary w-full py-3.5">
                <Heart className="w-5 h-5" aria-hidden="true" />
                <span>Wishlist{wishlist.items.length > 0 ? ` (${wishlist.items.length})` : ''}</span>
              </SiteLink>
            )}
          </nav>

          <div className="pt-8 border-t border-[var(--border)] text-center text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-heading text-sm text-[var(--accent-text)]">“See Sri Lanka Through a Different Eye.”</p>
            <p>© 2026 Travel Eye Sri Lanka</p>
          </div>
        </div>
      )}
    </>
  );
};
