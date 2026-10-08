import React from 'react';
import { motion } from 'framer-motion';
import { Compass, MapPin } from 'lucide-react';

interface CTASectionProps {
  onPlanClick: () => void;
  onExploreClick: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onPlanClick, onExploreClick }) => {
  return (
    <section id="contact" className="relative py-28 sm:py-36 bg-[#0F2E23] text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000"
          alt="Sri Lankan sunset coast"
          className="w-full h-full object-cover object-center scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F2E23] via-[#0F2E23]/80 to-[#0F2E23]/90" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#D4AF37] bg-white/10 px-4 py-1.5 rounded-full inline-block border border-[#D4AF37]/30">
            Begin Your Journey
          </span>

          <h2 className="font-heading text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            Your Sri Lanka Story <br className="hidden sm:inline" />
            <span className="italic font-serif text-[#D4AF37]">Starts Here.</span>
          </h2>

          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto font-light leading-relaxed">
            Tell us what you want to experience. We’ll help you discover where to go next.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={onPlanClick}
              className="w-full sm:w-auto px-9 py-4 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:from-[#C5A059] hover:to-[#B89248] text-[#0F2E23] font-bold text-base rounded-full shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            >
              <Compass className="w-5 h-5" />
              <span>Plan My Trip</span>
            </button>

            <button
              onClick={onExploreClick}
              className="w-full sm:w-auto px-9 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-base rounded-full border border-white/20 backdrop-blur-md transition-all flex items-center justify-center space-x-2"
            >
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              <span>Explore Sri Lanka</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
