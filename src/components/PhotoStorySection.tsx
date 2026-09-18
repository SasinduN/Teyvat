import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePhotoStories } from '@/hooks/useSiteContent';
import { PhotoStory } from '../types';
import { Camera, MapPin, X, Maximize2 } from 'lucide-react';

export const PhotoStorySection: React.FC = () => {
  const PHOTO_STORIES = usePhotoStories();
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoStory | null>(null);

  return (
    <section className="py-24 bg-[#0F2E23] text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#D4AF37] bg-white/10 px-4 py-1.5 rounded-full inline-block mb-3 border border-[#D4AF37]/30">
            Visual Storytelling
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Stories From The Island
          </h2>
          <p className="text-lg text-white/80 font-light leading-relaxed">
            A window into daily Sri Lankan life—misty train bends, ancient stone carvings, golden surf tides, and serene highland tea slopes.
          </p>
        </div>

        {/* Photography Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {PHOTO_STORIES.map((photo, idx) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              onClick={() => setSelectedPhoto(photo)}
              className="group relative rounded-2xl overflow-hidden shadow-lg border border-white/10 aspect-[3/4] cursor-pointer bg-black"
            >
              <img
                src={photo.image}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center">
                  <Maximize2 className="w-4 h-4" />
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-y-0 translate-y-2 duration-300">
                <span className="text-[10px] uppercase font-bold text-[#D4AF37] flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {photo.location}
                </span>
                <h4 className="font-heading font-bold text-sm leading-tight mt-0.5">{photo.title}</h4>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      {/* Photo Lightbox Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full max-h-[90vh] bg-[#0F2E23] rounded-3xl overflow-hidden shadow-2xl border border-white/20 flex flex-col md:flex-row"
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="md:w-2/3 bg-black flex items-center justify-center max-h-[60vh] md:max-h-[80vh]">
                <img
                  src={selectedPhoto.image}
                  alt={selectedPhoto.title}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="md:w-1/3 p-6 sm:p-8 text-white flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs uppercase tracking-widest font-bold text-[#D4AF37] flex items-center gap-1.5 mb-2">
                    <Camera className="w-4 h-4" /> {selectedPhoto.category}
                  </span>
                  <h3 className="font-heading text-2xl font-bold mb-2">{selectedPhoto.title}</h3>
                  <p className="text-xs text-white/60 mb-4 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" /> {selectedPhoto.location}
                  </p>
                  <p className="text-sm text-white/85 font-light leading-relaxed italic border-l-2 border-[#D4AF37] pl-3 py-1">
                    “{selectedPhoto.caption}”
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 text-xs text-white/50">
                  Captured for Travel Eye Journal © 2026
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
};
