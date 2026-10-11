/**
 * Booking requests (the friend import; docs/BOOKING_API.md): the shapes and
 * rules the form, the API and the admin page share. A request is never a
 * reservation: the server sets `pending`, and staff confirm by hand.
 *
 * Every wall time is Sri Lanka's (Asia/Colombo, UTC+05:30), whatever the
 * browser's timezone.
 */
import { z } from './zod';

export const BOOKING_API = {
  root: '/api/bookings',
  admin: '/api/admin/bookings',
  vehicles: '/api/admin/booking-vehicles'
} as const;

export const BOOKING_STATUSES = ['pending', 'confirmed', 'declined', 'cancelled', 'completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const BOOKING_TIMEZONE = 'Asia/Colombo';

const text = (max: number) => z.string().trim().min(1).max(max);
const id = text(100).regex(/^[a-z0-9-]+$/);

/** A pickup, stop or drop-off: typed by hand, a published destination, or the device's GPS. */
export const locationSchema = z
  .object({
    label: text(300),
    address: z.string().trim().max(500).default(''),
    source: z.enum(['manual', 'gps', 'destination']),
    destinationId: id.nullable().default(null),
    lat: z.number().finite().min(-90).max(90).nullable().default(null),
    lng: z.number().finite().min(-180).max(180).nullable().default(null),
    accuracy: z.number().finite().min(0).max(100000).nullable().default(null)
  })
  .strict()
  .superRefine((v, ctx) => {
    if ((v.lat === null) !== (v.lng === null)) ctx.addIssue({ code: 'custom', message: 'Both coordinates are required.' });
    if (v.source === 'gps' && (v.lat === null || v.lng === null || v.accuracy === null)) {
      ctx.addIssue({ code: 'custom', message: 'GPS requires coordinates and accuracy.' });
    }
    if (v.source === 'destination' && !v.destinationId) ctx.addIssue({ code: 'custom', message: 'Select a catalogue location.' });
    if (v.source !== 'destination' && v.destinationId !== null) ctx.addIssue({ code: 'custom', message: 'Invalid location source.' });
  });
export type BookingLocation = z.infer<typeof locationSchema>;

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Enter a valid date.');
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time.');

/** A Sri Lanka date and time as an instant (ms). */
export function tripInstant(day: string, clock: string): number {
  return Date.parse(`${day}T${clock}:00+05:30`);
}

/** Today's date in Sri Lanka, as YYYY-MM-DD. */
export function sriLankaToday(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/** A request's shape, without the "departure in the future" rule (a retry of an old one still parses). */
export const bookingDataSchema = z
  .object({
    tourId: id.nullable().default(null),
    pickup: locationSchema,
    destinationId: id,
    stops: z.array(locationSchema).max(10).default([]),
    tripType: z.enum(['one_way', 'round_trip']),
    departureDate: date,
    departureTime: time,
    returnDate: date.nullable().default(null),
    returnTime: time.nullable().default(null),
    returnPickup: locationSchema.nullable().default(null),
    returnDropoff: locationSchema.nullable().default(null),
    vehicleId: id,
    passengers: z.number().int().min(1).max(100),
    contactName: text(100),
    contactEmail: z.string().trim().toLowerCase().email().max(254),
    contactPhone: text(40).regex(/^[+\d\s().-]{6,40}$/, 'Enter a contact phone number.'),
    notes: z.string().trim().max(1000).default(''),
    termsAccepted: z.literal(true)
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.tripType === 'round_trip') {
      if (!v.returnDate || !v.returnTime) {
        ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Return date and time are required.' });
      } else if (tripInstant(v.returnDate, v.returnTime) <= tripInstant(v.departureDate, v.departureTime)) {
        ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Return must be after departure.' });
      }
    } else if (v.returnDate || v.returnTime || v.returnPickup || v.returnDropoff) {
      ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'One-way requests cannot include return details.' });
    }
  });

/** A new or edited request: as above, departing in the future. */
export const bookingSchema = bookingDataSchema.superRefine((v, ctx) => {
  if (tripInstant(v.departureDate, v.departureTime) <= Date.now()) {
    ctx.addIssue({ code: 'custom', path: ['departureDate'], message: 'Departure must be in the future (Sri Lanka time).' });
  }
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const vehicleSchema = z
  .object({
    id,
    name: text(80),
    type: z.enum(['Car', 'SUV', 'Van', 'Minibus']),
    passengerCapacity: z.number().int().min(1).max(100).nullable(),
    luggageCapacity: z.number().int().min(0).max(100).nullable(),
    acceptingRequests: z.boolean()
  })
  .strict()
  .refine((v) => !v.acceptingRequests || v.passengerCapacity !== null, 'Enter actual passenger capacity before enabling requests.');
export type BookingVehicle = z.infer<typeof vehicleSchema>;

export interface BookingDestination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}
export interface BookingTour {
  id: string;
  title: string;
  stops: BookingLocation[];
}
export interface BookingCatalog {
  destinations: BookingDestination[];
  tours: BookingTour[];
  vehicles: BookingVehicle[];
  notificationsConfigured: boolean;
}
export interface BookingRecord {
  id: string;
  reference: string;
  status: BookingStatus;
  details: BookingInput;
  tourName: string | null;
  destinationName: string;
  vehicle: BookingVehicle;
  tourStops: BookingLocation[];
  createdAt: string;
  updatedAt: string;
  version: number;
  history: { status: BookingStatus; action: string; at: string }[];
  notifications: { status: string; event: string }[];
}

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['cancelled', 'completed'],
  declined: [],
  cancelled: [],
  completed: []
};

/** Whether a request may move from `from` to `to`. Ended requests never reopen. */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Why `vehicle` can't carry `passengers`, or null. */
export function checkCapacity(vehicle: BookingVehicle, passengers: number): string | null {
  if (!vehicle.acceptingRequests || vehicle.passengerCapacity === null) return 'This vehicle category is not accepting requests.';
  return passengers > vehicle.passengerCapacity ? 'Passenger count exceeds vehicle capacity.' : null;
}

export const blankLocation = (label = ''): BookingLocation => ({
  label,
  address: '',
  source: 'manual',
  destinationId: null,
  lat: null,
  lng: null,
  accuracy: null
});
