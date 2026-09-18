import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Search, Menu, X, Compass, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenPlanner: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenPlanner,
  onNavigateSection
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', id: 'hero' },
    { name: 'Explore', id: 'explore-map' },
    { name: 'Destinations', id: 'destinations' },
    { name: 'Experiences', id: 'experiences' },
    { name: 'Tours', id: 'tours' },
    { name: 'About', id: 'about' },
    { name: 'Contact', id: 'contact' }
  ];

  const handleLinkClick = (id: string) => {
    onNavigateSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-[#0F2E23]/90 backdrop-blur-md border-b border-white/10 py-3 shadow-xl text-white'
            : 'bg-gradient-to-b from-black/70 via-black/30 to-transparent py-5 text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Brand Logo */}
            <button
              onClick={() => handleLinkClick('hero')}
              className="text-left focus:outline-none focus:ring-2 focus:ring-[#D4AF37] rounded-lg p-1 transition-transform hover:opacity-90"
              aria-label="Travel Eye Homepage"
            >
              <Logo variant="light" size="md" />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-7" aria-label="Main Navigation">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.id)}
                  className="text-sm font-medium tracking-wide text-white/90 hover:text-[#D4AF37] transition-colors relative py-1 group"
                >
                  {link.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all duration-300 group-hover:w-full" />
                </button>
              ))}
            </nav>

            {/* Right Side Buttons */}
            <div className="hidden sm:flex items-center space-x-4">
              {/* Search Icon */}
              <button
                onClick={onOpenSearch}
                className="p-2.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                aria-label="Search Destinations"
                title="Search Destinations"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Plan Your Trip CTA */}
              <button
                onClick={onOpenPlanner}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:from-[#C5A059] hover:to-[#B89248] text-[#0F2E23] font-semibold text-sm px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Compass className="w-4 h-4" />
                <span>Plan Your Trip</span>
              </button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex items-center space-x-2 lg:hidden">
              <button
                onClick={onOpenSearch}
                className="p-2 text-white hover:bg-white/10 rounded-full"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-xl text-white hover:bg-white/10 transition-colors focus:outline-none"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-[#0F2E23] text-white pt-24 px-6 pb-8 flex flex-col justify-between overflow-y-auto lg:hidden"
          >
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold mb-2">
                  Navigation
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {navLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => handleLinkClick(link.id)}
                      className="flex items-center justify-between text-left py-3 text-lg font-heading font-medium text-white/90 hover:text-[#D4AF37] border-b border-white/5"
                    >
                      <span>{link.name}</span>
                      <ArrowRight className="w-4 h-4 text-white/40" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile CTA */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenPlanner();
                  }}
                  className="w-full py-3.5 bg-[#D4AF37] text-[#0F2E23] rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Compass className="w-5 h-5" />
                  <span>Plan Your Journey</span>
                </button>
              </div>
            </div>

            {/* Mobile Footer Info */}
            <div className="pt-8 border-t border-white/10 text-center text-xs text-white/60 space-y-1">
              <p className="font-heading italic text-sm text-[#D4AF37]">
                “See Sri Lanka Through a Different Eye.”
              </p>
              <p>© 2026 Travel Eye Sri Lanka</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
