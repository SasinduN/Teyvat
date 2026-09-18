import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { useDestinations } from '@/hooks/useSiteContent';
import { Destination } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (dest: Destination) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectDestination
}) => {
  // Hooks must run on every render — the `isOpen` early-return lives below
  // them, otherwise opening the modal changes the hook count and React throws.
  const DESTINATIONS = useDestinations();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = DESTINATIONS.filter((d) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
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
          initial={{ scale: 0.95, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#D4C3B5]/60 relative text-[#1A1A1A] space-y-6"
        >
          {/* Header Input */}
          <div className="flex items-center space-x-3 pb-4 border-b border-[#D4C3B5]/40">
            <Search className="w-6 h-6 text-[#1C4737]" />
            <input
              type="text"
              autoFocus
              placeholder="Search Ella, Yala, Sigiriya, beaches, safaris..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-base sm:text-lg font-medium text-[#0F2E23] placeholder-[#1A1A1A]/40 focus:outline-none bg-transparent"
            />
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#F5EFEB] text-[#1A1A1A]/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Suggestions */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#1C4737] block mb-3">
              {searchTerm ? `Matching Locations (${filtered.length})` : 'Featured Sri Lanka Destinations'}
            </span>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {filtered.slice(0, 6).map((dest) => (
                <div
                  key={dest.id}
                  onClick={() => {
                    onClose();
                    onSelectDestination(dest);
                  }}
                  className="p-3.5 rounded-2xl bg-[#FBF9F6] hover:bg-[#F5EFEB] border border-[#D4C3B5]/30 flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-heading font-bold text-[#0F2E23] text-base group-hover:text-[#1C4737]">
                          {dest.name}
                        </h4>
                        <span className="text-[10px] bg-[#1C4737]/10 text-[#1C4737] px-2 py-0.5 rounded-full font-semibold">
                          {dest.region}
                        </span>
                      </div>
                      <p className="text-xs text-[#1A1A1A]/70 line-clamp-1">{dest.shortDescription}</p>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#1C4737] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-8 text-xs text-[#1A1A1A]/60">
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
