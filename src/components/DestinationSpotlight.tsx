import React from 'react';
import { motion } from 'framer-motion';
import { useDestinations } from '@/hooks/useSiteContent';
import { Destination } from '../types';
import { ArrowUpRight, MapPin } from 'lucide-react';

interface DestinationSpotlightProps {
  onSelectDestination: (dest: Destination) => void;
}

export const DestinationSpotlight: React.FC<DestinationSpotlightProps> = ({
  onSelectDestination
}) => {
  const DESTINATIONS = useDestinations();
  // Select the 6 featured spotlight destinations
  const spotlightIds = ['ella', 'sigiriya', 'galle', 'mirissa', 'kandy', 'jaffna'];
  const spotlightDestinations = DESTINATIONS.filter((d) => spotlightIds.includes(d.id));

  return (
    <section id="destinations" className="py-24 bg-[#FBF9F6] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1C4737] bg-[#1C4737]/10 px-4 py-1.5 rounded-full inline-block mb-3">
              Editorial Spotlight
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[#0F2E23] tracking-tight">
              Places Worth Getting Lost In
            </h2>
          </div>
          <p className="text-[#1A1A1A]/70 font-light max-w-md mt-4 md:mt-0 text-sm sm:text-base">
            Hand-picked iconic regions that encapsulate Sri Lanka’s soul—from misty peaks and ancient citadels to turquoise bays and northern kovils.
          </p>
        </div>

        {/* 6 Large Editorial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {spotlightDestinations.map((dest, idx) => (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              onClick={() => onSelectDestination(dest)}
              className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-[#0F2E23] border border-[#D4C3B5]/40 h-[460px] flex flex-col justify-end"
            >
              {/* Background Image with Hover Zoom */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
                />
              </div>

              {/* Gradient Overlay with Deepening on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F2E23] via-[#0F2E23]/40 to-transparent group-hover:from-[#0F2E23]/95 group-hover:via-[#0F2E23]/60 transition-colors duration-500" />

              {/* Top Category & Location Badge */}
              <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white border border-white/20 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{dest.region}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:bg-[#D4AF37] group-hover:text-[#0F2E23] group-hover:scale-110 transition-all duration-300">
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>

              {/* Bottom Editorial Content */}
              <div className="relative z-10 p-6 sm:p-8 transform transition-transform duration-300 group-hover:-translate-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  {dest.category.slice(0, 2).map((c) => (
                    <span key={c} className="text-[11px] uppercase tracking-wider font-bold text-[#D4AF37]">
                      {c}
                    </span>
                  ))}
                  <span className="text-white/40 text-xs">•</span>
                  <span className="text-xs text-white/70">Best: {dest.bestTime}</span>
                </div>

                <h3 className="font-heading text-3xl font-bold text-white mb-2 group-hover:text-[#D4AF37] transition-colors">
                  {dest.name}
                </h3>

                <p className="text-sm text-white/80 line-clamp-2 font-light leading-relaxed mb-4">
                  {dest.shortDescription}
                </p>

                {/* Highlights pill tags */}
                <div className="flex flex-wrap gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  {dest.highlights.slice(0, 3).map((h, i) => (
                    <span key={i} className="text-[10px] bg-white/10 text-white/90 px-2.5 py-1 rounded-full border border-white/10 font-medium">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
