import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, Calendar, MapPin, CheckCircle2, ArrowRight, Bookmark } from 'lucide-react';

interface TravelPlannerProps {
  onSavePlan: (itineraryTitle: string) => void;
}

export const TravelPlanner: React.FC<TravelPlannerProps> = ({ onSavePlan }) => {
  const [style, setStyle] = useState('Culture & Nature');
  const [duration, setDuration] = useState('6–8 days');
  const [region, setRegion] = useState('Around the Island');
  const [generated, setGenerated] = useState(false);
  const [saved, setSaved] = useState(false);

  const styles = ['Relax', 'Adventure', 'Culture', 'Wildlife', 'Luxury', 'Backpacking'];
  const durations = ['3–5 days', '6–8 days', '9–14 days', '15+ days'];
  const regions = ['South Coast', 'Central Highlands', 'East Coast', 'Far North', 'Cultural Triangle', 'Around the Island'];

  // Sample Generated Itineraries
  const getSampleItinerary = () => {
    if (duration === '3–5 days') {
      return [
        { day: 1, title: 'Arrival & Colombo Seafront', desc: 'Boutique welcome stay, Gangaramaya temple stroll, rooftop cocktails.' },
        { day: 2, title: 'Kandy Sacred Hill Capital', desc: 'Peradeniya Gardens walk, Temple of Tooth Relic evening ceremony.' },
        { day: 3, title: 'Highland Express to Ella', desc: 'Highland train ride, Little Adam’s Peak sunset hike.' },
        { day: 4, title: 'Galle Fort Ramparts', desc: 'Dutch colonial rampart stroll, artisan boutiques & coastal return.' }
      ];
    } else if (duration === '9–14 days') {
      return [
        { day: 1, title: 'Colombo Gateway', desc: 'Boutique stay and oceanfront dining.' },
        { day: 2, title: 'Anuradhapura Royal Stupas', desc: 'Explore ancient stupas and Sri Maha Bodhi tree.' },
        { day: 3, title: 'Sigiriya Rock Citadel', desc: 'Dawn climb of 5th-century palace rock fortress.' },
        { day: 4, title: 'Polonnaruwa & Minneriya', desc: 'Medieval ruins by bike, afternoon elephant safari.' },
        { day: 5, title: 'Kandy Royal Temple', desc: 'Temple of Sacred Tooth Relic & Kandyan cultural show.' },
        { day: 6, title: 'Highland Train to Ella', desc: 'Blue train crossing tea estates to Nine Arch Bridge.' },
        { day: 7, title: 'Ella Peak & Ravana Falls', desc: 'Sunrise at Ella Rock and waterfall dip.' },
        { day: 8, title: 'Yala National Park', desc: 'Private 4x4 leopard and sloth bear safari.' },
        { day: 9, title: 'Mirissa Ocean Whales', desc: 'Whale watching and Coconut Tree Hill sunset.' },
        { day: 10, title: 'Galle Fort Heritage', desc: 'Historic Dutch rampart walk & coastal return.' }
      ];
    } else {
      // Default 6-8 days
      return [
        { day: 1, title: 'Arrival & Colombo Gateway', desc: 'Boutique hotel check-in, Galle Face Green sunset stroll.' },
        { day: 2, title: 'Sigiriya Rock & Water Gardens', desc: 'Climb 5th-century Lion Rock fortress and Pidurangala.' },
        { day: 3, title: 'Kandy Hill Capital', desc: 'Dambulla cave temple, Peradeniya gardens, Temple of Tooth.' },
        { day: 4, title: 'Highland Train to Ella', desc: 'World-famous blue train winding through Ceylon tea hills.' },
        { day: 5, title: 'Ella Peaks & Yala Safari', desc: 'Nine Arch Bridge train watch, afternoon Yala leopard safari.' },
        { day: 6, title: 'Mirissa & South Coast Beaches', desc: 'Coconut Tree Hill photo, calm bay swimming & fresh seafood.' },
        { day: 7, title: 'Galle Fort & Departure', desc: 'Colonial Dutch rampart heritage stroll before departure.' }
      ];
    }
  };

  const currentItinerary = getSampleItinerary();

  const handleBuild = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerated(true);
    setSaved(false);
  };

  return (
    <section id="planner" className="py-24 bg-[#0F2E23] text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#368E6B]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#D4AF37] bg-white/10 px-4 py-1.5 rounded-full inline-block mb-3 border border-[#D4AF37]/30">
            Interactive Journey Engine
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Build Your Sri Lanka Journey
          </h2>
          <p className="text-lg text-white/80 font-light leading-relaxed">
            Select your preferences below and let our intelligent route engine generate a custom itinerary tailored to your vision.
          </p>
        </div>

        {/* Builder Form Card */}
        <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl mb-12">
          <form onSubmit={handleBuild} className="space-y-8">
            
            {/* 1. Travel Style */}
            <div>
              <label className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold block mb-3 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>1. Select Travel Style</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {styles.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all border ${
                      style === s
                        ? 'bg-[#D4AF37] text-[#0F2E23] font-bold border-[#D4AF37] shadow-lg scale-102'
                        : 'bg-white/5 text-white hover:bg-white/10 border-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Trip Duration */}
            <div>
              <label className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold block mb-3 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>2. Select Trip Duration</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {durations.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all border ${
                      duration === d
                        ? 'bg-[#D4AF37] text-[#0F2E23] font-bold border-[#D4AF37] shadow-lg scale-102'
                        : 'bg-white/5 text-white hover:bg-white/10 border-white/10'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Preferred Region */}
            <div>
              <label className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold block mb-3 flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>3. Select Preferred Focus Region</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {regions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(r)}
                    className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all border ${
                      region === r
                        ? 'bg-[#D4AF37] text-[#0F2E23] font-bold border-[#D4AF37] shadow-lg scale-102'
                        : 'bg-white/5 text-white hover:bg-white/10 border-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center pt-4">
              <button
                type="submit"
                className="px-10 py-4 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:from-[#C5A059] hover:to-[#B89248] text-[#0F2E23] font-bold text-base rounded-full shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center space-x-2 mx-auto"
              >
                <Compass className="w-5 h-5" />
                <span>Build My Journey</span>
              </button>
            </div>

          </form>
        </div>

        {/* Generated Custom Itinerary Card */}
        <AnimatePresence>
          {generated && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white text-[#1A1A1A] p-6 sm:p-10 rounded-3xl shadow-2xl border border-[#D4C3B5]/60"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#D4C3B5]/40 mb-6 gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 text-xs uppercase font-bold text-[#1C4737] bg-[#1C4737]/10 px-3 py-1 rounded-full mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1C4737]" />
                    <span>Your Recommended Journey</span>
                  </div>
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F2E23]">
                    The {style} Expedition ({duration})
                  </h3>
                  <p className="text-xs text-[#1A1A1A]/70 mt-1">
                    Focused on: <strong>{region}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setSaved(true);
                      onSavePlan(`${style} Expedition (${duration})`);
                    }}
                    className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      saved
                        ? 'bg-[#1C4737] text-white'
                        : 'bg-[#F5EFEB] text-[#0F2E23] hover:bg-[#1C4737] hover:text-white border border-[#D4C3B5]/50'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{saved ? 'Saved to Planner' : 'Save Itinerary'}</span>
                  </button>
                </div>
              </div>

              {/* Day Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {currentItinerary.map((item) => (
                  <div key={item.day} className="p-4 rounded-2xl bg-[#FBF9F6] border border-[#D4C3B5]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white bg-[#0F2E23] px-2.5 py-0.5 rounded-full">
                        Day 0{item.day}
                      </span>
                      <span className="text-[10px] text-[#1C4737] font-semibold uppercase">Highlights</span>
                    </div>
                    <h4 className="font-heading text-base font-bold text-[#0F2E23]">{item.title}</h4>
                    <p className="text-xs text-[#1A1A1A]/75 font-light leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-[#F5EFEB] rounded-2xl border border-[#D4C3B5]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-[#0F2E23] font-medium">
                  Would you like a local travel specialist to customize this itinerary with boutique hotels, private driver, and experiences?
                </p>
                <button
                  onClick={() => onSavePlan(`Custom ${style} (${duration})`)}
                  className="px-6 py-3 bg-[#D4AF37] hover:bg-[#C5A059] text-[#0F2E23] rounded-xl font-bold text-xs shrink-0 shadow-md flex items-center space-x-1"
                >
                  <span>Request Custom Quote</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
};
