import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Compass, MapPin } from 'lucide-react';

interface HeroSectionProps {
  onExploreClick: () => void;
  onPlanClick: () => void;
}

const HERO_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=2000',
    title: 'Ella Central Highlands',
    caption: 'Misty Mountains & Tea Valleys'
  },
  {
    url: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=2000',
    title: 'Sigiriya Ancient Rock Citadel',
    caption: '2,500 Years of Sacred History'
  },
  {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000',
    title: 'Mirissa Palm Shoreline',
    caption: 'Indian Ocean Sunset Bay'
  }
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreClick,
  onPlanClick
}) => {
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero" className="relative w-full h-screen min-h-[700px] flex items-center justify-center overflow-hidden bg-[#0F2E23]">
      {/* Background Image Carousel with Smooth Crossfade */}
      {HERO_IMAGES.map((bg, idx) => (
        <div
          key={bg.url}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentBg ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } transform transition-transform duration-10000`}
        >
          <img
            src={bg.url}
            alt={bg.title}
            className="w-full h-full object-cover object-center"
          />
        </div>
      ))}

      {/* Premium Multi-Layer Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F2E23] via-[#0F2E23]/50 to-black/60" />
      <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/20 to-black/70" />

      {/* Hero Content */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white pt-16">
        {/* Subtle Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest text-[#D4AF37]"
        >
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <span>The Premium Sri Lanka Experience</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="font-heading text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6 drop-shadow-md"
        >
          See Sri Lanka Through a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#F5EFEB] via-[#D4AF37] to-[#EBDED5] bg-clip-text text-transparent italic font-serif">
            Different Eye.
          </span>
        </motion.h1>

        {/* Supporting Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed mb-10 text-shadow"
        >
          Discover hidden places, timeless culture, wild adventures and unforgettable moments across the island.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
        >
          <button
            onClick={onExploreClick}
            className="w-full sm:w-auto px-8 py-4 bg-[#1C4737] hover:bg-[#0F2E23] text-white font-medium text-base rounded-full shadow-xl hover:shadow-2xl border border-[#368E6B]/50 transition-all duration-300 flex items-center justify-center space-x-3 group"
          >
            <MapPin className="w-5 h-5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            <span>Explore Sri Lanka</span>
          </button>

          <button
            onClick={onPlanClick}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:from-[#C5A059] hover:to-[#B89248] text-[#0F2E23] font-bold text-base rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center space-x-3 transform hover:-translate-y-0.5"
          >
            <Compass className="w-5 h-5" />
            <span>Plan Your Journey</span>
          </button>
        </motion.div>

        {/* Location Indicator Caption */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 hidden sm:flex items-center justify-center space-x-2 text-xs text-white/70"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
          <span>Currently featured: {HERO_IMAGES[currentBg].title} ({HERO_IMAGES[currentBg].caption})</span>
        </motion.div>
      </div>

      {/* Bottom Scroll Indicator */}
      <motion.button
        onClick={onExploreClick}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 1,
          delay: 1.4,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 text-white/80 hover:text-white flex flex-col items-center gap-1 focus:outline-none cursor-pointer"
        aria-label="Scroll to explore"
      >
        <span className="text-[10px] tracking-widest uppercase font-semibold text-[#D4AF37]">
          Scroll to Discover
        </span>
        <ChevronDown className="w-6 h-6 text-[#D4AF37]" />
      </motion.button>
    </section>
  );
};
