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
      <div className="bg-[#1C4737] text-white p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl border border-[#368E6B]/30 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Where field */}
          <div className="md:col-span-4 bg-[#0F2E23]/80 p-3.5 rounded-2xl border border-white/10 hover:border-[#D4AF37]/50 transition-colors">
            <label className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[#D4AF37] font-bold mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Where to go?</span>
            </label>
            <select
              value={selectedWhere}
              onChange={(e) => setSelectedWhere(e.target.value)}
              className="w-full bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-[#0F2E23] text-white">
                All Sri Lanka Regions
              </option>
              {DESTINATIONS.map((dest) => (
                <option key={dest.id} value={dest.name} className="bg-[#0F2E23] text-white">
                  {dest.name} ({dest.region})
                </option>
              ))}
            </select>
          </div>

          {/* What experience field */}
          <div className="md:col-span-4 bg-[#0F2E23]/80 p-3.5 rounded-2xl border border-white/10 hover:border-[#D4AF37]/50 transition-colors">
            <label className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[#D4AF37] font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>What Experience?</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryType | 'All')}
              className="w-full bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#0F2E23] text-white">
                  {cat === 'All' ? 'All Experiences' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* When traveling field */}
          <div className="md:col-span-3 bg-[#0F2E23]/80 p-3.5 rounded-2xl border border-white/10 hover:border-[#D4AF37]/50 transition-colors">
            <label className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[#D4AF37] font-bold mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>When Travelling?</span>
            </label>
            <select
              value={selectedTiming}
              onChange={(e) => setSelectedTiming(e.target.value)}
              className="w-full bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
            >
              {timings.map((t) => (
                <option key={t} value={t} className="bg-[#0F2E23] text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full h-full min-h-[52px] bg-[#D4AF37] hover:bg-[#C5A059] text-[#0F2E23] font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-95"
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
