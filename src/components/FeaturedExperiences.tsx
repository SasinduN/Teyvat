import React from 'react';
import { motion } from 'framer-motion';
import { useFeaturedExperiences } from '@/hooks/useSiteContent';
import { ExperienceItem } from '../types';
import { Clock, MapPin, Sparkles, ArrowRight, Star } from 'lucide-react';

interface FeaturedExperiencesProps {
  onSelectExperience: (exp: ExperienceItem) => void;
}

export const FeaturedExperiences: React.FC<FeaturedExperiencesProps> = ({
  onSelectExperience
}) => {
  const FEATURED_EXPERIENCES = useFeaturedExperiences();
  return (
    <section className="py-24 bg-[#F5EFEB] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1C4737] bg-[#1C4737]/10 px-4 py-1.5 rounded-full inline-block mb-3">
              Unforgettable Moments
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[#0F2E23] tracking-tight">
              Experiences You’ll Remember
            </h2>
          </div>
          <p className="text-[#1A1A1A]/70 font-light max-w-md mt-4 md:mt-0 text-sm sm:text-base">
            Signature Sri Lankan activities crafted to stir emotions, capture breathtaking vistas, and forge lifelong memories.
          </p>
        </div>

        {/* 4 Featured Experience Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {FEATURED_EXPERIENCES.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              onClick={() => onSelectExperience(item)}
              className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-[#D4C3B5]/50 flex flex-col sm:flex-row group cursor-pointer"
            >
              {/* Image Column */}
              <div className="sm:w-1/2 relative min-h-[260px] sm:min-h-full overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 bg-[#0F2E23]/90 text-[#D4AF37] px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border border-[#D4AF37]/30">
                  <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                  <span>{item.rating}</span>
                </div>
              </div>

              {/* Text Details Column */}
              <div className="sm:w-1/2 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#1C4737] mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{item.location}</span>
                  </div>

                  <h3 className="font-heading text-2xl font-bold text-[#0F2E23] group-hover:text-[#1C4737] transition-colors mb-1">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[#1C4737] font-serif italic mb-3">
                    “{item.subtitle}”
                  </p>

                  <p className="text-xs text-[#1A1A1A]/75 line-clamp-3 font-light leading-relaxed mb-4">
                    {item.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-[#1A1A1A]/60 pt-2 border-t border-[#D4C3B5]/30">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[#1C4737]" />
                      <span>{item.duration}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#1C4737]" />
                      <span>{item.category}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectExperience(item);
                  }}
                  className="w-full py-3 bg-[#1C4737] hover:bg-[#0F2E23] text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
                >
                  <span>Discover Experience</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
