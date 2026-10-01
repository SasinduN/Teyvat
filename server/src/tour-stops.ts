/**
 * Reading and writing a tour's route stops (`public.tour_stops`, since 0007).
 *
 * The public payload resolves each stop on the server: a linked stop takes
 * its destination's coordinates and, unless it has its own label, its name.
 * The admin reads and writes stops in the form's shape (`TourStopInput`).
 */
import type { Pool, PoolClient } from 'pg';

import type { TourStopInput, TourStopPayload } from '../../shared/tour-stops';
import { ApiError } from './http';

type Db = Pool | PoolClient;

/**
 * Every tour's stops, resolved, keyed by tour id. A linked destination's id
 * is passed on only while it is published, so a draft's slug never reaches
 * the public page; the stop itself still shows.
 */
export async function publicStopsByTour(db: Db): Promise<Map<string, TourStopPayload[]>> {
  const { rows } = await db.query<TourStopPayload & { tour_id: string }>(
    `select s.tour_id,
            s.position,
            coalesce(s.name, d.name) as name,
            coalesce(s.lat, d.latitude) as lat,
            coalesce(s.lng, d.longitude) as lng,
            case when d.published then d.id end as "destinationId"
       from public.tour_stops s
       left join public.destinations d on d.id = s.destination_id
      order by s.tour_id, s.position`
  );
  const byTour = new Map<string, TourStopPayload[]>();
  for (const { tour_id, ...stop } of rows) {
    const list = byTour.get(tour_id) ?? [];
    list.push(stop);
    byTour.set(tour_id, list);
  }
  return byTour;
}

/** One tour's stops, in the admin form's shape. */
export async function adminStops(db: Db, tourId: string): Promise<TourStopInput[]> {
  const { rows } = await db.query<{
    destination_id: string | null;
    name: string | null;
    lat: number | null;
    lng: number | null;
  }>(
    `select destination_id, name, lat, lng from public.tour_stops
      where tour_id = $1 order by position`,
    [tourId]
  );
  return rows.map((r) =>
    r.destination_id !== null
      ? { kind: 'destination', destination_id: r.destination_id, name: r.name }
      : { kind: 'custom', name: r.name ?? '', lat: r.lat ?? 0, lng: r.lng ?? 0 }
  );
}

const NO_SUCH_DESTINATION = 'That destination no longer exists. Choose another.';

/**
 * Replaces a tour's stops with `stops`, in order, inside the caller's
 * transaction. The linked destinations are locked (`for key share`) so one
 * can't be deleted between this check and the commit; a missing one is a
 * field error on that row.
 */
export async function replaceStops(
  client: PoolClient,
  tourId: string,
  stops: TourStopInput[]
): Promise<void> {
  const linked = [
    ...new Set(stops.flatMap((s) => (s.kind === 'destination' ? [s.destination_id] : [])))
  ];
  if (linked.length > 0) {
    const { rows } = await client.query<{ id: string }>(
      'select id from public.destinations where id = any($1::text[]) for key share',
      [linked]
    );
    const present = new Set(rows.map((r) => r.id));
    const fields: Record<string, string> = {};
    stops.forEach((s, i) => {
      if (s.kind === 'destination' && !present.has(s.destination_id)) {
        fields[`stops.${i}.destination_id`] = NO_SUCH_DESTINATION;
      }
    });
    if (Object.keys(fields).length > 0) {
      throw new ApiError('bad_request', NO_SUCH_DESTINATION, fields);
    }
  }

  await client.query('delete from public.tour_stops where tour_id = $1', [tourId]);
  for (const [position, stop] of stops.entries()) {
    if (stop.kind === 'destination') {
      await client.query(
        `insert into public.tour_stops (tour_id, position, destination_id, name)
         values ($1, $2, $3, $4)`,
        [tourId, position, stop.destination_id, stop.name]
      );
    } else {
      await client.query(
        `insert into public.tour_stops (tour_id, position, name, lat, lng)
         values ($1, $2, $3, $4, $5)`,
        [tourId, position, stop.name, stop.lat, stop.lng]
      );
    }
  }
}

/**
 * Refuses to delete a destination that a tour's route goes through, naming
 * the tours. The database would refuse too (ON DELETE RESTRICT); this says
 * which tours, which the constraint error can't.
 */
export async function refuseIfOnARoute(client: PoolClient, destinationId: string): Promise<void> {
  const { rows } = await client.query<{ title: string }>(
    `select distinct t.title, t.sort_order
       from public.tour_stops s
       join public.tours t on t.id = s.tour_id
      where s.destination_id = $1
      order by t.sort_order, t.title`,
    [destinationId]
  );
  if (rows.length > 0) {
    const titles = rows.map((r) => `“${r.title}”`).join(', ');
    throw new ApiError(
      'conflict',
      `This destination is a stop on ${rows.length === 1 ? 'the route of' : 'the routes of'} ${titles}. Remove it from ${rows.length === 1 ? 'that route' : 'those routes'} first.`
    );
  }
}
