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
          <span className="te-card-badge uppercase tracking-[0.2em] mb-3">
            Signature Itineraries
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[var(--brand-primary)] tracking-tight mb-4">
            Your Journey. Your Way.
          </h2>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
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
              className="te-card te-content-card overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Image & Days Banner */}
                <div className="te-card-photo relative h-52 overflow-hidden">
                  <img
                    src={tour.image}
                    alt={tour.title}
                    className="w-full h-full object-cover group-hover:scale-[1.035] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/70 via-40% to-transparent to-75%" />
                  
                  <div className="te-tour-badges"><div className="te-card-badge te-card-badge--photo">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{tour.days} Days / {tour.days - 1} Nights</span>
                  </div>

                  <div className="te-card-badge te-card-badge--photo">
                    From ${tour.priceFrom} USD
                  </div></div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="te-card-accent text-[10px] uppercase tracking-widest font-semibold">
                      {tour.category} Tour
                    </span>
                    <h3 className="te-card-title font-heading text-2xl font-bold">{tour.title}</h3>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 space-y-4">
                  <p className="te-card-accent text-xs font-serif italic">
                    “{tour.subtitle}”
                  </p>

                  <p className="te-card-description text-sm line-clamp-3">
                    {tour.shortDesc}
                  </p>

                  {/* Route Places Flow */}
                  <div>
                    <div className="te-route-heading flex items-center justify-between gap-3 mb-2">
                      <span className="te-card-meta text-[11px] font-bold uppercase tracking-wider block">
                        Journey Route:
                      </span>
                      {onViewRoute && tour.stops.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onViewRoute(tour)}
                          className="te-button te-button--text-link te-button--sm text-[11px] font-bold gap-1 shrink-0"
                        >
                          <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>View route on map</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tour.route.map((place, i) => (
                        <React.Fragment key={i}>
                          <span className="te-card-badge">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            <span>{place}</span>
                          </span>
                          {i < tour.route.length - 1 && (
                            <span className="te-card-meta self-center" aria-hidden="true">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="te-card-actions p-5 sm:p-6 pt-0 flex gap-3">
                <Link
                  to={paths.tour(tour.id)}
                  className="te-button te-button--secondary te-button--sm flex-1"
                >
                  <span>View Full Journey</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => onOpenInquiry(tour.title)}
                  className="te-button te-button--primary te-button--sm"
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
