import { TravelImage } from '@/components/TravelImage';
import { useModalFocus } from '@/hooks/useModalFocus';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHiddenGems } from '@/hooks/useSiteContent';
import { HiddenGem } from '../types';
import { ArrowRight, X } from 'lucide-react';

interface HiddenGemsSectionProps {
  onOpenInquiry: (gemName: string) => void;
}

export const HiddenGemsSection: React.FC<HiddenGemsSectionProps> = ({ onOpenInquiry }) => {
  const HIDDEN_GEMS = useHiddenGems();
  const [selectedGem, setSelectedGem] = useState<HiddenGem | null>(null);
  // Keyboard focus stays in the dialog, Escape closes it, and focus returns to the card.
  const dialogRef = useModalFocus(Boolean(selectedGem), () => setSelectedGem(null));

  return (
    <section id="hidden-gems" className="py-24 bg-[var(--background-secondary)] text-[var(--text-primary)] relative overflow-hidden">
      <div className="te-container">
        
        {/* Header */}
        <div className="te-section-header te-ed-head">
          <h2 className="te-ed-title font-heading">Quieter places</h2>
          <p>Waterfall caves, swimming elephants and peaks above the clouds, away from the main route.</p>
        </div>

        {/* Magazine Asymmetric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {HIDDEN_GEMS.map((gem, idx) => {
            // Asymmetric layout span rules
            const isLarge = idx === 0 || idx === 3;
            const spanClass = isLarge ? 'md:col-span-6 lg:col-span-8 min-h-[25rem]' : 'md:col-span-6 lg:col-span-4 min-h-[25rem]';

            return (
              <motion.div
                key={gem.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                role="button"
                tabIndex={0}
                aria-label={`Open ${gem.name}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedGem(gem);
                  }
                }}
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
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--inverse-surface)] via-[var(--inverse-surface)]/60 to-transparent group-hover:from-[var(--inverse-surface)]/95 transition-colors duration-500" />

                {/* Top Badge */}
                <div className="relative z-10 mb-auto flex flex-wrap items-center justify-between gap-2 pb-4">
                  <span className="text-xs uppercase font-bold tracking-wider text-white bg-[var(--inverse-surface)] px-2 py-1 rounded">
                    {gem.tag}
                  </span>
                  <span className="text-xs text-white font-medium bg-[var(--inverse-surface)] px-2 py-1 rounded">
                    <span>{gem.region}</span>
                  </span>
                </div>

                {/* Content */}
                <div className="relative z-10 text-white space-y-2">
                  <h3 className="font-heading text-2xl font-bold group-hover:text-[var(--accent-text)] transition-colors">
                    {gem.name}
                  </h3>

                  <p className="text-sm text-white/90 line-clamp-2 leading-relaxed">
                    {gem.description}
                  </p>

                  <div className="pt-2 flex items-center space-x-2 text-sm font-semibold text-[var(--accent-text)] group-hover:text-white transition-colors">
                    <span>Read more</span>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedGem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Hidden gem details"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              className="te-modal-panel bg-[var(--surface)] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[var(--border-strong)]/60 relative text-[var(--text-primary)]"
            >
              <button
                type="button"
                aria-label="Close hidden gem details"
                onClick={() => setSelectedGem(null)}
                className="te-button te-button--icon glass glass--inverse absolute top-4 right-4 z-20"
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
                    Why go
                  </span>
                  <p className="text-sm font-semibold text-[var(--brand-primary)]">“{selectedGem.whyVisit}”</p>
                </div>

                <p className="text-sm text-[var(--text-primary)]/80 leading-relaxed">
                  {selectedGem.description}
                </p>

                <div className="pt-4 border-t border-[var(--border-strong)]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <span className="text-xs text-[var(--text-secondary)]">Usually quiet</span>
                  <button
                    onClick={() => {
                      const name = selectedGem.name;
                      setSelectedGem(null);
                      onOpenInquiry(name);
                    }}
                    className="te-button te-button--primary px-6 py-3 font-bold"
                  >
                    Add to My Trip
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
