/**
 * Straight-line distances for "about 4 km away": the great-circle distance on a
 * sphere the Earth's mean radius, which over a few tens of kilometres is within a
 * fraction of a percent of the true one. Never a road distance, and the page says so.
 */
const EARTH_RADIUS_KM = 6371.0088;

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Kilometres between two points, as the crow flies (the haversine formula). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * "about 4 km away": whole kilometres, which is as exact as a straight line from a
 * town's centre can honestly be. Under one kilometre is "under 1 km away".
 */
export function distanceLabel(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 1) return 'under 1 km away';
  return `about ${Math.round(km)} km away`;
}
