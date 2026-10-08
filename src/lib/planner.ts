import type { CategoryType, Destination } from '@/types';

export interface PlannerPreferences { style: string; duration: string; region: string }
export const PLANNER_STYLES = ['Culture & Nature', 'Relax', 'Adventure', 'Culture', 'Wildlife', 'Luxury', 'Backpacking'];
export const PLANNER_DURATIONS = ['3–5 days', '6–8 days', '9–14 days', '15+ days'];
export const PLANNER_REGIONS = ['South Coast', 'Central Highlands', 'East Coast', 'Far North', 'Cultural Triangle', 'Around the Island'];
const regions: Record<string, Destination['region']> = { 'South Coast': 'South', 'Central Highlands': 'Central', 'East Coast': 'East', 'Far North': 'North', 'Cultural Triangle': 'Cultural Triangle' };
const interests: Record<string, CategoryType[]> = {
  'Culture & Nature': ['Culture', 'Mountains'], Relax: ['Beaches'], Adventure: ['Adventure', 'Mountains'],
  Culture: ['Culture'], Wildlife: ['Wildlife'], Luxury: ['Beaches', 'Culture'], Backpacking: ['Adventure', 'Hidden Gems']
};

/** A transparent sample built only from published destination facts, never a booking. */
export function buildSampleJourney(destinations: Destination[], preferences: PlannerPreferences) {
  const days = [4, 7, 10, 16][PLANNER_DURATIONS.indexOf(preferences.duration)] ?? 7;
  const categories = interests[preferences.style] ?? [];
  const candidates = destinations.filter(d => !regions[preferences.region] || d.region === regions[preferences.region]);
  const ranked = [...candidates].sort((a, b) =>
    b.category.filter(c => categories.includes(c)).length - a.category.filter(c => categories.includes(c)).length
  );
  // Take a small number of stops so short visits don't become cross-island marathons.
  const stops = ranked.slice(0, Math.max(1, Math.floor(days / 2)));
  if (!stops.length) return [];
  // Connect the selected stops by proximity rather than repeated long-distance jumps.
  const ordered = [stops.shift()!];
  while (stops.length) {
    const last = ordered[ordered.length - 1];
    stops.sort((a, b) => Math.hypot(a.latitude - last.latitude, a.longitude - last.longitude) - Math.hypot(b.latitude - last.latitude, b.longitude - last.longitude));
    ordered.push(stops.shift()!);
  }
  return Array.from({ length: days }, (_, index) => {
    const stopIndex = Math.min(ordered.length - 1, Math.floor(index * ordered.length / days));
    const d = ordered[stopIndex];
    const firstDay = index === 0 || Math.floor((index - 1) * ordered.length / days) !== stopIndex;
    return { day: index + 1, title: d.name, desc: firstDay ? d.shortDescription : d.experiences.join(' · ') || d.shortDescription };
  });
}

export const SAVED_PLAN_KEY = 'travel-eye:journey:v1';
export function readSavedJourney(): PlannerPreferences | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_PLAN_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const p = value as PlannerPreferences;
    return PLANNER_STYLES.includes(p.style) && PLANNER_DURATIONS.includes(p.duration) && PLANNER_REGIONS.includes(p.region) ? p : null;
  } catch { return null; }
}
