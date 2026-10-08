const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const TRAVEL_TIMINGS = ['Anytime', 'Dec – Apr (High Season)', 'May – Sep (East Coast Sun)', 'Oct – Nov (Green Season)'];

/** Match documented best-time ranges; never guess a season for unknown wording. */
export function matchesTravelTiming(bestTime: string, timing: string): boolean {
  if (timing === 'Anytime' || !TRAVEL_TIMINGS.includes(timing) || /year[ -]round/i.test(bestTime)) return true;
  const windows: Record<string, number[]> = { [TRAVEL_TIMINGS[1]]: [11, 0, 1, 2, 3], [TRAVEL_TIMINGS[2]]: [4, 5, 6, 7, 8], [TRAVEL_TIMINGS[3]]: [9, 10] };
  const available = new Set<number>();
  const ranges = [...bestTime.toLowerCase().matchAll(/([a-z]+)\s*[–—-]\s*([a-z]+)/g)];
  for (const range of ranges) {
    const start = months.indexOf(range[1].slice(0, 3)), end = months.indexOf(range[2].slice(0, 3));
    if (start < 0 || end < 0) continue;
    for (let month = start; ; month = (month + 1) % 12) { available.add(month); if (month === end) break; }
  }
  // Unknown editorial wording stays discoverable, rather than silently excluded.
  return available.size === 0 || windows[timing].some(month => available.has(month));
}
