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
export { date as bookingDateSchema, time as bookingTimeSchema };

/** Ride requests retain the legacy details fields for admin/history compatibility. */
export type BookingDetails = BookingInput & {
  kind?: 'ride';
  dropoff?: BookingLocation;
  customerUserId?: string;
};

/**
 * The vehicle icon set (src/components/booking/VehicleIcon.tsx). A category shows its icon unless
 * it has an image. `mini-lorry` is drawn for the goods categories still to come.
 */
export const VEHICLE_ICONS = ['mini', 'car', 'suv', 'mini-van', 'van', 'ac-bus', 'bus', 'mini-lorry'] as const;
export type VehicleIconName = (typeof VEHICLE_ICONS)[number];
export const VEHICLE_ICON_LABELS: Record<VehicleIconName, string> = {
  mini: 'Mini', car: 'Car', suv: 'SUV', 'mini-van': 'Mini Van', van: 'Van', 'ac-bus': 'AC Bus', bus: 'Bus', 'mini-lorry': 'Mini Lorry'
};

/** A vehicle image, which replaces the icon: an https URL from the media library (the server checks the host). */
const vehicleImage = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https:\/\/[^\s]+$/.test(v), 'Choose an image from the media library.');

/**
 * A vehicle category. Passenger counts never include the driver: every ride
 * comes with one. `minPassengers` to `passengerCapacity` is the range the
 * picker, the summary, the WhatsApp message and `checkCapacity` all read.
 */
export const vehicleSchema = z
  .object({
    id,
    name: text(80),
    type: z.enum(['Car', 'SUV', 'Van', 'Minibus', 'Bus']),
    description: z.string().trim().max(200).nullable().default(null).transform((v) => v || null),
    exampleModels: z.array(text(60)).max(6).default([]),
    minPassengers: z.number().int().min(1).max(100).default(1),
    passengerCapacity: z.number().int().min(1).max(100).nullable(),
    luggageCapacity: z.number().int().min(0).max(100).nullable(),
    /** Bags for each passenger (the buses: 2), instead of one number for the vehicle. */
    luggagePerPassenger: z.number().int().min(1).max(10).nullable().default(null),
    airConditioned: z.boolean().default(false),
    icon: z.enum(VEHICLE_ICONS).default('car'),
    imageUrl: z.preprocess((v) => (v === '' || v === undefined ? null : v), vehicleImage.nullable()),
    sortOrder: z.number().int().min(0).max(10000).default(0),
    acceptingRequests: z.boolean()
  })
  .strict()
  .refine((v) => !v.acceptingRequests || v.passengerCapacity !== null, 'Enter actual passenger capacity before enabling requests.')
  .refine((v) => v.luggageCapacity === null || v.luggagePerPassenger === null, {
    message: 'Give bags for the vehicle or bags per passenger, not both.',
    path: ['luggagePerPassenger']
  })
  .refine((v) => v.passengerCapacity === null || v.minPassengers <= v.passengerCapacity, {
    message: 'The minimum passengers can’t be more than the capacity.',
    path: ['minPassengers']
  });
export type BookingVehicle = z.output<typeof vehicleSchema>;

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
  details: BookingDetails;
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
  if (passengers > vehicle.passengerCapacity) return 'Passenger count exceeds vehicle capacity.';
  if (passengers < vehicle.minPassengers) return `This category takes at least ${vehicle.minPassengers} passengers.`;
  return null;
}

/** Whether a category is offered on the ride page: taking requests, with a capacity. */
export const offeredVehicle = (v: BookingVehicle): boolean => v.acceptingRequests && v.passengerCapacity !== null;

/** "up to 4 passengers", or "10–30 passengers" when there is a minimum. Never counts the driver. */
export function passengerRange(v: Pick<BookingVehicle, 'minPassengers' | 'passengerCapacity'>): string {
  if (v.passengerCapacity === null) return 'capacity not set';
  if (v.minPassengers > 1) return `${v.minPassengers}–${v.passengerCapacity} passengers`;
  return `up to ${v.passengerCapacity} passenger${v.passengerCapacity === 1 ? '' : 's'}`;
}

/** The smallest offered category that takes `passengers`, by capacity then sort order, or null. */
export function smallestFit(vehicles: readonly BookingVehicle[], passengers: number): BookingVehicle | null {
  return [...vehicles]
    .filter((v) => offeredVehicle(v) && checkCapacity(v, passengers) === null)
    .sort((a, b) => a.passengerCapacity! - b.passengerCapacity! || a.sortOrder - b.sortOrder)[0] ?? null;
}

/** The most passengers any offered category takes (the stepper's limit), or 1 with none. */
/** The bags badge: "4 bags" for the vehicle, "2 bags each" per passenger, or null when unknown. */
export function bagsLabel(v: Pick<BookingVehicle, 'luggageCapacity' | 'luggagePerPassenger'>): string | null {
  if (v.luggagePerPassenger !== null) return `${v.luggagePerPassenger} ${v.luggagePerPassenger === 1 ? 'bag' : 'bags'} each`;
  if (v.luggageCapacity !== null) return `${v.luggageCapacity} ${v.luggageCapacity === 1 ? 'bag' : 'bags'}`;
  return null;
}

/** The bags this group may bring: per passenger, worked out for `passengers`; else the vehicle's number. */
export function groupBags(v: Pick<BookingVehicle, 'luggageCapacity' | 'luggagePerPassenger'>, passengers: number): number | null {
  if (v.luggagePerPassenger !== null) return Number.isFinite(passengers) && passengers > 0 ? v.luggagePerPassenger * passengers : null;
  return v.luggageCapacity;
}

export function maxPassengers(vehicles: readonly BookingVehicle[]): number {
  return Math.max(1, ...vehicles.filter(offeredVehicle).map((v) => v.passengerCapacity!));
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
