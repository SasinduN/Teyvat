import type { RefinementCtx } from 'zod';
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

type Trip = Pick<RideInput, 'pickup' | 'dropoff' | 'tripType' | 'departureDate' | 'departureTime' | 'returnDate' | 'returnTime'>;
/** Places and times, the same for a ride and for goods. */
function tripIssues(ride: Trip, ctx: RefinementCtx) {
  if (sameRideLocation(ride.pickup, ride.dropoff)) ctx.addIssue({ code: 'custom', path: ['dropoff'], message: 'Pickup and drop-off must be different locations.' });
  if (ride.tripType === 'round_trip') {
    if (!ride.returnDate || !ride.returnTime) ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Choose a return date and time.' });
    else if (tripInstant(ride.returnDate, ride.returnTime) <= tripInstant(ride.departureDate, ride.departureTime)) ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Return must be after pickup.' });
  } else if (ride.returnDate || ride.returnTime) ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'One-way rides cannot include return details.' });
}
function futureIssue(ride: Trip, ctx: RefinementCtx) {
  if (tripInstant(ride.departureDate, ride.departureTime) <= Date.now()) ctx.addIssue({ code: 'custom', path: ['departureDate'], message: 'Choose a future pickup date and time (Sri Lanka time).' });
}

export const rideDataSchema = rideFields.superRefine(tripIssues);
export const rideSchema = rideDataSchema.superRefine(futureIssue);
export type RideInput = z.infer<typeof rideSchema>;

/** What a goods round trip carries back: goods, nothing, or just the rider. */
export const RETURN_LOADS = ['goods', 'empty', 'rider'] as const;
export type ReturnLoad = (typeof RETURN_LOADS)[number];
export const RETURN_LOAD_LABELS: Record<ReturnLoad, string> = { goods: 'Carrying goods', empty: 'Empty', rider: 'Rider only' };

/** The refused-goods note, the owner's words. */
export const REFUSED_GOODS = "We don't carry anything illegal, or dangerous goods such as gas cylinders, fuel, fireworks, explosives, or corrosive or toxic chemicals.";

/**
 * A goods request (the Mini Lorry): the ride's places and times, what's moving, its weight if
 * known (`null` is "not sure"), who rides along next to the driver, and, for a round trip, what
 * comes back. The category's own limits are `checkLoad` and `checkRiders`.
 */
const goodsFields = rideFields.omit({ passengers: true }).extend({
  goods: z.string().trim().min(1, 'Tell us what you’re moving.').max(300, 'Keep the list of goods to 300 characters.'),
  weightKg: z.number({ error: 'Enter the weight in kg, or leave it blank.' }).int('Enter the weight in whole kg.').min(1, 'Enter the weight in kg, or leave it blank.').max(10000).nullable().default(null),
  riders: z.number().int().min(0).max(9),
  returnLoad: z.enum(RETURN_LOADS).nullable().default(null)
}).strict();
export const goodsDataSchema = goodsFields.superRefine((goods, ctx) => {
  tripIssues(goods, ctx);
  if (goods.tripType === 'round_trip') {
    if (!goods.returnLoad) ctx.addIssue({ code: 'custom', path: ['returnLoad'], message: 'Choose what the lorry carries on the way back.' });
    else if (goods.returnLoad === 'rider' && goods.riders === 0) ctx.addIssue({ code: 'custom', path: ['returnLoad'], message: 'Rider only needs someone riding along.' });
  } else if (goods.returnLoad) ctx.addIssue({ code: 'custom', path: ['returnLoad'], message: 'One-way trips cannot include the way back.' });
});
export const goodsSchema = goodsDataSchema.superRefine(futureIssue);
export type GoodsInput = z.infer<typeof goodsSchema>;
export const callbackPhoneSchema = z.string().trim().max(40).regex(/^\+?[\d\s().-]+$/, 'Enter a callback phone number.').refine(value => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}, 'Enter a callback phone number with 7–15 digits.');

/** Guest follow-up is separate from the seven-input ride form; account identity is never accepted. */
export const rideRequestDataSchema = z.object({ details: rideDataSchema, callbackPhone: callbackPhoneSchema.optional() }).strict();
export type RideSubmission = z.infer<typeof rideRequestDataSchema>;
export const initialRide = (): RideInput => ({ pickup: blankLocation(), dropoff: blankLocation(), tripType: 'one_way', departureDate: '', departureTime: '', returnDate: null, returnTime: null, passengers: 1, vehicleId: '' });

/** The ride with a new trip type. One way clears the return, so "one-way rides cannot include return details" holds. */
export function withTripType(ride: RideInput, tripType: RideInput['tripType']): RideInput {
  return tripType === 'one_way' ? { ...ride, tripType, returnDate: null, returnTime: null } : { ...ride, tripType };
}
