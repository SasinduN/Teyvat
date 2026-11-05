import { TravelImage } from '@/components/TravelImage';
import { useDestinations } from '@/hooks/useSiteContent';
import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Compass, Sparkles, Heart } from 'lucide-react';

export const IntroSection: React.FC = () => {
  const destinations = useDestinations();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const reducedMotion = useReducedMotion();

  // Counter Hook
  const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!isInView) return;
      if (reducedMotion) { setCount(end); return; }
      const start = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        setCount(Math.round(end * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }, [isInView, end, duration, reducedMotion]);

    return count;
  };

  const unescoCount = useCounter(8, 1500);
  const coastlineCount = useCounter(1300, 2000);
  const parksCount = useCounter(26, 1800);
  const historyCount = useCounter(2500, 2200);

  return (
    <section id="about" ref={sectionRef} className="py-24 bg-[var(--background)] relative overflow-hidden">
      <div className="te-container">
        
        {/* Top Header */}
        <div className="te-section-header te-section-header--stack">
          <h2 className="font-heading text-5xl font-bold text-[var(--brand-primary)] tracking-tight mb-6">
            One Island. <span className="font-heading text-[var(--brand-primary)]">A Thousand Stories.</span>
          </h2>
          <p className="text-lg text-[var(--text-primary)]/80 leading-relaxed">
            Sri Lanka is more than a destination. It is a collection of places, people, flavours, landscapes and stories waiting to be discovered.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-20">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-[var(--surface)] p-6 sm:p-8 rounded-2xl shadow-sm border border-[var(--border-strong)]/30 text-center hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-[var(--brand-secondary)]/10 text-[var(--brand-primary)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[var(--brand-secondary)] group-hover:text-white transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="font-heading text-4xl font-bold text-[var(--brand-primary)] mb-1">
              {unescoCount}
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]/70 uppercase tracking-wide">
              UNESCO Heritage Sites
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[var(--surface)] p-6 sm:p-8 rounded-2xl shadow-sm border border-[var(--border-strong)]/30 text-center hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-[var(--brand-secondary)]/10 text-[var(--brand-primary)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[var(--brand-secondary)] group-hover:text-white transition-colors">
              <Compass className="w-6 h-6" />
            </div>
            <div className="font-heading text-4xl font-bold text-[var(--brand-primary)] mb-1">
              {coastlineCount}+ <span className="text-2xl font-sans font-normal text-[var(--brand-primary)]">km</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]/70 uppercase tracking-wide">
              Tropical Coastline
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-[var(--surface)] p-6 sm:p-8 rounded-2xl shadow-sm border border-[var(--border-strong)]/30 text-center hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-[var(--brand-secondary)]/10 text-[var(--brand-primary)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[var(--brand-secondary)] group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="font-heading text-4xl font-bold text-[var(--brand-primary)] mb-1">
              {parksCount}
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]/70 uppercase tracking-wide">
              National Parks
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-[var(--surface)] p-6 sm:p-8 rounded-2xl shadow-sm border border-[var(--border-strong)]/30 text-center hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-[var(--brand-secondary)]/10 text-[var(--brand-primary)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[var(--brand-secondary)] group-hover:text-white transition-colors">
              <Heart className="w-6 h-6" />
            </div>
            <div className="font-heading text-4xl font-bold text-[var(--brand-primary)] mb-1">
              {historyCount}+ <span className="text-2xl font-sans font-normal text-[var(--brand-primary)]">yrs</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]/70 uppercase tracking-wide">
              Living History
            </p>
          </motion.div>

        </div>

        {/* Asymmetric Image Collage */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-center">
          <div className="md:col-span-7 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8 }}
              className="relative z-10 rounded-3xl overflow-hidden shadow-xl aspect-[4/3] group"
            >
              <TravelImage
                src={destinations.find(destination => destination.id === 'ella')?.image ?? '/images/photo-unavailable.svg'}
                alt="Ella"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent" />
              {/* Clear of the second photo, which covers this one's bottom right from sm up. */}
              <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:max-w-[36%] text-white">
                <span className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-semibold">Highlands</span>
                <p className="font-heading text-xl font-bold">Misty Tea Estates of Ella & Nuwara Eliya</p>
              </div>
            </motion.div>

            {/* Overlapping Secondary Image */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden sm:block absolute -bottom-10 -right-6 z-20 w-3/5 rounded-2xl overflow-hidden shadow-2xl border-4 border-white aspect-[3/2] group"
            >
              <TravelImage
                src={destinations.find(destination => destination.id === 'mirissa')?.image ?? '/images/photo-unavailable.svg'}
                alt="Mirissa"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </motion.div>
          </div>

          <div className="md:col-span-5 min-w-0 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--brand-primary)]">
              The Travel Eye Identity
            </span>
            <h3 className="font-heading text-3xl font-bold text-[var(--brand-primary)] leading-tight">
              Curated for Travelers Who Seek Genuine Connection
            </h3>
            <p className="text-[var(--text-primary)]/80 leading-relaxed">
              From golden beaches framed by coconut palms to ancient granite fortresses soaring above rainforests, Sri Lanka condenses centuries of biodiversity and culture into one compact paradise.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2.5 shrink-0" />
                <p className="text-sm text-[var(--text-primary)]/90"><strong className="text-[var(--brand-primary)]">Signature Visual Map:</strong> Pinpoint exact coordinates across 20+ pristine destinations.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2.5 shrink-0" />
                <p className="text-sm text-[var(--text-primary)]/90"><strong className="text-[var(--brand-primary)]">Tailored Journeys:</strong> Build custom day-by-day itineraries based on your pace and passion.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
