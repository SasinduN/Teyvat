/**
 * The vehicle categories as migrations 0014, 0017, 0018 and 0027 leave them.
 * `bookings.test` checks this list against the migrated database, so the unit
 * tests that use it test the real numbers.
 */
import type { BookingVehicle } from '../../shared/booking';

export const SEEDED_VEHICLES: readonly BookingVehicle[] = [
  {
    id: 'mini', name: 'Mini', type: 'Car', description: 'A small hatchback for town runs and light luggage.',
    exampleModels: ['Suzuki Wagon R', 'Toyota Vitz', 'Toyota Aqua'], minPassengers: 1, passengerCapacity: 3, luggageCapacity: 2,
    imageUrl: '/images/vehicles/mini.svg', sortOrder: 10, acceptingRequests: true
  },
  {
    id: 'car', name: 'Car', type: 'Car', description: 'A comfortable saloon for airport runs and longer drives.',
    exampleModels: ['Toyota Prius', 'Toyota Axio', 'Toyota Allion'], minPassengers: 1, passengerCapacity: 4, luggageCapacity: 4,
    imageUrl: '/images/vehicles/car.svg', sortOrder: 20, acceptingRequests: true
  },
  {
    id: 'suv', name: 'SUV', type: 'SUV', description: 'A higher seat and more room for hill-country roads.',
    exampleModels: [], minPassengers: 1, passengerCapacity: 5, luggageCapacity: 3,
    imageUrl: '/images/vehicles/suv.svg', sortOrder: 30, acceptingRequests: true
  },
  {
    id: 'mini-van', name: 'Mini Van', type: 'Van', description: 'A compact van with sliding doors for small groups.',
    exampleModels: ['Suzuki Every', 'Nissan Clipper', 'Daihatsu Hijet'], minPassengers: 1, passengerCapacity: 6, luggageCapacity: null,
    imageUrl: '/images/vehicles/mini-van.svg', sortOrder: 40, acceptingRequests: false
  },
  {
    id: 'van', name: 'Van', type: 'Van', description: 'A full-size van for families and groups with luggage.',
    exampleModels: ['Toyota KDH', 'Nissan Urvan'], minPassengers: 1, passengerCapacity: 9, luggageCapacity: null,
    imageUrl: '/images/vehicles/van.svg', sortOrder: 50, acceptingRequests: false
  },
  {
    id: 'bus', name: 'Bus', type: 'Bus', description: 'A coach for larger groups and tours.',
    exampleModels: [], minPassengers: 10, passengerCapacity: 30, luggageCapacity: null,
    imageUrl: '/images/vehicles/bus.svg', sortOrder: 60, acceptingRequests: false
  }
];

export const seeded = (id: string): BookingVehicle => {
  const vehicle = SEEDED_VEHICLES.find((v) => v.id === id);
  if (!vehicle) throw new Error(`no seeded vehicle ${id}`);
  return { ...vehicle, exampleModels: [...vehicle.exampleModels] };
};

/** The same category, switched on: for the rules that apply once staff confirm it. */
export const switchedOn = (id: string): BookingVehicle => ({ ...seeded(id), acceptingRequests: true });
