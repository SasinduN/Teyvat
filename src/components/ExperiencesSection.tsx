import React from 'react';
import { motion } from 'framer-motion';
import { useExperienceCategories } from '@/hooks/useSiteContent';
import { CategoryType } from '../types';
import { ArrowRight } from 'lucide-react';

interface ExperiencesSectionProps {
  onSelectCategory: (category: CategoryType) => void;
}

export const ExperiencesSection: React.FC<ExperiencesSectionProps> = ({
  onSelectCategory
}) => {
  const EXPERIENCE_CATEGORIES = useExperienceCategories();
  return (
    <section id="experiences" className="py-24 bg-[#0F2E23] text-white relative overflow-hidden">
      {/* Background Subtle Pattern */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#D4AF37] bg-white/10 px-4 py-1.5 rounded-full inline-block mb-3 border border-[#D4AF37]/30">
            Tailored Journeys
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            What Kind of Journey Are You Looking For?
          </h2>
          <p className="text-lg text-white/80 font-light leading-relaxed">
            Every traveler sees Sri Lanka differently. Select your preferred style of discovery below.
          </p>
        </div>

        {/* Visual Experience Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EXPERIENCE_CATEGORIES.map((exp, idx) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              onClick={() => onSelectCategory(exp.category)}
              className="group relative rounded-3xl overflow-hidden shadow-xl border border-white/10 h-[380px] flex flex-col justify-end p-6 sm:p-8 cursor-pointer transform hover:-translate-y-1.5 transition-all duration-500"
            >
              {/* Background Image */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={exp.image}
                  alt={exp.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F2E23] via-[#0F2E23]/60 to-black/30 group-hover:from-[#0F2E23]/90 transition-colors duration-500" />

              {/* Content */}
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest font-bold text-[#D4AF37] bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  <span>{exp.category}</span>
                </div>

                <h3 className="font-heading text-2xl font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                  {exp.title}
                </h3>

                <p className="text-xs text-[#D4AF37] font-medium font-serif italic">
                  {exp.subtitle}
                </p>

                <p className="text-xs text-white/80 line-clamp-2 font-light leading-relaxed">
                  {exp.description}
                </p>

                <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-[#D4AF37] group-hover:text-white transition-colors">
                  <span>Explore {exp.title}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
