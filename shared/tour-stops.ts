/**
 * A tour's route stops: the shapes on the wire, and the limits that the
 * admin form, the API and the database (`0007_tour_stops.sql`) all apply.
 */

/**
 * A generous box around Sri Lanka. It catches swapped or mistyped
 * coordinates; the CHECK constraints on `public.tour_stops` use the same
 * numbers.
 */
export const TOUR_STOP_BOUNDS = {
  lat: { min: 5.5, max: 10 },
  lng: { min: 79.3, max: 82.1 }
} as const;

export const MAX_TOUR_STOPS = 15;

/** Stop names and chip labels. */
export const STOP_NAME_MAX = 80;

/** `GET /api/content`: one stop, resolved on the server. */
export interface TourStopPayload {
  position: number;
  /** The chip label: the stop's own label, or its destination's name. */
  name: string;
  lat: number;
  lng: number;
  /** The linked destination's id while it is published; otherwise null. */
  destinationId: string | null;
}

/**
 * One stop as the admin form edits it and the admin API takes and returns it.
 * A linked stop's `name` is an optional chip label (null: the destination's
 * name).
 */
export type TourStopInput =
  | { kind: 'destination'; destination_id: string; name: string | null }
  | { kind: 'custom'; name: string; lat: number; lng: number };
