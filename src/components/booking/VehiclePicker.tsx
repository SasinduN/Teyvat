import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { checkCapacity, passengerRange, type BookingVehicle } from '@shared/booking';

/** A category's image at a fixed size, so nothing shifts while it loads; nothing when it has none. */
export function VehicleImage({ vehicle, width, height, className, eager = false }: {
  vehicle: BookingVehicle; width: number; height: number; className?: string; eager?: boolean;
}) {
  if (!vehicle.imageUrl) return null;
  return <img className={className} src={vehicle.imageUrl} alt="" width={width} height={height} decoding="async" loading={eager ? 'eager' : 'lazy'} />;
}

/** "Up to 4 passengers", capitalised for a badge. */
export const rangeLabel = (v: BookingVehicle) => passengerRange(v).replace(/^u/, 'U');

/** Why a card is dimmed for this many passengers, or null when it fits. */
function fitNote(v: BookingVehicle, passengers: number): string | null {
  if (!Number.isFinite(passengers) || checkCapacity(v, passengers) === null) return null;
  return passengers < v.minPassengers ? `From ${v.minPassengers} passengers` : `Too small for ${passengers}`;
}

/**
 * The ride page's vehicle categories as a row of cards, one native radio each:
 * the arrow keys move the choice and Tab enters and leaves the group once. A
 * card that can't take the party is dimmed but can still be chosen; the
 * capacity error then shows by the passenger field. Phones swipe (scroll
 * snap); wider screens get arrow buttons while the row overflows.
 */
export function VehiclePicker({ vehicles, value, passengers, onChange, error }: {
  vehicles: BookingVehicle[];
  value: string;
  passengers: number;
  onChange: (id: string) => void;
  error?: string;
}) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => { observer.disconnect(); el.removeEventListener('scroll', measure); };
  }, [measure, vehicles.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>('.ride-vehicle');
    if (!el || !card) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * (card.offsetWidth + 12), behavior: reduce ? 'auto' : 'smooth' });
  };
  const overflowing = !(edges.start && edges.end);

  return (
    <fieldset className="ride-vehicles" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="ride-vehicles__legend">Vehicle</legend>
      <div className="ride-vehicles__head">
        <p className="ride-vehicles__driver">Driver included</p>
        {overflowing && <div className="ride-vehicles__arrows">
          <button type="button" className="te-button te-button--icon" aria-label="Show earlier vehicles" disabled={edges.start} onClick={() => scrollBy(-1)}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" className="te-button te-button--icon" aria-label="Show more vehicles" disabled={edges.end} onClick={() => scrollBy(1)}><ChevronRight aria-hidden="true" /></button>
        </div>}
      </div>
      <div className="ride-vehicles__track" ref={track}>
        {vehicles.map((v) => {
          const note = fitNote(v, passengers);
          const selected = v.id === value;
          const describedBy = `${id}-${v.id}-details`;
          return (
            <label key={v.id} className={`ride-vehicle${selected ? ' is-selected' : ''}${note ? ' is-dimmed' : ''}`}>
              <input type="radio" name={`${id}-vehicle`} value={v.id} checked={selected} className="ride-vehicle__input"
                aria-label={`${v.name}, ${passengerRange(v)}`} aria-describedby={describedBy}
                onChange={() => onChange(v.id)} />
              <span className="ride-vehicle__name">{v.name}</span>
              <span className="ride-vehicle__badge">{rangeLabel(v)}</span>
              <span className="ride-vehicle__details" id={describedBy}>
                {v.description && <span className="ride-vehicle__description">{v.description}</span>}
                {v.exampleModels.length > 0 && <span className="ride-vehicle__models">{v.exampleModels.join(', ')}</span>}
                {v.luggageCapacity !== null && <span className="ride-vehicle__bags">{v.luggageCapacity} {v.luggageCapacity === 1 ? 'bag' : 'bags'}</span>}
                {note && <span className="ride-vehicle__fit">{note}</span>}
              </span>
              <VehicleImage vehicle={v} width={150} height={80} className="ride-vehicle__image" />
            </label>
          );
        })}
      </div>
      {error && <small className="ride-field-error" id={`${id}-error`}>{error}</small>}
    </fieldset>
  );
}
