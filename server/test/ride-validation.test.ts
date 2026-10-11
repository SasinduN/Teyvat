import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankLocation } from '../../shared/booking';
import { rideSchema, rideDataSchema, rideRequestDataSchema, callbackPhoneSchema, sameRideLocation, type RideInput } from '../../shared/ride';

const valid = (): RideInput => ({ pickup: blankLocation('Matara'), dropoff: blankLocation('Galle'), tripType: 'one_way', departureDate: '2099-10-20', departureTime: '09:00', returnDate: null, returnTime: null, passengers: 2, vehicleId: 'test-car' });
test('manual city, hotel and airport rides need no tour or contact fields', () => {
  for (const [pickup, dropoff] of [['Matara', 'Galle'], ['Colombo', 'Kandy'], ['Ella', 'Nuwara Eliya'], ['Airport', 'Hotel entrance']]) {
    assert.ok(rideSchema.safeParse({ ...valid(), pickup: blankLocation(pickup), dropoff: blankLocation(dropoff) }).success);
  }
});
test('identical places are rejected after normalizing case and whitespace', () => {
  assert.ok(sameRideLocation(blankLocation(' Matara '), blankLocation('MATARA')));
  assert.ok(!rideSchema.safeParse({ ...valid(), dropoff: blankLocation('matara') }).success);
});
for (const [name, override] of [
  ['blank pickup', { pickup: blankLocation() }], ['blank dropoff', { dropoff: blankLocation() }],
  ['past departure', { departureDate: '2020-01-01' }], ['invalid calendar date', { departureDate: '2099-02-30' }],
  ['invalid time', { departureTime: '24:00' }], ['fractional passengers', { passengers: 1.5 }], ['zero passengers', { passengers: 0 }],
  ['missing return', { tripType: 'round_trip' }], ['return before pickup', { tripType: 'round_trip', returnDate: '2099-10-19', returnTime: '09:00' }],
  ['one-way return data', { returnDate: '2099-10-21', returnTime: '09:00' }], ['tour injection', { tourId: 'some-tour' }],
  ['customer identity injection', { customerUserId: 'other-user' }], ['price injection', { price: 100 }]
] as [string, object][]) test(`rejects ${name}`, () => assert.ok(!rideSchema.safeParse({ ...valid(), ...override }).success));
test('round trip accepts a later return, and old requests remain parseable for retries', () => {
  assert.ok(rideSchema.safeParse({ ...valid(), tripType: 'round_trip', returnDate: '2099-10-21', returnTime: '09:00' }).success);
  assert.ok(rideDataSchema.safeParse({ ...valid(), departureDate: '2020-01-01' }).success);
});
test('guest follow-up phone is validated separately and cannot supply account identity', () => {
  assert.ok(rideRequestDataSchema.safeParse({ details: valid(), callbackPhone: '+94 771234567' }).success);
  assert.ok(!callbackPhoneSchema.safeParse('.......').success);
  assert.ok(!rideRequestDataSchema.safeParse({ details: valid(), contactEmail: 'someone@example.test' }).success);
});
