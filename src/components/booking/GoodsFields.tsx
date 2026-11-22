import { REFUSED_GOODS, RETURN_LOAD_LABELS, RETURN_LOADS, type ReturnLoad } from '@shared/ride';

/** What the Goods tab collects in place of the passenger count. The weight is text until sent: blank is "not sure". */
export interface GoodsDraft {
  what: string;
  weight: string;
  rider: boolean;
  returnLoad: ReturnLoad | null;
}
export const initialGoods = (): GoodsDraft => ({ what: '', weight: '', rider: false, returnLoad: null });

/** The weight as the request carries it: null when blank ("not sure"), else the number typed. */
export const goodsWeight = (weight: string): number | null => (weight.trim() === '' ? null : Number(weight));

const describe = (...ids: (string | false | null | undefined)[]) => ids.filter(Boolean).join(' ') || undefined;

/**
 * Goods mode (the Mini Lorry): what's moving, with the refused-goods note; the weight, optional; one
 * rider next to the driver; and, for a round trip, what comes back ("Rider only" only with a rider).
 * `loadError` is the category's limit, shown as the weight is typed.
 */
export function GoodsFields({ value, onChange, roundTrip, seats, errors, loadError }: {
  value: GoodsDraft;
  onChange: (next: GoodsDraft) => void;
  roundTrip: boolean;
  /** Seats next to the driver; with none, nobody rides along. */
  seats: number;
  errors: Record<string, string>;
  loadError: string | null;
}) {
  const set = <K extends keyof GoodsDraft>(key: K, v: GoodsDraft[K]) => onChange({ ...value, [key]: v });
  const weightError = errors.weightKg || loadError;
  const loads = RETURN_LOADS.filter((load) => load !== 'rider' || value.rider);
  return (
    <div className="ride-goods">
      <label htmlFor="ride-goods">What are you moving?</label>
      <textarea id="ride-goods" required maxLength={300} rows={3} value={value.what} aria-invalid={Boolean(errors.goods)}
        aria-describedby={describe(errors.goods && 'ride-goods-error', 'ride-goods-note')} onChange={(e) => set('what', e.target.value)} />
      {errors.goods && <small id="ride-goods-error" className="ride-field-error">{errors.goods}</small>}
      <small id="ride-goods-note">{REFUSED_GOODS}</small>

      <label htmlFor="ride-weight">Approximate weight in kg (optional)</label>
      <input id="ride-weight" className="ride-goods__weight" type="number" inputMode="numeric" min={1} step={1} value={value.weight}
        aria-invalid={Boolean(weightError)} aria-describedby={describe(weightError && 'ride-weight-error', 'ride-weight-hint')}
        onChange={(e) => set('weight', e.target.value)} />
      {weightError && <small id="ride-weight-error" className="ride-field-error" role="status">{weightError}</small>}
      <small id="ride-weight-hint">Not sure? Leave it blank and list the items; we'll confirm on WhatsApp.</small>

      {seats > 0 && <>
        <label className="ride-goods__rider">
          <input type="checkbox" checked={value.rider} aria-describedby="ride-rider-note"
            onChange={(e) => onChange({ ...value, rider: e.target.checked, returnLoad: !e.target.checked && value.returnLoad === 'rider' ? null : value.returnLoad })} />
          <span>Someone will ride along: one seat, next to the driver</span>
        </label>
        {errors.riders && <small className="ride-field-error">{errors.riders}</small>}
      </>}
      <small id="ride-rider-note">Nobody rides in the back. If more people are travelling, book a car or van as well.</small>

      {roundTrip && <div className="ride-return"><div className="ride-return__inner">
        <fieldset className="ride-goods__back" aria-describedby={errors.returnLoad ? 'ride-return-load-error' : undefined}>
          <legend className="ride-legend">On the way back</legend>
          <div className={`ride-segmented ride-segmented--${loads.length}`}>{loads.map((load) => (
            <label key={load} className={value.returnLoad === load ? 'ride-segment is-selected' : 'ride-segment'}>
              <input type="radio" name="ride-return-load" value={load} checked={value.returnLoad === load} onChange={() => set('returnLoad', load)} />
              {RETURN_LOAD_LABELS[load]}
            </label>
          ))}</div>
          {errors.returnLoad && <small id="ride-return-load-error" className="ride-field-error">{errors.returnLoad}</small>}
        </fieldset>
      </div></div>}
    </div>
  );
}
