/**
 * The vehicle categories as migrations 0014, 0017, 0018, 0027, 0028 and 0029 leave them, in the
 * catalogue's order (sort order). `bookings.test` checks this list against the migrated
 * database, so the unit tests that use it test the real numbers.
 */
import type { BookingVehicle } from '../../shared/booking';

const base = { kind: 'passenger' as const, maxLoadKg: null, luggageCapacity: null, luggagePerPassenger: null, airConditioned: false, imageUrl: null, exampleModels: [] as string[], minPassengers: 1 };

export const SEEDED_VEHICLES: readonly BookingVehicle[] = [
  {
    ...base, id: 'mini', name: 'Mini', type: 'Car', description: 'A small hatchback for town runs and light luggage.',
    exampleModels: ['Suzuki Wagon R', 'Toyota Vitz', 'Toyota Aqua'], passengerCapacity: 3, luggageCapacity: 2,
    icon: 'mini', sortOrder: 10, acceptingRequests: true
  },
  {
    ...base, id: 'car', name: 'Car', type: 'Car', description: 'A comfortable saloon for airport runs and longer drives.',
    exampleModels: ['Toyota Prius', 'Toyota Axio', 'Toyota Allion'], passengerCapacity: 4, luggageCapacity: 4,
    icon: 'car', sortOrder: 20, acceptingRequests: true
  },
  {
    ...base, id: 'suv', name: 'SUV', type: 'SUV', description: 'A higher seat and more room for hill-country roads.',
    passengerCapacity: 5, luggageCapacity: 3, icon: 'suv', sortOrder: 30, acceptingRequests: true
  },
  {
    ...base, id: 'mini-van', name: 'Mini Van', type: 'Van', description: 'A compact van with sliding doors for small groups.',
    exampleModels: ['Suzuki Every', 'Nissan Clipper', 'Daihatsu Hijet'], passengerCapacity: 6,
    icon: 'mini-van', sortOrder: 40, acceptingRequests: false
  },
  {
    ...base, id: 'van', name: 'Van', type: 'Van', description: 'A full-size van for families and groups with luggage.',
    exampleModels: ['Toyota KDH', 'Nissan Urvan'], passengerCapacity: 9, icon: 'van', sortOrder: 50, acceptingRequests: false
  },
  {
    ...base, id: 'ac-bus', name: 'AC Bus', type: 'Bus', description: 'An air-conditioned bus for tours and groups.',
    passengerCapacity: 20, luggagePerPassenger: 2, airConditioned: true, icon: 'ac-bus', sortOrder: 55, acceptingRequests: true
  },
  {
    ...base, id: 'bus', name: 'Bus', type: 'Bus', description: 'Non-AC 30–52 seat buses for big groups and tours.',
    passengerCapacity: 52, luggagePerPassenger: 2, icon: 'bus', sortOrder: 60, acceptingRequests: true
  },
  {
    ...base, id: 'mini-lorry', name: 'Mini Lorry', type: 'Lorry', kind: 'goods', maxLoadKg: 100,
    description: 'An open-bed lorry for small loads. Driver only, no loading help.',
    passengerCapacity: 1, icon: 'mini-lorry', sortOrder: 70, acceptingRequests: true
  }
];

export const seeded = (id: string): BookingVehicle => {
  const vehicle = SEEDED_VEHICLES.find((v) => v.id === id);
  if (!vehicle) throw new Error(`no seeded vehicle ${id}`);
  return { ...vehicle, exampleModels: [...vehicle.exampleModels] };
};

/** The same category, switched on: for the rules that apply once staff confirm it. */
export const switchedOn = (id: string): BookingVehicle => ({ ...seeded(id), acceptingRequests: true });
