import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The passenger count: minus, the number (still typeable), plus. `max` is the
 * most any offered category takes, from the catalog. `note` and `error` show
 * under it; `action` is the "Switch to …" button.
 */
export function PassengerStepper({ value, max, onChange, note, error, action }: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  note?: string;
  error?: string;
  action?: ReactNode;
}) {
  const count = Number.isFinite(value) ? value : 0;
  const step = (by: 1 | -1) => onChange(Math.min(max, Math.max(1, count + by)));
  const describedBy = [error ? 'ride-passengers-error' : '', note && !error ? 'ride-passengers-note' : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="ride-stepper">
      <label htmlFor="ride-passengers">Number of passengers</label>
      <div className="ride-stepper__row">
        <button type="button" className="ride-stepper__button" aria-label="One passenger fewer" aria-controls="ride-passengers"
          disabled={count <= 1} onClick={() => step(-1)}><Minus aria-hidden="true" /></button>
        <input id="ride-passengers" type="number" inputMode="numeric" min={1} max={max} step={1} required
          value={Number.isFinite(value) ? value : ''} aria-invalid={Boolean(error)} aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))} />
        <button type="button" className="ride-stepper__button" aria-label="One passenger more" aria-controls="ride-passengers"
          disabled={count >= max} onClick={() => step(1)}><Plus aria-hidden="true" /></button>
      </div>
      {error
        ? <small id="ride-passengers-error" className="ride-field-error" role="status">{error}</small>
        : note && <small id="ride-passengers-note">{note}</small>}
      {action}
    </div>
  );
}
