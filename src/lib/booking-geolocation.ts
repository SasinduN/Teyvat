import { blankLocation, type BookingLocation } from '@shared/booking';

/**
 * The pickup from the device's GPS: one reading, only when the visitor
 * presses "Use my current location", never cached and never watched. No
 * address lookup: the coordinates stay labelled as coordinates, and nothing
 * leaves the browser unless the visitor sends the request.
 */
export function geolocationMessage(code: number): string {
  const messages: Record<number, string> = {
    1: 'Location permission was denied. Enter your pickup address manually.',
    2: 'GPS is unavailable. Enter your pickup address manually.',
    3: 'GPS timed out. Try again or enter your pickup address manually.'
  };
  return messages[code] ?? 'Location could not be detected. Enter your pickup address manually.';
}

export function currentPickup(geo: Pick<Geolocation, 'getCurrentPosition'> | undefined): Promise<BookingLocation> {
  if (!geo) return Promise.reject(new Error('This browser does not support GPS. Enter your pickup address manually.'));
  return new Promise((resolve, reject) =>
    geo.getCurrentPosition(
      (p) =>
        resolve({
          ...blankLocation('GPS pickup (coordinates, not a verified address)'),
          source: 'gps',
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy
        }),
      (e) => reject(new Error(geolocationMessage(e.code))),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    )
  );
}

/** What to tell the visitor about a GPS pickup (low accuracy, or that it isn't an address). */
export function pickupWarning(point: BookingLocation): string {
  return (point.accuracy ?? 0) > 100
    ? 'GPS accuracy is low. Check the pickup point and enter your specific address.'
    : 'GPS coordinates are not a verified street address. Add your pickup address.';
}
