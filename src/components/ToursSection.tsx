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
    <section id="tours" className="py-24 bg-[#FBF9F6] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1C4737] bg-[#1C4737]/10 px-4 py-1.5 rounded-full inline-block mb-3">
            Signature Itineraries
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[#0F2E23] tracking-tight mb-4">
            Your Journey. Your Way.
          </h2>
          <p className="text-lg text-[#1A1A1A]/80 font-light leading-relaxed">
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
              className="bg-white rounded-3xl overflow-hidden shadow-xl border border-[#D4C3B5]/50 hover:shadow-2xl transition-all duration-500 flex flex-col justify-between group"
            >
              <div>
                {/* Image & Days Banner */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={tour.image}
                    alt={tour.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  
                  <div className="absolute top-4 left-4 bg-[#0F2E23]/90 text-[#D4AF37] px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#D4AF37]/30 flex items-center space-x-1.5 shadow-md">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{tour.days} Days / {tour.days - 1} Nights</span>
                  </div>

                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold border border-white/20">
                    From ${tour.priceFrom} USD
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold">
                      {tour.category} Tour
                    </span>
                    <h3 className="font-heading text-2xl font-bold">{tour.title}</h3>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 sm:p-8 space-y-4">
                  <p className="text-xs text-[#1C4737] font-serif italic">
                    “{tour.subtitle}”
                  </p>

                  <p className="text-sm text-[#1A1A1A]/80 font-light leading-relaxed line-clamp-3">
                    {tour.shortDesc}
                  </p>

                  {/* Route Places Flow */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C4737] block">
                        Journey Route:
                      </span>
                      {onViewRoute && tour.stops.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onViewRoute(tour)}
                          className="text-[11px] font-bold text-[#1C4737] hover:text-[#0F2E23] hover:underline underline-offset-2 flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>View route on map</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tour.route.map((place, i) => (
                        <React.Fragment key={i}>
                          <span className="text-xs bg-[#F5EFEB] text-[#0F2E23] px-2.5 py-1 rounded-lg font-semibold border border-[#D4C3B5]/40 flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-[#1C4737]" />
                            <span>{place}</span>
                          </span>
                          {i < tour.route.length - 1 && (
                            <span className="text-xs text-[#1A1A1A]/30 self-center">→</span>
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
                  className="flex-1 py-3.5 bg-[#1C4737] hover:bg-[#0F2E23] text-[#FAF8F5] rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
                >
                  <span>View Full Journey</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => onOpenInquiry(tour.title)}
                  className="py-3.5 px-5 bg-[#D4AF37] hover:bg-[#C5A059] text-[#0F2E23] rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
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
