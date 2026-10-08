import { TravelImage } from '@/components/TravelImage';
import React from 'react';
import { motion } from 'framer-motion';
import { Compass, MapPin } from 'lucide-react';

interface CTASectionProps {
  onPlanClick: () => void;
  onExploreClick: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onPlanClick, onExploreClick }) => {
  return (
    <section id="contact" className="relative py-28 sm:py-36 bg-[var(--inverse-surface)] text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <TravelImage
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg/1280px-Sunset_in_Mirissa_5_March_2023%2C_Sri_Lanka.jpg"
          alt="Sri Lankan sunset coast"
          className="w-full h-full object-cover object-center scale-105"
        />
        <div className="te-contact-overlay absolute inset-0" />
      </div>

      <div className="te-container relative z-10">
        <motion.div data-reveal
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="te-contact-copy te-reading-column space-y-6"
        >
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-[var(--accent-text)] inline-block">
            Begin Your Journey
          </span>

          <h2 className="font-heading text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            Your Sri Lanka Story <br className="hidden sm:inline" />
            <span className="italic font-serif text-[var(--accent-text)]">Starts Here.</span>
          </h2>

          <p className="text-lg sm:text-xl text-white/90 max-w-2xl font-light leading-relaxed">
            Tell us what you want to experience. We’ll help you discover where to go next.
          </p>

          <div className="te-cta-group pt-6 flex flex-col sm:flex-row gap-4 sm:gap-6">
            <button
              onClick={onPlanClick}
              className="te-button te-button--primary w-full sm:w-auto px-9 py-4 font-bold text-base flex items-center justify-center space-x-2"
            >
              <Compass className="w-5 h-5" />
              <span>Plan My Trip</span>
            </button>

            <button
              onClick={onExploreClick}
              className="te-button te-button--outline w-full sm:w-auto px-9 py-4 font-semibold text-base flex items-center justify-center space-x-2"
            >
              <MapPin className="w-5 h-5 text-[var(--accent-text)]" />
              <span>Explore Sri Lanka</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
