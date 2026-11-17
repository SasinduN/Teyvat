import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankLocation, type BookingVehicle } from '../../shared/booking';
import { initialRide, withTripType, type RideInput } from '../../shared/ride';
import { seeded, switchedOn } from './vehicle-categories';
import { rideWhatsAppUrl } from '../../shared/ride-whatsapp';

const vehicle: BookingVehicle = seeded('car');
const ride = (): RideInput => ({ ...initialRide(), pickup: blankLocation('Matara'), dropoff: blankLocation('Galle'), departureDate: '2099-12-20', departureTime: '09:15', passengers: 2, vehicleId: 'car' });
const draft = (value = ride()) => new URL(rideWhatsAppUrl('+94 77 123 6478', value, vehicle));

test('ride draft uses configured WhatsApp recipient and includes every one-way field', () => {
  const url = draft();
  assert.equal(url.origin, 'https://wa.me'); assert.equal(url.pathname, '/94771236478');
  const text = url.searchParams.get('text')!;
  for (const part of ['Pickup: Matara', 'Drop-off: Galle', 'Trip type: One way', '2099-12-20 09:15', 'UTC+05:30', 'Passengers: 2', 'Vehicle: Car', 'confirm the fare and availability']) assert.ok(text.includes(part), part);
  assert.doesNotMatch(text, /Return date|confirmed|Reference:/);
});
test('round-trip draft includes return date, time and reversed route', () => {
  const value = ride(); value.tripType = 'round_trip'; value.returnDate = '2099-12-21'; value.returnTime = '17:30';
  const text = draft(value).searchParams.get('text')!;
  assert.match(text, /Trip type: Round trip/); assert.match(text, /2099-12-21 17:30/); assert.match(text, /Return route: Galle → Matara/);
});
test('addresses, Unicode and GPS map coordinates survive URL encoding', () => {
  const value = ride(); value.pickup = { ...blankLocation('Hotel & Café #1'), address: '12 Beach Road', source: 'gps', lat: 7.29, lng: 80.63, accuracy: 25 };
  const text = draft(value).searchParams.get('text')!;
  assert.ok(text.includes('Hotel & Café #1')); assert.ok(text.includes('Pickup address: 12 Beach Road')); assert.ok(text.includes('https://www.google.com/maps?q=7.29,80.63'));
});
test('the whole one-way message, word for word', () => {
  assert.equal(draft().searchParams.get('text'), [
    "Hi! I'd like to enquire about a ride in Sri Lanka.",
    'Pickup: Matara',
    'Drop-off: Galle',
    'Trip type: One way',
    'Pickup date/time: 2099-12-20 09:15 (Sri Lanka time, UTC+05:30)',
    'Passengers: 2',
    'Vehicle: Car (up to 4 passengers)',
    'Please confirm the fare and availability.'
  ].join('\n'));
});
test('the whole round-trip message, word for word', () => {
  const value = withTripType(ride(), 'round_trip'); value.returnDate = '2099-12-21'; value.returnTime = '17:30';
  assert.equal(draft(value).searchParams.get('text'), [
    "Hi! I'd like to enquire about a ride in Sri Lanka.",
    'Pickup: Matara',
    'Drop-off: Galle',
    'Trip type: Round trip',
    'Pickup date/time: 2099-12-20 09:15 (Sri Lanka time, UTC+05:30)',
    'Return date/time: 2099-12-21 17:30 (Sri Lanka time, UTC+05:30)',
    'Return route: Galle → Matara',
    'Passengers: 2',
    'Vehicle: Car (up to 4 passengers)',
    'Please confirm the fare and availability.'
  ].join('\n'));
});
test('a category with a minimum names its range', () => {
  const text = new URL(rideWhatsAppUrl('94771236478', { ...ride(), passengers: 12, vehicleId: 'bus' }, switchedOn('bus'))).searchParams.get('text')!;
  assert.ok(text.includes('Vehicle: Bus (10–30 passengers)'));
  assert.throws(() => rideWhatsAppUrl('94771236478', { ...ride(), passengers: 2, vehicleId: 'bus' }, switchedOn('bus')), /at least 10/);
});
test('missing or invalid WhatsApp configuration never produces a chat link', () => {
  for (const number of [undefined, '', '0771234567', 'https://example.com', '940771234567']) assert.throws(() => rideWhatsAppUrl(number, ride(), vehicle), /unavailable/);
});
test('invalid routes, dates and passenger counts cannot bypass ride validation', () => {
  for (const value of [{ ...ride(), dropoff: blankLocation('Matara') }, { ...ride(), departureDate: '2020-01-01' }, { ...ride(), passengers: 1.5 }]) assert.throws(() => draft(value));
});
test('capacity, category availability and selected vehicle must be valid', () => {
  assert.throws(() => draft({ ...ride(), passengers: 5 }), /capacity/);
  assert.throws(() => rideWhatsAppUrl('94771236478', ride(), { ...vehicle, acceptingRequests: false }), /not accepting/);
  assert.throws(() => rideWhatsAppUrl('94771236478', ride(), { ...vehicle, id: 'suv' }), /supported vehicle/);
});
