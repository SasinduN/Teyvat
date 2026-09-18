import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArticles } from '@/hooks/useSiteContent';
import { Article } from '../types';
import { Calendar, Clock, ArrowRight, X } from 'lucide-react';

export const JournalSection: React.FC = () => {
  const ARTICLES = useArticles();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  return (
    <section className="py-24 bg-[#FBF9F6] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1C4737] bg-[#1C4737]/10 px-4 py-1.5 rounded-full inline-block mb-3">
              Stories & Insights
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[#0F2E23] tracking-tight">
              Travel Eye Journal
            </h2>
          </div>
          <p className="text-[#1A1A1A]/70 font-light max-w-md mt-4 md:mt-0 text-sm sm:text-base">
            Expert travel guides, cultural deep-dives, sunrise viewpoints, and culinary discoveries written by island explorers.
          </p>
        </div>

        {/* 6 Article Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ARTICLES.map((art, idx) => (
            <motion.div
              key={art.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              onClick={() => setSelectedArticle(art)}
              className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-[#D4C3B5]/40 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-[#0F2E23] text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    {art.category}
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center space-x-3 text-xs text-[#1A1A1A]/50">
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

                  <h3 className="font-heading text-xl font-bold text-[#0F2E23] group-hover:text-[#1C4737] transition-colors leading-snug">
                    {art.title}
                  </h3>

                  <p className="text-xs text-[#1A1A1A]/75 font-light leading-relaxed line-clamp-3">
                    {art.snippet}
                  </p>
                </div>
              </div>

              {/* Author & Read Action */}
              <div className="px-6 pb-6 pt-2 border-t border-[#D4C3B5]/30 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img
                    src={art.author.avatar}
                    alt={art.author.name}
                    className="w-7 h-7 rounded-full object-cover border border-[#D4C3B5]"
                  />
                  <span className="text-xs font-medium text-[#0F2E23]">{art.author.name}</span>
                </div>

                <span className="text-xs font-bold text-[#1C4737] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>Read story</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

            </motion.div>
          ))}
        </div>

      </div>

      {/* Full Article Reader Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={() => setSelectedArticle(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#D4C3B5]/60 relative text-[#1A1A1A]"
            >
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative h-64 sm:h-80">
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                  <span className="text-xs uppercase font-bold tracking-widest text-[#D4AF37] bg-[#0F2E23] px-3 py-1 rounded-full border border-[#D4AF37]/30">
                    {selectedArticle.category}
                  </span>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold">{selectedArticle.title}</h2>
                </div>
              </div>

              <div className="p-6 sm:p-10 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#D4C3B5]/40 text-xs text-[#1A1A1A]/60">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedArticle.author.avatar}
                      alt={selectedArticle.author.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <span className="font-bold text-[#0F2E23] block">{selectedArticle.author.name}</span>
                      <span className="text-[10px]">{selectedArticle.author.role}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block">{selectedArticle.date}</span>
                    <span className="text-[#1C4737] font-semibold">{selectedArticle.readTime}</span>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-[#1A1A1A]/85 font-light leading-relaxed">
                  <p className="font-medium text-base text-[#0F2E23] italic">
                    “{selectedArticle.snippet}”
                  </p>
                  {selectedArticle.content?.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>

                <div className="pt-6 border-t border-[#D4C3B5]/40 flex justify-end">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="px-6 py-2.5 bg-[#0F2E23] text-white rounded-xl text-xs font-bold"
                  >
                    Close Article
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
