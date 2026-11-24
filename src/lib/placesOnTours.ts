/** How many places a category's "Places on these tours" row lists. */
export const MAX_PLACES = 6;

/**
 * The published places a category's tours stop at, at most six: those more of its tours
 * visit first, then taking turns between the tours (each one's first stop, then each one's
 * second…), so one long route can't fill the row on its own.
 */
export function placesOnTours<D extends { id: string }>(
  tours: readonly { stops: readonly { destinationId?: string | null }[] }[],
  destinations: readonly D[]
): D[] {
  const published = new Map(destinations.map((d) => [d.id, d]));
  const routes = tours.map((tour) => [...new Set(tour.stops.flatMap((stop) => (stop.destinationId && published.has(stop.destinationId) ? [stop.destinationId] : [])))]);
  const visits = new Map<string, number>();
  for (const route of routes) for (const id of route) visits.set(id, (visits.get(id) ?? 0) + 1);
  const turn = new Map<string, number>();
  for (let k = 0; turn.size < visits.size; k += 1)
    for (const route of routes) if (k < route.length && !turn.has(route[k])) turn.set(route[k], turn.size);
  return [...visits.keys()]
    .sort((a, b) => visits.get(b)! - visits.get(a)! || turn.get(a)! - turn.get(b)!)
    .slice(0, MAX_PLACES)
    .map((id) => published.get(id)!);
}
