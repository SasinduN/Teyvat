import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Destination } from '../types';
import { X, Sparkles, Star, CheckCircle2, Compass, ArrowRight } from 'lucide-react';

interface DestinationModalProps {
  destination: Destination | null;
  onClose: () => void;
  onOpenInquiry: (destinationName: string) => void;
}

export const DestinationModal: React.FC<DestinationModalProps> = ({
  destination,
  onClose,
  onOpenInquiry
}) => {
  if (!destination) return null;

  const [activeImage, setActiveImage] = useState(destination.image);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#D4C3B5]/60 relative text-[#1A1A1A]"
        >
          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 w-10 h-10 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Hero Banner / Gallery */}
          <div className="relative h-72 sm:h-96 bg-black overflow-hidden">
            <img
              src={activeImage}
              alt={destination.name}
              className="w-full h-full object-cover transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute top-6 left-6 flex items-center space-x-2">
              <span className="bg-[#0F2E23]/90 text-[#D4AF37] px-3.5 py-1 rounded-full text-xs font-bold border border-[#D4AF37]/30 flex items-center gap-1 shadow-md">
                <Star className="w-3.5 h-3.5 fill-[#D4AF37]" /> {destination.rating}
              </span>
              <span className="bg-white/20 backdrop-blur-md text-white px-3.5 py-1 rounded-full text-xs font-semibold border border-white/20">
                {destination.region} Region
              </span>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
              <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
                {destination.province}
              </p>
              <h2 className="font-heading text-3xl sm:text-5xl font-bold">{destination.name}</h2>
            </div>
          </div>

          {/* Gallery Thumbnails */}
          {destination.gallery && destination.gallery.length > 0 && (
            <div className="flex gap-2 p-4 bg-[#F5EFEB] border-b border-[#D4C3B5]/40 overflow-x-auto">
              <button
                onClick={() => setActiveImage(destination.image)}
                className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  activeImage === destination.image ? 'border-[#0F2E23] scale-105' : 'border-transparent opacity-70'
                }`}
              >
                <img src={destination.image} alt={destination.name} className="w-full h-full object-cover" />
              </button>
              {destination.gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    activeImage === img ? 'border-[#0F2E23] scale-105' : 'border-transparent opacity-70'
                  }`}
                >
                  <img src={img} alt={`${destination.name} ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Body Content */}
          <div className="p-6 sm:p-10 space-y-8">
            
            {/* Short & Long Description */}
            <div className="space-y-3">
              <h3 className="font-heading text-2xl font-bold text-[#0F2E23]">About {destination.name}</h3>
              <p className="text-[#1A1A1A]/85 font-light text-base leading-relaxed">
                {destination.longDescription}
              </p>
            </div>

            {/* Quick Fact Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-5 bg-[#FBF9F6] rounded-2xl border border-[#D4C3B5]/40">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#1C4737] tracking-wider block">Best Visiting Season</span>
                <span className="text-sm font-semibold text-[#0F2E23]">{destination.bestTime}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#1C4737] tracking-wider block">Elevation / Terrain</span>
                <span className="text-sm font-semibold text-[#0F2E23]">{destination.elevation || destination.region}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[#1C4737] tracking-wider block">Ideal Travel For</span>
                <span className="text-sm font-semibold text-[#0F2E23]">{destination.idealFor.join(', ')}</span>
              </div>
            </div>

            {/* Top Experiences */}
            <div>
              <h4 className="font-heading text-xl font-bold text-[#0F2E23] mb-4 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#1C4737]" />
                <span>Must-Do Experiences in {destination.name}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {destination.experiences.map((exp, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#F5EFEB] border border-[#D4C3B5]/40 flex items-start space-x-3">
                    <CheckCircle2 className="w-4 h-4 text-[#1C4737] shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-[#0F2E23]">{exp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights Pills */}
            <div>
              <h4 className="text-xs uppercase font-bold text-[#1C4737] tracking-wider mb-2">Key Highlights</h4>
              <div className="flex flex-wrap gap-2">
                {destination.highlights.map((h, i) => (
                  <span key={i} className="text-xs bg-[#0F2E23] text-[#D4AF37] px-3 py-1 rounded-full font-semibold">
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal CTA */}
            <div className="pt-6 border-t border-[#D4C3B5]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-xs text-[#1A1A1A]/70">
                <Compass className="w-4 h-4 text-[#1C4737]" />
                <span>Need tailored hotel or private guide arrangements for {destination.name}?</span>
              </div>

              <button
                onClick={() => {
                  const name = destination.name;
                  onClose();
                  onOpenInquiry(name);
                }}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:from-[#C5A059] hover:to-[#B89248] text-[#0F2E23] font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>Plan A Trip to {destination.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
