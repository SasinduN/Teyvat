import React, { useState } from 'react';
import { Search, MapPin, Sparkles, Calendar, ArrowRight } from 'lucide-react';
import { useDestinations } from '@/hooks/useSiteContent';
import { CategoryType } from '../types';

interface QuickSearchProps {
  onSearchSubmit: (where: string, experience: CategoryType | 'All', timing: string) => void;
}

export const QuickSearch: React.FC<QuickSearchProps> = ({ onSearchSubmit }) => {
  const DESTINATIONS = useDestinations();
  const [selectedWhere, setSelectedWhere] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [selectedTiming, setSelectedTiming] = useState<string>('Anytime');

  const categories: (CategoryType | 'All')[] = [
    'All',
    'Beaches',
    'Mountains',
    'Culture',
    'Wildlife',
    'Adventure',
    'Food',
    'Hidden Gems'
  ];

  const timings = ['Anytime', 'Dec – Apr (High Season)', 'May – Sep (East Coast Sun)', 'Oct – Nov (Green Season)'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(selectedWhere, selectedCategory, selectedTiming);
  };

  return (
    <div className="relative z-30 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20">
      <div className="bg-[var(--brand-secondary)] text-white p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl border border-[var(--emerald-edge)]/30 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Where field */}
          <div className="md:col-span-4 bg-[var(--inverse-surface)]/80 p-3.5 rounded-2xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
            <label className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[var(--accent)] font-bold mb-1">
              <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Where to go?</span>
            </label>
            <select
              value={selectedWhere}
              onChange={(e) => setSelectedWhere(e.target.value)}
              className="w-full bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-[var(--inverse-surface)] text-white">
                All Sri Lanka Regions
              </option>
              {DESTINATIONS.map((dest) => (
                <option key={dest.id} value={dest.name} className="bg-[var(--inverse-surface)] text-white">
                  {dest.name} ({dest.region})
                </option>
              ))}
            </select>
          </div>

          {/* What experience field */}
          <div className="md:col-span-4 bg-[var(--inverse-surface)]/80 p-3.5 rounded-2xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
            <label className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[var(--accent)] font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>What Experience?</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryType | 'All')}
              className="w-full bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[var(--inverse-surface)] text-white">
                  {cat === 'All' ? 'All Experiences' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* When traveling field */}
          <div className="md:col-span-3 bg-[var(--inverse-surface)]/80 p-3.5 rounded-2xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
            <label className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[var(--accent)] font-bold mb-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>When Travelling?</span>
            </label>
            <select
              value={selectedTiming}
              onChange={(e) => setSelectedTiming(e.target.value)}
              className="w-full bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
            >
              {timings.map((t) => (
                <option key={t} value={t} className="bg-[var(--inverse-surface)] text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full h-full min-h-[52px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--brand-primary)] font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-95"
              title="Search Destinations"
            >
              <Search className="w-5 h-5 hidden md:block" />
              <span className="md:hidden flex items-center space-x-2">
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
