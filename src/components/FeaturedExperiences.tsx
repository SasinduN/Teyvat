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
            <span className="te-card-badge uppercase tracking-[0.2em] mb-3">
              Unforgettable Moments
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[var(--brand-primary)] tracking-tight">
              Experiences You’ll Remember
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] max-w-md mt-4 md:mt-0 text-sm sm:text-base">
            Signature Sri Lankan activities crafted to stir emotions, capture breathtaking vistas, and forge lifelong memories.
          </p>
        </div>

        {/* 4 Featured Experience Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {FEATURED_EXPERIENCES.map((item, idx) => (
            <MotionLink
              key={item.id}
              to={paths.experience(item.id)}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="te-card te-content-card overflow-hidden flex flex-col sm:flex-row group cursor-pointer"
            >
              {/* Image Column */}
              <div className="sm:w-1/2 relative min-h-[220px] sm:min-h-full overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-[1.035] transition-transform duration-700"
                />
                <div className="te-card-badge te-card-badge--photo absolute top-4 left-4">
                  <Star className="w-3.5 h-3.5 fill-[var(--accent)]" aria-hidden="true" />
                  <span>{item.rating}</span>
                </div>
              </div>

              {/* Text Details Column */}
              <div className="sm:w-1/2 min-w-0 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="te-card-meta flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                    <span>{item.location}</span>
                  </div>

                  <h3 className="te-card-title font-heading text-2xl font-bold mb-1">
                    {item.title}
                  </h3>

                  <p className="te-card-accent text-xs font-serif italic mb-3">
                    “{item.subtitle}”
                  </p>

                  <p className="te-card-description text-xs line-clamp-3 mb-6">
                    {item.description}
                  </p>

                  <div className="te-card-meta te-card-divider flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
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
                  className="te-button te-button--primary te-button--sm te-card-cta"
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
