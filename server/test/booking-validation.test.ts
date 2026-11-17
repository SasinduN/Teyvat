/**
 * The booking rules shared by the form and the API (shared/booking.ts), and
 * the GPS pickup (src/lib/booking-geolocation.ts). No database.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  blankLocation,
  bookingDataSchema,
  bookingSchema,
  canTransition,
  bagsLabel,
  checkCapacity,
  groupBags,
  maxPassengers,
  offeredVehicle,
  passengerRange,
  smallestFit,
  sriLankaToday,
  tripInstant,
  vehicleSchema,
  type BookingInput
} from '../../shared/booking';
import { currentPickup, pickupWarning } from '../../src/lib/booking-geolocation';
import { SEEDED_VEHICLES, seeded, switchedOn } from './vehicle-categories';

const valid = (): BookingInput => ({
  tourId: null,
  pickup: blankLocation('Test hotel'),
  destinationId: 'sigiriya',
  stops: [],
  tripType: 'one_way',
  departureDate: '2099-10-20',
  departureTime: '09:00',
  returnDate: null,
  returnTime: null,
  returnPickup: null,
  returnDropoff: null,
  vehicleId: 'test-car',
  passengers: 2,
  contactName: 'Test traveller',
  contactEmail: 'traveller@example.test',
  contactPhone: '+94 770000000',
  notes: '',
  termsAccepted: true
});

test('a valid one-way request', () => assert.equal(bookingSchema.safeParse(valid()).success, true));
test('a valid round trip with other return points', () =>
  assert.equal(
    bookingSchema.safeParse({
      ...valid(),
      tripType: 'round_trip',
      returnDate: '2099-10-21',
      returnTime: '09:00',
      returnPickup: blankLocation('Different hotel'),
      returnDropoff: blankLocation('Airport')
    }).success,
    true
  ));

for (const [name, override] of [
  ['missing pickup', { pickup: blankLocation() }],
  ['missing destination', { destinationId: '' }],
  ['past departure', { departureDate: '2020-01-01' }],
  ['impossible date', { departureDate: '2099-02-30' }],
  ['invalid time', { departureTime: '24:00' }],
  ['round trip without a return', { tripType: 'round_trip' }],
  ['return before departure', { tripType: 'round_trip', returnDate: '2099-10-19', returnTime: '09:00' }],
  ['return at the same moment', { tripType: 'round_trip', returnDate: '2099-10-20', returnTime: '09:00' }],
  ['no passengers', { passengers: 0 }],
  ['part of a passenger', { passengers: 1.5 }],
  ['a status from the client', { status: 'confirmed' }],
  ['a price from the client', { price: 1 }],
  ['GPS without coordinates', { pickup: { ...blankLocation('GPS'), source: 'gps' } }],
  ['an empty stop', { stops: [blankLocation()] }],
  ['one way with return details', { returnDate: '2099-10-21' }],
  ['terms not accepted', { termsAccepted: false }]
] as [string, Record<string, unknown>][]) {
  test(`refused: ${name}`, () => assert.equal(bookingSchema.safeParse({ ...valid(), ...override }).success, false));
}

test('a past request still parses (to replay a retry) but cannot be made new', () => {
  const past = { ...valid(), departureDate: '2020-01-01' };
  assert.ok(bookingDataSchema.safeParse(past).success);
  assert.ok(!bookingSchema.safeParse(past).success);
});

test('Sri Lanka time: midnight and the conversion are the same in any browser timezone', () => {
  assert.equal(sriLankaToday(new Date('2026-10-10T18:31:00Z')), '2026-10-11');
  assert.equal(new Date(tripInstant('2099-10-20', '09:00')).toISOString(), '2099-10-20T03:30:00.000Z');
});

test('capacity: a real one is required, and a full vehicle is refused', () => {
  const v = { ...seeded('mini'), id: 'test-car', name: 'Test car' };
  assert.equal(checkCapacity(v, 3), null);
  assert.ok(checkCapacity(v, 4));
  assert.ok(!vehicleSchema.safeParse({ ...v, passengerCapacity: null }).success);
  assert.ok(checkCapacity({ ...v, acceptingRequests: false }, 1));
});

test("capacity: every category's own minimum and maximum, from its data", () => {
  for (const id of SEEDED_VEHICLES.map((v) => v.id)) {
    const v = switchedOn(id);
    const max = v.passengerCapacity!;
    assert.equal(checkCapacity(v, v.minPassengers), null, `${id}: its minimum fits`);
    assert.equal(checkCapacity(v, max), null, `${id}: its maximum fits`);
    assert.equal(checkCapacity(v, max + 1), 'Passenger count exceeds vehicle capacity.', `${id}: one over`);
    if (v.minPassengers > 1) assert.match(checkCapacity(v, v.minPassengers - 1)!, /at least/, `${id}: one under`);
  }
  // The seeded numbers themselves (passengers, never counting the driver).
  assert.deepEqual(SEEDED_VEHICLES.map((v) => [v.id, v.minPassengers, v.passengerCapacity]), [
    ['mini', 1, 3], ['car', 1, 4], ['suv', 1, 5], ['mini-van', 1, 6], ['van', 1, 9], ['ac-bus', 1, 20], ['bus', 1, 52]
  ]);
});

test('capacity: the AC Bus takes 1 to 20, the Bus any group up to 52, both taking requests (0028)', () => {
  const ac = seeded('ac-bus');
  const bus = seeded('bus');
  for (const [v, max] of [[ac, 20], [bus, 52]] as const) {
    assert.equal(v.acceptingRequests, true, `${v.id} is on`);
    assert.equal(checkCapacity(v, 1), null, `${v.id}: one passenger`);
    assert.equal(checkCapacity(v, max), null, `${v.id}: ${max}`);
    assert.equal(checkCapacity(v, max + 1), 'Passenger count exceeds vehicle capacity.', `${v.id}: ${max + 1}`);
  }
  assert.equal(passengerRange(ac), 'up to 20 passengers');
  assert.equal(passengerRange(bus), 'up to 52 passengers');
  assert.equal(ac.airConditioned, true);
  assert.equal(bus.airConditioned, false);
});

test('capacity: a category with a minimum still names it (none is seeded with one now)', () => {
  const coach = { ...seeded('bus'), minPassengers: 30 };
  assert.equal(checkCapacity(coach, 29), 'This category takes at least 30 passengers.');
  assert.equal(checkCapacity(coach, 30), null);
  assert.equal(passengerRange(coach), '30–52 passengers');
});

test('bags: one number for the vehicle, or per passenger worked out for the group', () => {
  assert.equal(bagsLabel(seeded('car')), '4 bags');
  assert.equal(bagsLabel(seeded('ac-bus')), '2 bags each');
  assert.equal(bagsLabel(seeded('bus')), '2 bags each');
  assert.equal(bagsLabel(seeded('van')), null, 'unknown: no badge');
  assert.equal(groupBags(seeded('ac-bus'), 12), 24, '12 passengers, 2 each');
  assert.equal(groupBags(seeded('bus'), 52), 104);
  assert.equal(groupBags(seeded('bus'), NaN), null, 'no count yet');
  assert.equal(groupBags(seeded('car'), 3), 4, 'the vehicle number, whatever the group');
  assert.ok(!vehicleSchema.safeParse({ ...seeded('car'), luggagePerPassenger: 2 }).success, 'not both');
  assert.ok(vehicleSchema.safeParse({ ...seeded('bus') }).success);
});

test('capacity: a minimum above the maximum is refused, and the words never count the driver', () => {
  assert.ok(!vehicleSchema.safeParse({ ...seeded('car'), minPassengers: 5 }).success);
  assert.ok(vehicleSchema.safeParse({ ...seeded('car'), imageUrl: '' }).success, 'an empty image is none');
  assert.ok(!vehicleSchema.safeParse({ ...seeded('car'), imageUrl: 'javascript:alert(1)' }).success);
  assert.ok(!vehicleSchema.safeParse({ ...seeded('car'), imageUrl: '/images/../secret.svg' }).success);
  assert.ok(!vehicleSchema.safeParse({ ...seeded('car'), icon: 'rocket' }).success, 'one of the eight icons');
  assert.ok(vehicleSchema.safeParse({ ...seeded('car'), icon: 'ac-bus' }).success);
  assert.equal(vehicleSchema.parse({ ...seeded('car'), icon: undefined }).icon, 'car', 'the car by default');
  assert.equal(passengerRange(seeded('car')), 'up to 4 passengers');
  assert.equal(passengerRange({ minPassengers: 1, passengerCapacity: 1 }), 'up to 1 passenger');
});

test("the picker: only categories taking requests, the smallest that fits, and the stepper's limit", () => {
  assert.deepEqual(SEEDED_VEHICLES.filter(offeredVehicle).map((v) => v.id), ['mini', 'car', 'suv', 'ac-bus', 'bus']);
  assert.equal(smallestFit(SEEDED_VEHICLES, 2)?.id, 'mini');
  assert.equal(smallestFit(SEEDED_VEHICLES, 4)?.id, 'car');
  assert.equal(smallestFit(SEEDED_VEHICLES, 5)?.id, 'suv');
  assert.equal(smallestFit(SEEDED_VEHICLES, 6)?.id, 'ac-bus', 'the vans are off, so the AC Bus');
  assert.equal(smallestFit(SEEDED_VEHICLES, 20)?.id, 'ac-bus');
  assert.equal(smallestFit(SEEDED_VEHICLES, 21)?.id, 'bus');
  assert.equal(smallestFit(SEEDED_VEHICLES, 52)?.id, 'bus');
  assert.equal(smallestFit(SEEDED_VEHICLES, 53), null);
  assert.equal(maxPassengers(SEEDED_VEHICLES), 52, "the stepper's limit is the Bus's");
  const allOn = SEEDED_VEHICLES.map((v) => switchedOn(v.id));
  assert.equal(smallestFit(allOn, 7)?.id, 'van');
  assert.equal(smallestFit(allOn, 12)?.id, 'ac-bus');
  assert.equal(maxPassengers(allOn), 52);
  assert.equal(maxPassengers([]), 1);
});

test('the lifecycle: never confirmed by itself, never reopened', () => {
  assert.ok(canTransition('pending', 'confirmed'));
  assert.ok(canTransition('pending', 'declined'));
  assert.ok(!canTransition('pending', 'completed'));
  assert.ok(canTransition('confirmed', 'cancelled'));
  assert.ok(!canTransition('cancelled', 'confirmed'));
});

test('GPS refused: the typed address still works', async () => {
  await assert.rejects(currentPickup({ getCurrentPosition: (_ok, fail) => fail?.({ code: 1 } as GeolocationPositionError) }), /denied.*manually/);
  assert.ok(bookingSchema.safeParse(valid()).success);
});

test('GPS timed out, or not in this browser', async () => {
  await assert.rejects(currentPickup({ getCurrentPosition: (_ok, fail) => fail?.({ code: 3 } as GeolocationPositionError) }), /timed out/);
  await assert.rejects(currentPickup(undefined), /does not support/);
});

test('GPS: one fresh reading with a time limit, labelled as coordinates, low accuracy said so', async () => {
  let calls = 0;
  const point = await currentPickup({
    getCurrentPosition: (ok, _fail, options) => {
      calls++;
      assert.equal(options?.timeout, 15_000);
      assert.equal(options?.maximumAge, 0);
      ok({ coords: { latitude: 7, longitude: 80, accuracy: 20 } } as GeolocationPosition);
    }
  });
  assert.equal(calls, 1);
  assert.equal(point.source, 'gps');
  assert.match(point.label, /not a verified address/);
  assert.match(pickupWarning({ ...point, accuracy: 900 }), /low/);
  assert.match(pickupWarning(point), /not a verified street address/);
});
