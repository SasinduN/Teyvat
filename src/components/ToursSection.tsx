import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTours } from '@/hooks/useSiteContent';
import { TourPackage } from '../types';
import { Calendar, MapPin, ArrowRight, CheckCircle2, X, Compass } from 'lucide-react';

interface ToursSectionProps {
  onOpenInquiry: (tourTitle: string) => void;
}

export const ToursSection: React.FC<ToursSectionProps> = ({ onOpenInquiry }) => {
  const TOURS = useTours();
  const [selectedTour, setSelectedTour] = useState<TourPackage | null>(null);

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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C4737] block mb-2">
                      Journey Route:
                    </span>
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
                <button
                  onClick={() => setSelectedTour(tour)}
                  className="flex-1 py-3.5 bg-[#1C4737] hover:bg-[#0F2E23] text-[#FAF8F5] rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
                >
                  <span>View Full Journey</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

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

      {/* Tour Detail Modal */}
      <AnimatePresence>
        {selectedTour && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={() => setSelectedTour(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#D4C3B5]/60 relative text-[#1A1A1A]"
            >
              {/* Close Modal Button */}
              <button
                onClick={() => setSelectedTour(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header Image */}
              <div className="relative h-64 sm:h-80">
                <img
                  src={selectedTour.image}
                  alt={selectedTour.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#D4AF37]">
                    <Compass className="w-4 h-4" />
                    <span>{selectedTour.category} Expedition • {selectedTour.days} Days</span>
                  </div>
                  <h2 className="font-heading text-3xl font-bold">{selectedTour.title}</h2>
                  <p className="text-xs text-white/80">{selectedTour.subtitle}</p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="font-heading text-xl font-bold text-[#0F2E23] mb-2">Tour Overview</h3>
                  <p className="text-sm text-[#1A1A1A]/80 leading-relaxed font-light">{selectedTour.fullDesc}</p>
                </div>

                {/* Highlights */}
                <div className="bg-[#F5EFEB] p-5 rounded-2xl border border-[#D4C3B5]/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C4737] mb-3">
                    Journey Highlights
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTour.highlights.map((hl, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs text-[#1A1A1A]/90">
                        <CheckCircle2 className="w-4 h-4 text-[#1C4737] shrink-0 mt-0.5" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day-by-Day Timeline */}
                <div>
                  <h3 className="font-heading text-xl font-bold text-[#0F2E23] mb-4">Day-by-Day Itinerary</h3>
                  <div className="space-y-4">
                    {selectedTour.itinerary.map((day) => (
                      <div key={day.day} className="flex items-start space-x-4 p-4 rounded-2xl bg-white border border-[#D4C3B5]/30 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-[#0F2E23] text-[#D4AF37] font-bold flex items-center justify-center shrink-0 text-sm">
                          D{day.day}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-heading font-bold text-[#0F2E23] text-base">{day.title}</h4>
                            <span className="text-[10px] bg-[#1C4737]/10 text-[#1C4737] px-2 py-0.5 rounded-full font-semibold">
                              {day.location}
                            </span>
                          </div>
                          <p className="text-xs text-[#1A1A1A]/80 font-light mt-1 leading-relaxed">
                            {day.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Modal CTA */}
                <div className="pt-4 border-t border-[#D4C3B5]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-[#1A1A1A]/60 block">Price starting from</span>
                    <span className="font-heading text-2xl font-bold text-[#0F2E23]">
                      ${selectedTour.priceFrom} <span className="text-xs font-sans font-normal text-[#1A1A1A]/70">/ per person</span>
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const title = selectedTour.title;
                      setSelectedTour(null);
                      onOpenInquiry(title);
                    }}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#D4AF37] hover:bg-[#C5A059] text-[#0F2E23] font-bold rounded-2xl shadow-lg transition-all"
                  >
                    Book / Inquire This Tour
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
