import React, { useState, useId } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { categoryLabel } from '@/lib/categories';
import { useDestinations } from '@/hooks/useSiteContent';
import { TRAVEL_TIMINGS } from '@/lib/travelTiming';
import { CategoryType } from '../types';

interface QuickSearchProps {
  onSearchSubmit: (where: string, experience: CategoryType | 'All', timing: string) => void;
}

export const QuickSearch: React.FC<QuickSearchProps> = ({ onSearchSubmit }) => {
  const id = useId();
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

  const timings = TRAVEL_TIMINGS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(selectedWhere, selectedCategory, selectedTiming);
  };

  return (
    <div className="te-container te-search">
      <div className="bg-[var(--inverse-surface)] text-white p-4 sm:p-6 md:p-8 rounded-lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_auto] gap-4 items-center">
          
          {/* Where field */}
          <div className="bg-[var(--inverse-surface)]/80 p-3.5 rounded-2xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
            <label htmlFor={`${id}-where`} className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[var(--accent-text)] font-bold mb-1">
              <span>Where to go?</span>
            </label>
            <select id={`${id}-where`}
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
          <div className="bg-[var(--inverse-surface)]/80 p-3.5 rounded-2xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
            <label htmlFor={`${id}-category`} className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[var(--accent-text)] font-bold mb-1">
              <span>What Experience?</span>
            </label>
            <select id={`${id}-category`}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryType | 'All')}
              className="w-full bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[var(--inverse-surface)] text-white">
                  {cat === 'All' ? 'All Experiences' : categoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* When traveling field */}
          <div className="bg-[var(--inverse-surface)]/80 p-3.5 rounded-2xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
            <label htmlFor={`${id}-timing`} className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[var(--accent-text)] font-bold mb-1">
              <span>When Travelling?</span>
            </label>
            <select id={`${id}-timing`} aria-describedby={`${id}-timing-help`}
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
          <div className="">
            <button
              type="submit"
              className="te-button te-button--primary w-full h-full min-h-[52px] font-bold flex items-center justify-center space-x-2"
              aria-label="Search destinations" title="Search Destinations"
            >
              <Search className="w-5 h-5 hidden xl:block" />
              <span className="xl:hidden flex items-center space-x-2">
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>

        </form>
        <p id={`${id}-timing-help`} className="mt-3 text-sm text-white/75">Season choices match destinations’ published best-time guidance; conditions may vary.</p>
      </div>
    </div>
  );
};
