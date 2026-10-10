import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDestinations } from '@/hooks/useSiteContent';
import { useModalFocus } from '@/hooks/useModalFocus';
import { paths } from '@shared/site-paths';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose
}) => {
  // Hooks must run on every render — the `isOpen` early-return lives below
  // them, otherwise opening the modal changes the hook count and React throws.
  const DESTINATIONS = useDestinations();
  const [searchTerm, setSearchTerm] = useState('');
  // Keyboard focus stays in the dialog (starting in the search field), the
  // page behind is inert and doesn't scroll, Escape closes, and focus goes
  // back to what opened it.
  const dialogRef = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;

  const filtered = DESTINATIONS.filter((d) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      d.name.toLowerCase().includes(term) ||
      d.region.toLowerCase().includes(term) ||
      d.shortDescription.toLowerCase().includes(term) ||
      d.category.some((c) => c.toLowerCase().includes(term))
    );
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Search Sri Lanka destinations"
          tabIndex={-1}
          initial={{ scale: 0.95, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="te-modal-panel bg-[var(--surface)] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[var(--border-strong)]/60 relative text-[var(--text-primary)] space-y-6"
        >
          {/* Header Input */}
          <div className="flex items-center space-x-3 pb-4 border-b border-[var(--border-strong)]/40">
            <Search className="w-6 h-6 text-[var(--brand-primary)]" />
            <input
              type="text"
              data-autofocus
              aria-label="Search destinations"
              placeholder="Search Ella, Yala, Sigiriya, beaches, safaris..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-base sm:text-lg font-medium text-[var(--brand-primary)] placeholder-[var(--text-primary)]/40 focus:outline-none bg-transparent"
            />
            <button
              type="button" aria-label="Close search"
              onClick={onClose}
              className="te-button te-button--icon"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Suggestions */}
          <div>
            <span role="status" className="text-[11px] font-bold uppercase tracking-widest text-[var(--brand-primary)] block mb-3">
              {searchTerm ? `Matching Locations (${filtered.length})` : 'Featured Sri Lanka Destinations'}
            </span>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {filtered.slice(0, 6).map((dest) => (
                <Link
                  key={dest.id}
                  to={paths.destination(dest.id)}
                  onClick={onClose}
                  className="p-3.5 rounded-2xl bg-[var(--background)] hover:bg-[var(--background-secondary)] border border-[var(--border-strong)]/30 flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="flex min-w-0 items-center space-x-3">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-heading font-bold text-[var(--brand-primary)] text-base group-hover:text-[var(--brand-primary)]">
                          {dest.name}
                        </h4>
                        <span className="text-[10px] bg-[var(--brand-secondary)]/10 text-[var(--brand-primary)] px-2 py-0.5 rounded-full font-semibold">
                          {dest.region}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-primary)]/70 line-clamp-1">{dest.shortDescription}</p>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[var(--brand-primary)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-8 text-xs text-[var(--text-secondary)]">
                  No locations found matching “{searchTerm}”. Try searching for “Ella”, “Beaches”, or “Yala”.
                </div>
              )}
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
