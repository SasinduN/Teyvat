import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTours } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import { TourPackage } from '../types';
import { Calendar, MapPin, ArrowRight, Map as MapIcon } from 'lucide-react';

interface ToursSectionProps {
  onOpenInquiry: (tourTitle: string) => void;
  /** Shows the tour's route on the map (and scrolls there). */
  onViewRoute?: (tour: TourPackage) => void;
}

export const ToursSection: React.FC<ToursSectionProps> = ({ onOpenInquiry, onViewRoute }) => {
  const TOURS = useTours();

  return (
    <section id="tours" className="py-24 bg-[var(--background)] relative overflow-hidden">
      <div className="te-container">
        
        {/* Header */}
        <div className="te-section-header te-section-header--stack">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--brand-primary)] bg-[var(--brand-secondary)]/10 px-4 py-1.5 rounded-full inline-block mb-3">
            Signature Itineraries
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[var(--brand-primary)] tracking-tight mb-4">
            Your Journey. Your Way.
          </h2>
          <p className="text-lg text-[var(--text-primary)]/80 font-light leading-relaxed">
            Thoughtfully planned multi-day expeditions crafted by local experts to seamlessly weave Sri Lanka’s best highlights.
          </p>
        </div>

        {/* 4 Premium Tour Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {TOURS.map((tour, idx) => (
            <motion.div
              key={tour.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="te-card bg-[var(--surface)] rounded-3xl overflow-hidden shadow-xl border border-[var(--border-strong)]/50 hover:shadow-2xl transition-all duration-500 flex flex-col justify-between group"
            >
              <div>
                {/* Image & Days Banner */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={tour.image}
                    alt={tour.title}
                    className="w-full h-full object-cover group-hover:scale-[1.035] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent" />
                  
                  <div className="te-tour-badges"><div className="glass glass--inverse glass--strong absolute top-4 left-4 text-[var(--accent-text)] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{tour.days} Days / {tour.days - 1} Nights</span>
                  </div>

                  <div className="glass glass--inverse glass--strong absolute top-4 right-4 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    From ${tour.priceFrom} USD
                  </div></div>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--accent-text)] font-semibold">
                      {tour.category} Tour
                    </span>
                    <h3 className="font-heading text-2xl font-bold">{tour.title}</h3>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 sm:p-8 space-y-4">
                  <p className="text-xs text-[var(--brand-primary)] font-serif italic">
                    “{tour.subtitle}”
                  </p>

                  <p className="text-sm text-[var(--text-primary)]/80 font-light leading-relaxed line-clamp-3">
                    {tour.shortDesc}
                  </p>

                  {/* Route Places Flow */}
                  <div>
                    <div className="te-route-heading flex items-center justify-between gap-3 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)] block">
                        Journey Route:
                      </span>
                      {onViewRoute && tour.stops.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onViewRoute(tour)}
                          className="text-[11px] font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:underline underline-offset-2 flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>View route on map</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tour.route.map((place, i) => (
                        <React.Fragment key={i}>
                          <span className="text-xs bg-[var(--background-secondary)] text-[var(--brand-primary)] px-2.5 py-1 rounded-lg font-semibold border border-[var(--border-strong)]/40 flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-[var(--brand-primary)]" />
                            <span>{place}</span>
                          </span>
                          {i < tour.route.length - 1 && (
                            <span className="text-xs text-[var(--text-primary)]/30 self-center" aria-hidden="true">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 sm:p-8 pt-0 flex items-center gap-3">
                <Link
                  to={paths.tour(tour.id)}
                  className="te-button te-button--secondary flex-1 py-3.5 text-xs font-bold flex items-center justify-center space-x-2"
                >
                  <span>View Full Journey</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => onOpenInquiry(tour.title)}
                  className="te-button te-button--primary py-3.5 px-5 text-xs font-bold"
                >
                  Inquire
                </button>
              </div>

            </motion.div>
          ))}
        </div>

      </div>

    </section>
  );
};
