import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useModalFocus } from '@/hooks/useModalFocus';
import { activeNavigationTarget } from '@/lib/activeNavigation';
import { Logo } from './Logo';
import { Search, Menu, X, Compass, ArrowRight } from 'lucide-react';
import { NAV_LINKS, paths } from '@shared/site-paths';
import { SiteLink } from './SiteLink';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch
}) => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuRef = useModalFocus(mobileMenuOpen, () => setMobileMenuOpen(false));
  const activeTarget = activeNavigationTarget(location.pathname, location.hash);

  useEffect(() => { setMobileMenuOpen(false); }, [location.key]);
  useEffect(() => {
    const breakpoint = matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => { if (breakpoint.matches) setMobileMenuOpen(false); };
    breakpoint.addEventListener("change", closeOnDesktop);
    return () => breakpoint.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        data-home={location.pathname === paths.home}
        data-scrolled={isScrolled}
        className="te-nav glass3d glass3d--navbar glass-navbar fixed top-0 left-0 right-0 z-50 text-white"
      >
        <div className="te-container">
          <div className="flex items-center justify-between">
            {/* Brand Logo */}
            <SiteLink
              to="/"
              onClick={handleLinkClick}
              className="text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-lg transition-transform hover:opacity-90"
              aria-label="Travel Eye Homepage"
            >
              <Logo variant="light" size="md" />
            </SiteLink>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-5" aria-label="Main Navigation">
              {NAV_LINKS.map((link) => (
                <SiteLink
                  key={link.to}
                  to={link.to}
                  aria-current={activeTarget === link.to ? link.to.includes('#') ? "location" : "page" : undefined} data-active={activeTarget === link.to}
                  onClick={handleLinkClick}
                  className="te-nav-link text-sm font-medium tracking-wide relative py-1"
                >
                  {link.label}
                  <span aria-hidden="true" className="te-nav-indicator" />
                </SiteLink>
              ))}
            </nav>

            {/* Right Side Buttons */}
            <div className="flex items-center gap-1 sm:gap-3 ml-auto xl:ml-0">
              <ThemeToggle />
              {/* Search Icon */}
              <button
                onClick={onOpenSearch}
                className="te-button te-button--icon hidden xl:inline-flex"
                aria-label="Search Destinations"
                title="Search Destinations"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Plan Your Trip CTA */}
              <SiteLink
                to={paths.plan}
                aria-label="Plan Your Trip" title="Plan Your Trip"
                className="te-nav-plan te-button te-button--primary te-button--sm"
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Plan Your Trip</span>
              </SiteLink>
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex items-center space-x-2 xl:hidden">
              <button
                onClick={onOpenSearch}
                className="te-button te-button--icon"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="te-button te-button--icon"
                aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}

        {mobileMenuOpen && (
          <div ref={menuRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Site navigation" tabIndex={-1}




            className="glass-navbar te-mobile-navigation fixed inset-0 z-[60] text-white pt-24 px-6 pb-8 flex flex-col justify-between overflow-y-auto xl:hidden"
          >
            <button type="button" aria-label="Close menu" onClick={handleLinkClick} className="te-button te-button--icon absolute top-6 right-6"><X className="w-5 h-5" /></button>
            <nav aria-label="Mobile navigation" className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <p className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-semibold mb-2">
                  Navigation
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {NAV_LINKS.map((link) => (
                    <SiteLink
                      key={link.to}
                      to={link.to}
                      aria-current={activeTarget === link.to ? link.to.includes('#') ? "location" : "page" : undefined} data-active={activeTarget === link.to}
                      onClick={handleLinkClick}
                      className="te-nav-link te-nav-link--mobile flex items-center justify-between text-left py-3 text-lg font-heading font-medium border-b border-white/5"
                    >
                      <span>{link.label}</span>
                      <ArrowRight className="w-4 h-4 text-white/40" />
                    </SiteLink>
                  ))}
                </div>
              </div>

              {/* Mobile CTA */}
              <div className="space-y-3">
                <SiteLink
                  to={paths.plan}
                  onClick={handleLinkClick}
                  className="te-button te-button--primary w-full py-3.5 font-bold flex items-center justify-center space-x-2"
                >
                  <Compass className="w-5 h-5" />
                  <span>Plan Your Journey</span>
                </SiteLink>
              </div>
            </nav>

            {/* Mobile Footer Info */}
            <div className="pt-8 border-t border-white/10 text-center text-xs text-white/60 space-y-1">
              <p className="font-heading italic text-sm text-[var(--accent-text)]">
                “See Sri Lanka Through a Different Eye.”
              </p>
              <p>© 2026 Travel Eye Sri Lanka</p>
            </div>
          </div>
        )}

    </>
  );
};
