import { useId } from 'react';
import { checkCapacity, type BookingVehicle } from '@shared/booking';

/**
 * The tour request's vehicle categories; one that can't take the party (too many, or below its minimum) is disabled.
 * Goods categories (the Mini Lorry) aren't for tours and aren't listed.
 */
export function VehicleSelector({
  vehicles,
  value,
  passengers,
  onChange,
  compact = false,
  error
}: {
  vehicles: BookingVehicle[];
  value: string;
  passengers: number;
  onChange: (id: string) => void;
  compact?: boolean;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>Vehicle category</label>
      <select id={id} required value={value} aria-invalid={Boolean(error)} aria-describedby={`${id}-help`} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a vehicle</option>
        {vehicles.filter((v) => v.kind === 'passenger').map((v) => (
          <option key={v.id} value={v.id} disabled={checkCapacity(v, passengers) !== null}>
            {v.name}
            {v.passengerCapacity !== null ? ` · up to ${v.passengerCapacity} passengers` : ''}
            {!v.acceptingRequests ? ' · requests unavailable' : ''}
            {v.luggageCapacity !== null ? ` · ${v.luggageCapacity} bags` : ''}
          </option>
        ))}
      </select>
      <small id={`${id}-help`}>{error || (compact ? 'Subject to staff review.' : "Staff review each request; a category doesn't guarantee a particular vehicle is free.")}</small>
    </div>
  );
}
