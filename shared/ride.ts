import { z } from './zod';
import { blankLocation, bookingDateSchema, bookingTimeSchema, locationSchema, tripInstant, type BookingLocation } from './booking';

/** Comparable typed places; coordinates alone are not a street address. */
export function sameRideLocation(a: BookingLocation, b: BookingLocation): boolean {
  const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  if (a.destinationId && b.destinationId && a.destinationId === b.destinationId && !a.address && !b.address) return true;
  if (a.lat !== null && a.lng !== null && b.lat !== null && b.lng !== null && a.lat === b.lat && a.lng === b.lng && !a.address && !b.address) return true;
  return Boolean(a.label.trim() && b.label.trim()) && normalize(`${a.label} ${a.address}`) === normalize(`${b.label} ${b.address}`);
}

const rideFields = z.object({
  pickup: locationSchema,
  dropoff: locationSchema,
  tripType: z.enum(['one_way', 'round_trip']),
  departureDate: bookingDateSchema,
  departureTime: bookingTimeSchema,
  returnDate: bookingDateSchema.nullable().default(null),
  returnTime: bookingTimeSchema.nullable().default(null),
  passengers: z.number().int().min(1).max(100),
  vehicleId: z.string().trim().min(1, 'Select a vehicle category.').max(100).regex(/^[a-z0-9-]+$/)
}).strict();

export const rideDataSchema = rideFields.superRefine((ride, ctx) => {
  if (sameRideLocation(ride.pickup, ride.dropoff)) ctx.addIssue({ code: 'custom', path: ['dropoff'], message: 'Pickup and drop-off must be different locations.' });
  if (ride.tripType === 'round_trip') {
    if (!ride.returnDate || !ride.returnTime) ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Choose a return date and time.' });
    else if (tripInstant(ride.returnDate, ride.returnTime) <= tripInstant(ride.departureDate, ride.departureTime)) ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Return must be after pickup.' });
  } else if (ride.returnDate || ride.returnTime) ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'One-way rides cannot include return details.' });
});
export const rideSchema = rideDataSchema.superRefine((ride, ctx) => {
  if (tripInstant(ride.departureDate, ride.departureTime) <= Date.now()) ctx.addIssue({ code: 'custom', path: ['departureDate'], message: 'Choose a future pickup date and time (Sri Lanka time).' });
});
export type RideInput = z.infer<typeof rideSchema>;
export const callbackPhoneSchema = z.string().trim().max(40).regex(/^\+?[\d\s().-]+$/, 'Enter a callback phone number.').refine(value => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}, 'Enter a callback phone number with 7–15 digits.');

/** Guest follow-up is separate from the seven-input ride form; account identity is never accepted. */
export const rideRequestDataSchema = z.object({ details: rideDataSchema, callbackPhone: callbackPhoneSchema.optional() }).strict();
export type RideSubmission = z.infer<typeof rideRequestDataSchema>;
export const initialRide = (): RideInput => ({ pickup: blankLocation(), dropoff: blankLocation(), tripType: 'one_way', departureDate: '', departureTime: '', returnDate: null, returnTime: null, passengers: 1, vehicleId: '' });
