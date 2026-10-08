import { useModalFocus } from '@/hooks/useModalFocus';
import { TravelImage } from '@/components/TravelImage';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHiddenGems } from '@/hooks/useSiteContent';
import { HiddenGem } from '../types';
import { Sparkles, MapPin, ArrowRight, X } from 'lucide-react';

interface HiddenGemsSectionProps {
  onOpenInquiry: (gemName: string) => void;
}

export const HiddenGemsSection: React.FC<HiddenGemsSectionProps> = ({ onOpenInquiry }) => {
  const HIDDEN_GEMS = useHiddenGems();
  const [selectedGem, setSelectedGem] = useState<HiddenGem | null>(null);
  const dialogRef = useModalFocus(Boolean(selectedGem), () => setSelectedGem(null));

  return (
    <section id="hidden-gems" className="py-24 bg-[var(--background-secondary)] text-[var(--text-primary)] relative overflow-hidden">
      <div className="te-container">
        
        {/* Header */}
        <div className="te-section-header border-b border-[var(--border-strong)]/60 pb-8">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--brand-primary)] bg-[var(--brand-secondary)]/10 px-4 py-1.5 rounded-full inline-block mb-3">
              Editorial Off-Beat Collection
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[var(--brand-primary)] tracking-tight">
              Not Everything Worth Seeing <br className="hidden sm:inline" />
              <span className="italic font-serif text-[var(--brand-primary)]">Is on the Map.</span>
            </h2>
          </div>
          <p className="text-[var(--text-primary)]/70 font-light max-w-md mt-4 md:mt-0 text-sm sm:text-base">
            For curious wanderers seeking untouched horizons. Uncover ancient waterfall caves, swimming elephants, and sea of clouds peaks.
          </p>
        </div>

        {/* Magazine Asymmetric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {HIDDEN_GEMS.map((gem, idx) => {
            // Asymmetric layout span rules
            const isLarge = idx === 0 || idx === 3;
            const spanClass = isLarge ? 'md:col-span-8 h-[400px]' : 'md:col-span-4 h-[400px]';

            return (
              <motion.div data-reveal
                key={gem.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                role="button" tabIndex={0} aria-label={`Open ${gem.name}`}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedGem(gem); } }}
              onClick={() => setSelectedGem(gem)}
                className={`te-card relative rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer group bg-[var(--inverse-surface)] border border-[var(--border-strong)]/50 flex flex-col justify-end p-6 sm:p-8 ${spanClass}`}
              >
                {/* Background Image */}
                <div className="absolute inset-0 overflow-hidden">
                  <TravelImage
                    src={gem.image}
                    alt={gem.name}
                    className="w-full h-full object-cover group-hover:scale-[1.035] transition-transform duration-700 ease-out"
                  />
                </div>

                {/* Dark Editorial Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--inverse-surface)] via-[var(--inverse-surface)]/50 to-transparent group-hover:from-[var(--inverse-surface)]/95 transition-colors duration-500" />

                {/* Top Badge */}
                <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent-text)] bg-[var(--inverse-surface)]/80 backdrop-blur-md px-3 py-1 rounded-full border border-[var(--accent)]/30">
                    {gem.tag}
                  </span>
                  <span className="text-xs text-white/70 font-medium flex items-center space-x-1 bg-black/30 px-2.5 py-1 rounded-full">
                    <MapPin className="w-3 h-3 text-[var(--accent-text)]" />
                    <span>{gem.region}</span>
                  </span>
                </div>

                {/* Content */}
                <div className="relative z-10 text-white space-y-2">
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold group-hover:text-[var(--accent-text)] transition-colors">
                    {gem.name}
                  </h3>

                  <p className="text-xs text-white/80 line-clamp-2 font-light leading-relaxed">
                    {gem.description}
                  </p>

                  <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-[var(--accent-text)] group-hover:text-white transition-colors">
                    <span>Discover Secret Spot</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>

      </div>

      {/* Hidden Gem Detail Modal */}
      <AnimatePresence>
        {selectedGem && (
          <motion.div data-reveal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedGem(null)}
          >
            <motion.div data-reveal
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              ref={dialogRef} role="dialog" aria-modal="true" aria-label="Hidden gem details" tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              className="te-modal-panel bg-[var(--surface)] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[var(--border-strong)]/60 relative text-[var(--text-primary)]"
            >
              <button
                type="button" aria-label="Close hidden gem details"
                onClick={() => setSelectedGem(null)}
                className="te-button te-button--icon glass-inverse absolute top-4 right-4 z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative h-64 sm:h-72">
                <TravelImage
                  src={selectedGem.image}
                  alt={selectedGem.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                  <span className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-bold">
                    {selectedGem.region}
                  </span>
                  <h3 className="font-heading text-3xl font-bold">{selectedGem.name}</h3>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                <div className="p-4 bg-[var(--background-secondary)] rounded-2xl border border-[var(--border-strong)]/40">
                  <span className="text-xs uppercase tracking-wider font-bold text-[var(--brand-primary)] block mb-1">
                    Why Travel Eye Recommends It:
                  </span>
                  <p className="text-sm font-semibold text-[var(--brand-primary)]">“{selectedGem.whyVisit}”</p>
                </div>

                <p className="text-sm text-[var(--text-primary)]/80 font-light leading-relaxed">
                  {selectedGem.description}
                </p>

                <div className="pt-4 border-t border-[var(--border-strong)]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <span className="text-xs text-[var(--text-primary)]/60 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" /> Secret Uncrowded Destination
                  </span>
                  <button
                    onClick={() => {
                      const name = selectedGem.name;
                      setSelectedGem(null);
                      onOpenInquiry(name);
                    }}
                    className="te-button te-button--primary px-6 py-3 font-bold text-xs"
                  >
                    Include in My Journey
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
};
