import { checkCapacity, checkLoad, checkRiders, passengerRange, vehicleRange, type BookingLocation, type BookingVehicle } from './booking';
import { goodsSchema, rideSchema, RETURN_LOAD_LABELS, type GoodsInput, type RideInput } from './ride';
import { normalizeWhatsAppNumber, whatsappNumberProblem, whatsappUrl } from './whatsapp';

const place = (label: string, location: BookingLocation): string[] => [
  `${label}: ${location.label}`,
  ...(location.address ? [`${label} address: ${location.address}`] : []),
  ...(location.lat !== null && location.lng !== null
    ? [`${label} map: https://www.google.com/maps?q=${location.lat},${location.lng}`] : [])
];

const SRI_LANKA_TIME = '(Sri Lanka time, UTC+05:30)';
/** Places, trip type and times: the same lines for a ride and for goods. */
const trip = (ride: Pick<RideInput, 'pickup' | 'dropoff' | 'tripType' | 'departureDate' | 'departureTime' | 'returnDate' | 'returnTime'>): string[] => [
  ...place('Pickup', ride.pickup),
  ...place('Drop-off', ride.dropoff),
  `Trip type: ${ride.tripType === 'round_trip' ? 'Round trip' : 'One way'}`,
  `Pickup date/time: ${ride.departureDate} ${ride.departureTime} ${SRI_LANKA_TIME}`,
  ...(ride.tripType === 'round_trip' ? [
    `Return date/time: ${ride.returnDate} ${ride.returnTime} ${SRI_LANKA_TIME}`,
    `Return route: ${ride.dropoff.label} → ${ride.pickup.label}`
  ] : [])
];

function whatsAppDigits(number: string | undefined): string {
  const digits = normalizeWhatsAppNumber(number ?? '');
  if (whatsappNumberProblem(digits)) throw new Error('WhatsApp ride enquiries are currently unavailable. Please contact our team.');
  return digits;
}

/** A visitor-reviewed WhatsApp draft; does not create an admin booking or send a message. */
export function rideWhatsAppUrl(number: string | undefined, input: RideInput, vehicle: BookingVehicle): string {
  const digits = whatsAppDigits(number);
  const ride = rideSchema.parse(input);
  if (vehicle.id !== ride.vehicleId) throw new Error('Select a supported vehicle category.');
  const capacityError = checkCapacity(vehicle, ride.passengers);
  if (capacityError) throw new Error(capacityError);
  const lines = [
    "Hi! I'd like to enquire about a ride in Sri Lanka.",
    ...trip(ride),
    `Passengers: ${ride.passengers}`,
    `Vehicle: ${vehicle.name} (${passengerRange(vehicle)})`,
    'Please confirm the fare and availability.'
  ];
  return whatsappUrl(digits, lines.join('\n'));
}

/** The goods draft (the Mini Lorry): the same trip lines, then what's moving, its weight, who rides along. */
export function goodsWhatsAppUrl(number: string | undefined, input: GoodsInput, vehicle: BookingVehicle): string {
  const digits = whatsAppDigits(number);
  const goods = goodsSchema.parse(input);
  if (vehicle.id !== goods.vehicleId) throw new Error('Select a supported vehicle category.');
  const problem = checkLoad(vehicle, goods.weightKg) ?? checkRiders(vehicle, goods.riders);
  if (problem) throw new Error(problem);
  const lines = [
    "Hi! I'd like to enquire about moving goods in Sri Lanka.",
    ...trip(goods),
    ...(goods.returnLoad ? [`On the way back: ${RETURN_LOAD_LABELS[goods.returnLoad].toLowerCase()}`] : []),
    `Goods: ${goods.goods}`,
    `Weight: ${goods.weightKg === null ? 'not sure' : `about ${goods.weightKg} kg`}`,
    `Riding along: ${goods.riders === 0 ? 'nobody' : `${goods.riders} ${goods.riders === 1 ? 'person' : 'people'} (next to the driver)`}`,
    `Vehicle: ${vehicle.name} (${vehicleRange(vehicle)})`,
    'Please confirm the fare and availability.'
  ];
  return whatsappUrl(digits, lines.join('\n'));
}
