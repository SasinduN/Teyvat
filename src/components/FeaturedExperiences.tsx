import { TravelImage } from '@/components/TravelImage';
import React from 'react';
import { useFeaturedExperiences } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import { MotionLink } from './MotionLink';
import { Clock, MapPin, Sparkles, ArrowRight, Star } from 'lucide-react';

export const FeaturedExperiences: React.FC = () => {
  const FEATURED_EXPERIENCES = useFeaturedExperiences();
  return (
    <section className="py-24 bg-[var(--background-secondary)] relative overflow-hidden">
      <div className="te-container">
        
        {/* Header */}
        <div className="te-section-header">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--brand-primary)] bg-[var(--brand-secondary)]/10 px-4 py-1.5 rounded-full inline-block mb-3">
              Unforgettable Moments
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[var(--brand-primary)] tracking-tight">
              Experiences You’ll Remember
            </h2>
          </div>
          <p className="text-[var(--text-primary)]/70 font-light max-w-md mt-4 md:mt-0 text-sm sm:text-base">
            Signature Sri Lankan activities crafted to stir emotions, capture breathtaking vistas, and forge lifelong memories.
          </p>
        </div>

        {/* 4 Featured Experience Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {FEATURED_EXPERIENCES.map((item, idx) => (
            <MotionLink data-reveal
              key={item.id}
              to={paths.experience(item.id)}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="bg-[var(--surface)] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-[var(--border-strong)]/50 flex flex-col sm:flex-row group cursor-pointer"
            >
              {/* Image Column */}
              <div className="sm:w-1/2 relative min-h-[260px] sm:min-h-full overflow-hidden">
                <TravelImage
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-[1.035] transition-transform duration-700"
                />
                <div className="glass-subtle glass-inverse absolute top-4 left-4 text-[var(--accent-text)] px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                  <Star className="w-3.5 h-3.5 fill-[var(--accent)] text-[var(--accent-text)]" />
                  <span>{item.rating}</span>
                </div>
              </div>

              {/* Text Details Column */}
              <div className="glass-medium te-glass-metadata sm:w-1/2 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[var(--brand-primary)] mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                    <span>{item.location}</span>
                  </div>

                  <h3 className="font-heading text-2xl font-bold text-[var(--brand-primary)] group-hover:text-[var(--brand-primary)] transition-colors mb-1">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[var(--brand-primary)] font-serif italic mb-3">
                    “{item.subtitle}”
                  </p>

                  <p className="text-xs text-[var(--text-primary)]/75 line-clamp-3 font-light leading-relaxed mb-4">
                    {item.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-[var(--text-primary)]/60 pt-2 border-t border-[var(--border-strong)]/30">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                      <span>{item.duration}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                      <span>{item.category}</span>
                    </span>
                  </div>
                </div>

                {/* Inside the card's link, so not a button of its own. */}
                <span
                  className="w-full py-3 bg-[var(--brand-secondary)] hover:bg-[var(--inverse-surface)] text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
                >
                  <span>Discover Experience</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>

            </MotionLink>
          ))}
        </div>

      </div>
    </section>
  );
};
