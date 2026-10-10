import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDestinations } from '@/hooks/useSiteContent';
import {
  buildSampleJourney,
  PLANNER_DURATIONS,
  PLANNER_REGIONS,
  PLANNER_STYLES,
  readSavedJourney,
  SAVED_PLAN_KEY
} from '@/lib/planner';
import { Compass, Sparkles, Calendar, MapPin, CheckCircle2, ArrowRight, Bookmark } from 'lucide-react';

interface TravelPlannerProps {
  onSavePlan: (itineraryTitle: string) => void;
}

/**
 * The journey builder: travel style, length and region in, a day-by-day
 * sample out. The sample is built from the published destinations
 * (`buildSampleJourney`, src/lib/planner.ts), never from fixed text, so an
 * admin's changes show here too. "Save Itinerary" keeps the choices on this
 * device (they come back on the next visit) and opens the enquiry form with
 * them; a browser that won't store them gets a message instead.
 */
export const TravelPlanner: React.FC<TravelPlannerProps> = ({ onSavePlan }) => {
  const destinations = useDestinations();
  const [restored] = useState(readSavedJourney);
  const [style, setStyle] = useState(restored?.style ?? 'Culture & Nature');
  const [duration, setDuration] = useState(restored?.duration ?? '6–8 days');
  const [region, setRegion] = useState(restored?.region ?? 'Around the Island');
  const [generated, setGenerated] = useState(Boolean(restored));
  const [saved, setSaved] = useState(Boolean(restored));
  const [saveError, setSaveError] = useState<string | null>(null);

  const styles = PLANNER_STYLES;
  const durations = PLANNER_DURATIONS;
  const regions = PLANNER_REGIONS;

  const currentItinerary = buildSampleJourney(destinations, { style, duration, region });

  const handleBuild = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setGenerated(true);
    setSaved(false);
  };

  const saveJourney = () => {
    try {
      localStorage.setItem(SAVED_PLAN_KEY, JSON.stringify({ style, duration, region }));
      setSaved(true);
      setSaveError(null);
    } catch {
      setSaveError('This browser could not save your journey. You can still request a custom quote.');
    }
    onSavePlan(`${style} Expedition (${duration}) — ${region}`);
  };

  return (
    <section id="planner" className="py-24 bg-[var(--inverse-surface)] text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--emerald-edge)]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--accent-text)] bg-white/10 px-4 py-1.5 rounded-full inline-block mb-3 border border-[var(--accent)]/30">
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
          {/* Keep-clear: the floating buttons (WhatsApp, back to top) step aside rather than sit on the options. */}
          <form onSubmit={handleBuild} data-keep-clear className="space-y-8">
            
            {/* 1. Travel Style */}
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-bold block mb-3 flex items-center space-x-2">
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
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold border-[var(--accent)] shadow-lg scale-102'
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
              <label className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-bold block mb-3 flex items-center space-x-2">
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
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold border-[var(--accent)] shadow-lg scale-102'
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
              <label className="text-xs uppercase tracking-widest text-[var(--accent-text)] font-bold block mb-3 flex items-center space-x-2">
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
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold border-[var(--accent)] shadow-lg scale-102'
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
                className="px-10 py-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] hover:from-[var(--accent-hover)] hover:to-[var(--accent-hover)] text-[var(--on-accent)] font-bold text-base rounded-full shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center space-x-2 mx-auto"
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
                    onClick={saveJourney}
                    className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      saved
                        ? 'bg-[var(--brand-secondary)] text-white'
                        : 'bg-[var(--background-secondary)] text-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] hover:text-white border border-[var(--border-strong)]/50'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{saved ? 'Saved on This Device' : 'Save Itinerary'}</span>
                  </button>
                </div>
              </div>

              {saveError && (
                <p role="alert" className="mb-4 text-sm text-[var(--danger)]">
                  {saveError}
                </p>
              )}
              {currentItinerary.length === 0 ? (
                <p role="status" className="mb-4 text-sm">
                  No published destinations match this region yet. Request a custom quote for local advice.
                </p>
              ) : (
                <p className="mb-4 text-xs text-[var(--text-secondary)]">
                  A sample · {currentItinerary.length} days · built from our destinations. A travel specialist confirms
                  availability and transfers.
                </p>
              )}
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
                  className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] rounded-xl font-bold text-xs shrink-0 shadow-md flex items-center space-x-1"
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
