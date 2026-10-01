/**
 * A Google Maps link for a point. A plain navigation in a new tab: no API, no
 * key, and nothing for the CSP to allow, since the page loads nothing from
 * Google.
 */
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** "~4 h" -> "~4 h from Colombo airport (CMB)". */
export function airportTravelTime(travelTime: string): string {
  return `${travelTime} from Colombo airport (CMB)`;
}
