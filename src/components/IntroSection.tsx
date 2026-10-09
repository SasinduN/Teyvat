import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShieldCheck, Compass, Sparkles, Heart } from 'lucide-react';

export const IntroSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  // Counter Hook
  const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!isInView) return;
      let start = 0;
      const stepTime = Math.abs(Math.floor(duration / end));
      const timer = setInterval(() => {
        start += 1;
        setCount(start);
        if (start >= end) {
          clearInterval(timer);
          setCount(end);
        }
      }, stepTime);
      return () => clearInterval(timer);
    }, [isInView, end, duration]);

    return count;
  };

  const unescoCount = useCounter(8, 1500);
  const coastlineCount = useCounter(1300, 2000);
  const parksCount = useCounter(26, 1800);
  const historyCount = useCounter(2500, 2200);

  return (
    <section id="about" ref={sectionRef} className="py-24 bg-[#FBF9F6] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1C4737] bg-[#1C4737]/10 px-4 py-1.5 rounded-full inline-block mb-3">
            Welcome to Travel Eye
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[#0F2E23] tracking-tight mb-6">
            One Island. <span className="italic font-serif text-[#1C4737]">A Thousand Stories.</span>
          </h2>
          <p className="text-lg text-[#1A1A1A]/80 font-light leading-relaxed">
            Sri Lanka is more than a destination. It is a collection of places, people, flavours, landscapes and stories waiting to be discovered.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-20">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#D4C3B5]/30 text-center hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-[#1C4737]/10 text-[#1C4737] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#1C4737] group-hover:text-white transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="font-heading text-4xl sm:text-5xl font-extrabold text-[#0F2E23] mb-1">
              {unescoCount}
            </div>
            <p className="text-sm font-medium text-[#1A1A1A]/70 uppercase tracking-wide">
              UNESCO Heritage Sites
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#D4C3B5]/30 text-center hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-[#1C4737]/10 text-[#1C4737] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#1C4737] group-hover:text-white transition-colors">
              <Compass className="w-6 h-6" />
            </div>
            <div className="font-heading text-4xl sm:text-5xl font-extrabold text-[#0F2E23] mb-1">
              {coastlineCount}+ <span className="text-2xl font-sans font-normal text-[#1C4737]">km</span>
            </div>
            <p className="text-sm font-medium text-[#1A1A1A]/70 uppercase tracking-wide">
              Tropical Coastline
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#D4C3B5]/30 text-center hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-[#1C4737]/10 text-[#1C4737] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#1C4737] group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="font-heading text-4xl sm:text-5xl font-extrabold text-[#0F2E23] mb-1">
              {parksCount}
            </div>
            <p className="text-sm font-medium text-[#1A1A1A]/70 uppercase tracking-wide">
              National Parks
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#D4C3B5]/30 text-center hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-[#1C4737]/10 text-[#1C4737] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#1C4737] group-hover:text-white transition-colors">
              <Heart className="w-6 h-6" />
            </div>
            <div className="font-heading text-4xl sm:text-5xl font-extrabold text-[#0F2E23] mb-1">
              {historyCount}+ <span className="text-2xl font-sans font-normal text-[#1C4737]">yrs</span>
            </div>
            <p className="text-sm font-medium text-[#1A1A1A]/70 uppercase tracking-wide">
              Living History
            </p>
          </motion.div>

        </div>

        {/* Asymmetric Image Collage */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8 }}
              className="relative z-10 rounded-3xl overflow-hidden shadow-xl aspect-[4/3] group"
            >
              <img
                src="https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200"
                alt="Ella misty mountain gap"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">Highlands</span>
                <p className="font-heading text-xl font-bold">Misty Tea Estates of Ella & Nuwara Eliya</p>
              </div>
            </motion.div>

            {/* Overlapping Secondary Image */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden sm:block absolute -bottom-10 -right-6 z-20 w-3/5 rounded-2xl overflow-hidden shadow-2xl border-4 border-white aspect-[3/2] group"
            >
              <img
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800"
                alt="Mirissa tropical beach sunset"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </motion.div>
          </div>

          <div className="md:col-span-5 md:pl-6 mt-8 md:mt-0 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1C4737]">
              The Travel Eye Identity
            </span>
            <h3 className="font-heading text-3xl font-bold text-[#0F2E23] leading-tight">
              Curated for Travelers Who Seek Genuine Connection
            </h3>
            <p className="text-[#1A1A1A]/80 font-light leading-relaxed">
              From golden beaches framed by coconut palms to ancient granite fortresses soaring above rainforests, Sri Lanka condenses centuries of biodiversity and culture into one compact paradise.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-2.5 shrink-0" />
                <p className="text-sm text-[#1A1A1A]/90"><strong className="text-[#0F2E23]">Signature Visual Map:</strong> Pinpoint exact coordinates across 20+ pristine destinations.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-2.5 shrink-0" />
                <p className="text-sm text-[#1A1A1A]/90"><strong className="text-[#0F2E23]">Tailored Journeys:</strong> Build custom day-by-day itineraries based on your pace and passion.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
