import { useId } from 'react';
import { blankLocation, type BookingDestination, type BookingLocation } from '@shared/booking';

/** A place typed by hand, or picked from the published destinations, plus a meeting point. */
export function LocationField({
  label,
  value,
  onChange,
  destinations,
  required = true,
  compact = false,
  error
}: {
  label: string;
  value: BookingLocation;
  onChange: (v: BookingLocation) => void;
  destinations: BookingDestination[];
  required?: boolean;
  compact?: boolean;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="booking-location">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        list={`${id}-places`}
        required={required}
        maxLength={300}
        value={value.label}
        placeholder="City, hotel, airport or landmark"
        autoComplete="off"
        aria-describedby={`${id}-help`}
        aria-invalid={Boolean(error)}
        onChange={(e) => {
          const picked = destinations.find((d) => d.name.toLowerCase() === e.target.value.trim().toLowerCase());
          onChange(
            picked
              ? { ...blankLocation(picked.name), source: 'destination', destinationId: picked.id, lat: picked.latitude, lng: picked.longitude }
              : blankLocation(e.target.value)
          );
        }}
      />
      <datalist id={`${id}-places`}>
        {destinations.map((d) => (
          <option key={d.id} value={d.name} />
        ))}
      </datalist>
      <small id={`${id}-help`}>{error || (compact ? 'Type a city, hotel, airport or full address.' : 'Pick one of our destinations or type an address. Hotels and airports can be typed directly.')}</small>
      {value.source === 'gps' && (
        <p>
          Coordinates: {value.lat?.toFixed(5)}, {value.lng?.toFixed(5)} · accuracy ±{Math.round(value.accuracy ?? 0)} m
        </p>
      )}
      {!compact && <>
      <label htmlFor={`${id}-address`}>Specific address or meeting point</label>
      <input
        id={`${id}-address`}
        maxLength={500}
        value={value.address}
        autoComplete="street-address"
        placeholder="Hotel entrance, street or meeting instructions"
        onChange={(e) => onChange({ ...value, address: e.target.value })}
      />
      </>}
    </div>
  );
}
