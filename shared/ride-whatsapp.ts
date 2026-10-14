import { checkCapacity, type BookingLocation, type BookingVehicle } from './booking';
import { rideSchema, type RideInput } from './ride';
import { normalizeWhatsAppNumber, whatsappNumberProblem, whatsappUrl } from './whatsapp';

const place = (label: string, location: BookingLocation): string[] => [
  `${label}: ${location.label}`,
  ...(location.address ? [`${label} address: ${location.address}`] : []),
  ...(location.lat !== null && location.lng !== null
    ? [`${label} map: https://www.google.com/maps?q=${location.lat},${location.lng}`] : [])
];

/** A visitor-reviewed WhatsApp draft; does not create an admin booking or send a message. */
export function rideWhatsAppUrl(number: string | undefined, input: RideInput, vehicle: BookingVehicle): string {
  const digits = normalizeWhatsAppNumber(number ?? '');
  if (whatsappNumberProblem(digits)) throw new Error('WhatsApp ride enquiries are currently unavailable. Please contact our team.');
  const ride = rideSchema.parse(input);
  if (vehicle.id !== ride.vehicleId) throw new Error('Select a supported vehicle category.');
  const capacityError = checkCapacity(vehicle, ride.passengers);
  if (capacityError) throw new Error(capacityError);
  const lines = [
    "Hi! I'd like to enquire about a ride in Sri Lanka.",
    ...place('Pickup', ride.pickup),
    ...place('Drop-off', ride.dropoff),
    `Trip type: ${ride.tripType === 'round_trip' ? 'Round trip' : 'One way'}`,
    `Pickup date/time: ${ride.departureDate} ${ride.departureTime} (Sri Lanka time, UTC+05:30)`,
    ...(ride.tripType === 'round_trip' ? [
      `Return date/time: ${ride.returnDate} ${ride.returnTime} (Sri Lanka time, UTC+05:30)`,
      `Return route: ${ride.dropoff.label} → ${ride.pickup.label}`
    ] : []),
    `Passengers: ${ride.passengers}`,
    `Vehicle: ${vehicle.name}`,
    'Please confirm the fare and availability.'
  ];
  return whatsappUrl(digits, lines.join('\n'));
}
