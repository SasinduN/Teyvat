import React from 'react';
import { useArticles } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import { MotionLink } from './MotionLink';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

export const JournalSection: React.FC = () => {
  const ARTICLES = useArticles();

  return (
    <section id="journal" className="py-24 bg-[var(--background)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--brand-primary)] bg-[var(--brand-secondary)]/10 px-4 py-1.5 rounded-full inline-block mb-3">
              Stories & Insights
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[var(--brand-primary)] tracking-tight">
              Travel Eye Journal
            </h2>
          </div>
          <p className="text-[var(--text-primary)]/70 font-light max-w-md mt-4 md:mt-0 text-sm sm:text-base">
            Expert travel guides, cultural deep-dives, sunrise viewpoints, and culinary discoveries written by island explorers.
          </p>
        </div>

        {/* 6 Article Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ARTICLES.map((art, idx) => (
            <MotionLink
              key={art.id}
              to={paths.article(art.id)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-[var(--surface)] rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-[var(--border-strong)]/40 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-[var(--inverse-surface)] text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    {art.category}
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center space-x-3 text-xs text-[var(--text-primary)]/50">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{art.date}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{art.readTime}</span>
                    </span>
                  </div>

                  <h3 className="font-heading text-xl font-bold text-[var(--brand-primary)] group-hover:text-[var(--brand-primary)] transition-colors leading-snug">
                    {art.title}
                  </h3>

                  <p className="text-xs text-[var(--text-primary)]/75 font-light leading-relaxed line-clamp-3">
                    {art.snippet}
                  </p>
                </div>
              </div>

              {/* Author & Read Action */}
              <div className="px-6 pb-6 pt-2 border-t border-[var(--border-strong)]/30 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img
                    src={art.author.avatar}
                    alt={art.author.name}
                    className="w-7 h-7 rounded-full object-cover border border-[var(--border-strong)]"
                  />
                  <span className="text-xs font-medium text-[var(--brand-primary)]">{art.author.name}</span>
                </div>

                <span className="text-xs font-bold text-[var(--brand-primary)] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>Read story</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

            </MotionLink>
          ))}
        </div>

      </div>

    </section>
  );
};
