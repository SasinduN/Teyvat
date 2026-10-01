/**
 * The route-to-stops conversion of `db/migrations/0007_tour_stops.sql`, in
 * TypeScript, applied to the fixtures.
 *
 * `npm run verify:roundtrip` uses it to build the stops the database holds
 * for the approved tours, and `server/test/tour-stops.test.ts` checks that
 * the migration produced exactly these, so the two can't drift.
 */
import type { TourStopInput } from '../shared/tour-stops';

/** Confirmed by the owner on Google Maps (main entrance for the parks). */
export const CONFIRMED_CUSTOM_STOPS: Record<string, { lat: number; lng: number }> = {
  Wilpattu: { lat: 8.3063, lng: 80.1484 },
  Minneriya: { lat: 8.0326, lng: 80.8236 },
  Unawatuna: { lat: 6.0183, lng: 80.2525 }
};

/** Island in 7 Days: "South Coast" became the tour's own days 6 and 7. */
const REPLACEMENTS: Record<string, Record<string, { id: string; label: string }[]>> = {
  'island-in-7-days': {
    'South Coast': [
      { id: 'mirissa', label: 'Mirissa' },
      { id: 'galle', label: 'Galle' }
    ]
  }
};

interface NamedDestination {
  id: string;
  name: string;
}

/** A label equal to the destination's name is stored as NULL. */
const linked = (dest: NamedDestination, label: string): TourStopInput => ({
  kind: 'destination',
  destination_id: dest.id,
  name: label === dest.name ? null : label
});

export function stopsFromRoute(
  tourId: string,
  route: readonly string[],
  destinations: readonly NamedDestination[]
): TourStopInput[] {
  const byId = new Map(destinations.map((d) => [d.id, d]));
  const unresolved: string[] = [];
  const stops: TourStopInput[] = [];

  for (const raw of route) {
    const text = raw.trim();
    const replacement = REPLACEMENTS[tourId]?.[text];
    const custom = CONFIRMED_CUSTOM_STOPS[text];

    if (replacement) {
      for (const { id, label } of replacement) {
        const dest = byId.get(id);
        if (dest) stops.push(linked(dest, label));
        else unresolved.push(`${tourId}: ${text}`);
      }
    } else if (custom) {
      stops.push({ kind: 'custom', name: text, ...custom });
    } else {
      const slug = text.toLowerCase().replace(/\s+/g, '-');
      const dest =
        destinations.find((d) => d.name.toLowerCase() === text.toLowerCase()) ?? byId.get(slug);
      if (dest) stops.push(linked(dest, text));
      else unresolved.push(`${tourId}: ${text}`);
    }
  }

  if (unresolved.length > 0) {
    throw new Error(`No destination or confirmed coordinates for ${unresolved.join('; ')}`);
  }
  return stops;
}
