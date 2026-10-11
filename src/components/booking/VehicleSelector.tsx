import { useId } from 'react';
import type { BookingVehicle } from '@shared/booking';

/** The vehicle categories staff have set up; one that can't take the party is disabled. */
export function VehicleSelector({
  vehicles,
  value,
  passengers,
  onChange
}: {
  vehicles: BookingVehicle[];
  value: string;
  passengers: number;
  onChange: (id: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>Vehicle category</label>
      <select id={id} required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a vehicle</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id} disabled={!v.acceptingRequests || v.passengerCapacity === null || passengers > v.passengerCapacity}>
            {v.name}
            {v.passengerCapacity !== null ? ` · up to ${v.passengerCapacity} passengers` : ''}
            {!v.acceptingRequests ? ' · requests unavailable' : ''}
            {v.luggageCapacity !== null ? ` · ${v.luggageCapacity} bags` : ''}
          </option>
        ))}
      </select>
      <small>Staff review each request; a category doesn't guarantee a particular vehicle is free.</small>
    </div>
  );
}
