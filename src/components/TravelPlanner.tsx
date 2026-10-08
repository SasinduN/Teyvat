import React, { useState } from 'react';
import { useDestinations } from '@/hooks/useSiteContent';
import { buildSampleJourney, PLANNER_STYLES, PLANNER_DURATIONS, PLANNER_REGIONS, readSavedJourney, SAVED_PLAN_KEY } from '@/lib/planner';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, Calendar, MapPin, CheckCircle2, ArrowRight, Bookmark } from 'lucide-react';

interface TravelPlannerProps {
  onSavePlan: (itineraryTitle: string) => void;
}

export const TravelPlanner: React.FC<TravelPlannerProps> = ({ onSavePlan }) => {
  const destinations = useDestinations();
  const [restored] = useState(readSavedJourney);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [style, setStyle] = useState(restored?.style ?? 'Culture & Nature');
  const [duration, setDuration] = useState(restored?.duration ?? '6–8 days');
  const [region, setRegion] = useState(restored?.region ?? 'Around the Island');
  const [generated, setGenerated] = useState(Boolean(restored));
  const [saved, setSaved] = useState(Boolean(restored));

  const styles = PLANNER_STYLES;
  const durations = PLANNER_DURATIONS;
  const regions = PLANNER_REGIONS;

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

  const currentItinerary = style === 'Culture & Nature' && region === 'Around the Island' && duration !== '15+ days'
    ? getSampleItinerary()
    : buildSampleJourney(destinations, { style, duration, region });

  const handleBuild = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setGenerated(true);
    setSaved(false);
  };

  return (
    <section id="planner" className="py-24 bg-[var(--inverse-surface)] text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--emerald-edge)]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="te-container relative z-10">
        
        {/* Header */}
        <div className="te-section-header te-section-header--stack">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--accent-text)] bg-white/10 px-4 py-1.5 rounded-full inline-block mb-3 border border-[var(--accent)]/30">
            Interactive Journey Engine
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Build Your Sri Lanka Journey
          </h2>
          <p className="text-lg text-white/80 font-light leading-relaxed">
            Select your preferences below to build a sample journey from our published destinations. Our local travel specialists can refine the route, stays and travel times.
          </p>
        </div>

        {/* Builder Form Card */}
        <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl mb-12">
          <form onSubmit={handleBuild} className="space-y-8">
            
            {/* 1. Travel Style */}
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-bold block mb-3 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>1. Select Travel Style</span>
              </p>
              <div role="group" aria-label="Travel style" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {styles.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={style === s}
                    onClick={() => { setStyle(s); setGenerated(false); setSaved(false); }}
                    className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all border ${
                      style === s
                        ? 'bg-[var(--accent)] text-[var(--brand-primary)] font-bold border-[var(--accent)] shadow-lg scale-102'
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
              <p className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-bold block mb-3 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>2. Select Trip Duration</span>
              </p>
              <div role="group" aria-label="Trip duration" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {durations.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={duration === d}
                    onClick={() => { setDuration(d); setGenerated(false); setSaved(false); }}
                    className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all border ${
                      duration === d
                        ? 'bg-[var(--accent)] text-[var(--brand-primary)] font-bold border-[var(--accent)] shadow-lg scale-102'
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
              <p className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-bold block mb-3 flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>3. Select Preferred Focus Region</span>
              </p>
              <div role="group" aria-label="Focus region" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {regions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={region === r}
                    onClick={() => { setRegion(r); setGenerated(false); setSaved(false); }}
                    className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all border ${
                      region === r
                        ? 'bg-[var(--accent)] text-[var(--brand-primary)] font-bold border-[var(--accent)] shadow-lg scale-102'
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
                className="te-button te-button--primary px-10 py-4 font-bold text-base flex items-center space-x-2 mx-auto"
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
            <motion.div data-reveal
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[var(--surface)] text-[var(--text-primary)] p-6 sm:p-10 rounded-3xl shadow-2xl border border-[var(--border-strong)]/60"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--border-strong)]/40 mb-6 gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 text-xs uppercase font-bold text-[var(--brand-primary)] bg-[var(--brand-secondary)]/10 px-3 py-1 rounded-full mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Your Recommended Journey</span>
                  </div>
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--brand-primary)]">
                    The {style} Expedition ({duration})
                  </h3>
                  <p className="text-xs text-[var(--text-primary)]/70 mt-1">
                    Focused on: <strong>{region}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      try {
                        localStorage.setItem(SAVED_PLAN_KEY, JSON.stringify({ style, duration, region, itinerary: currentItinerary }));
                        setSaved(true); setSaveError(null);
                        onSavePlan(`${style} Expedition (${duration}) — ${region}`);
                      } catch { setSaveError('This browser could not save your journey. You can still request a custom quote.'); }
                    }}
                    className="te-button te-button--secondary px-5 py-2.5 text-xs font-bold"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{saved ? 'Saved on This Device' : 'Save Itinerary'}</span>
                  </button>
                </div>
              </div>

              {saveError && <p role="alert" className="mb-4 text-sm text-[var(--danger)]">{saveError}</p>}
              {currentItinerary.length === 0 && <p role="status" className="mb-4 text-sm">No published destinations match this region yet. Request a custom quote for local advice.</p>}
              <p className="mb-4 text-xs text-[var(--text-secondary)]">Sample itinerary · {currentItinerary.length} days · Your saved journey stays on this device. Availability and transfers are confirmed by a travel specialist.</p>
              {/* Day Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {currentItinerary.map((item) => (
                  <div key={item.day} className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border-strong)]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white bg-[var(--inverse-surface)] px-2.5 py-0.5 rounded-full">
                        Day {String(item.day).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-[var(--brand-primary)] font-semibold uppercase">Highlights</span>
                    </div>
                    <h4 className="font-heading text-base font-bold text-[var(--brand-primary)]">{item.title}</h4>
                    <p className="text-xs text-[var(--text-primary)]/75 font-light leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-[var(--background-secondary)] rounded-2xl border border-[var(--border-strong)]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-[var(--brand-primary)] font-medium">
                  Would you like a local travel specialist to customize this itinerary with boutique hotels, private driver, and experiences?
                </p>
                <button
                  onClick={() => onSavePlan(`Custom ${style} (${duration}) — ${region}`)}
                  className="te-button te-button--primary px-6 py-3 font-bold text-xs shrink-0"
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
