/**
 * The home hero's "Book a ride" slide and button, shown only while bookings
 * are on (`BOOKINGS_ENABLED`, `useFeatures().bookings`). It isn't a
 * `hero_slides` row: the first row's photo is also the home page's share
 * image and preload, and other pages' headers, and none of that changes.
 *
 * The image is in one place: replace RIDE_SLIDE_IMAGE with the owner's photo
 * (uploaded through Admin → Media) when there is one.
 * docs/plans/ride-vehicle-picker.md, part 9.
 */
export const RIDE_SLIDE_ID = 'book-a-ride';
export const RIDE_SLIDE_IMAGE = '/images/vehicles/hero-ride.svg';
/** The artwork's own size, so it reserves its space while loading. */
export const RIDE_SLIDE_IMAGE_SIZE = { width: 680, height: 340 } as const;
/** The slide's place in the carousel: second, after the first photo. */
export const RIDE_SLIDE_INDEX = 1;

export const RIDE_SLIDE_COPY = {
  headline: 'Book a ride with a driver.',
  line: 'Airport, hotel and city pickups anywhere on the island.',
  button: 'Book a ride'
} as const;

/** The slides with the ride slide in its place; `photos` unchanged when bookings are off. */
export function withRideSlide<T extends { id: string; url: string; title: string; caption: string }>(photos: readonly T[], bookings: boolean): (T | RideSlide)[] {
  if (!bookings) return [...photos];
  const ride: RideSlide = { id: RIDE_SLIDE_ID, url: RIDE_SLIDE_IMAGE, title: '', caption: '', ride: true };
  return [...photos.slice(0, RIDE_SLIDE_INDEX), ride, ...photos.slice(RIDE_SLIDE_INDEX)];
}
export interface RideSlide { id: string; url: string; title: string; caption: string; ride: true }
