import React from 'react';
import { motion } from 'framer-motion';
import { useExperienceCategories } from '@/hooks/useSiteContent';
import { CategoryType } from '../types';
import { ArrowRight } from 'lucide-react';
import { MotionLink } from './MotionLink';

interface ExperiencesSectionProps {
  /** On the home page: a card filters the map. */
  onSelectCategory?: (category: CategoryType) => void;
  /** On /experiences: a card links here instead (the filtered destinations list). */
  categoryHref?: (category: CategoryType) => string;
}

export const ExperiencesSection: React.FC<ExperiencesSectionProps> = ({
  onSelectCategory,
  categoryHref
}) => {
  const EXPERIENCE_CATEGORIES = useExperienceCategories();
  // Same card either way; only what it is (a link, or a filter) changes.
  const Card: React.ElementType = categoryHref ? MotionLink : motion.button;
  return (
    <section id="experiences" className="py-24 bg-[var(--background)] text-[var(--text-primary)] relative overflow-hidden">
      {/* Background Subtle Pattern */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(var(--accent)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="te-container relative z-10">
        
        {/* Header */}
        <div className="te-section-header te-section-header--stack">
          <span className="te-card-badge uppercase tracking-[0.2em] mb-3">
            Tailored Journeys
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-[var(--brand-primary)] mb-4">
            What Kind of Journey Are You Looking For?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            Every traveler sees Sri Lanka differently. Select your preferred style of discovery below.
          </p>
        </div>

        {/* Visual Experience Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EXPERIENCE_CATEGORIES.map((exp, idx) => (
            <Card
              key={exp.id}
              {...(categoryHref
                ? { to: categoryHref(exp.category) }
                : { type: "button", onClick: () => onSelectCategory?.(exp.category) })}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="te-card te-content-card te-content-card--photo text-left group relative overflow-hidden min-h-[320px] flex flex-col justify-end p-5 sm:p-6 cursor-pointer"
            >
              {/* Background Image */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={exp.image}
                  alt={exp.title}
                  className="w-full h-full object-cover group-hover:scale-[1.035] transition-transform duration-700 ease-out"
                />
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--inverse-surface)] via-[var(--inverse-surface)]/80 via-50% to-black/10 group-hover:from-[var(--inverse-surface)]/90 transition-colors duration-500" />

              {/* Content */}
              <div className="relative z-10 space-y-3">
                <div className="te-card-badge te-card-badge--photo uppercase tracking-widest">
                  <span>{exp.category}</span>
                </div>

                <h3 className="te-card-title font-heading text-2xl font-bold">
                  {exp.title}
                </h3>

                <p className="te-card-accent text-xs font-medium font-serif italic">
                  {exp.subtitle}
                </p>

                <p className="te-card-description text-sm line-clamp-2">
                  {exp.description}
                </p>

                <div className="te-card-action pt-2 flex items-center space-x-2 text-xs font-semibold">
                  <span>Explore {exp.title}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};
