import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, PowerOff } from 'lucide-react';

import {
  BOOKING_API,
  BOOKING_STATUSES,
  canTransition,
  VEHICLE_ICON_LABELS,
  VEHICLE_ICONS,
  type BookingRecord,
  type BookingStatus,
  type BookingVehicle
} from '@shared/booking';
import { useFeatures, useSiteContent } from '@/hooks/useSiteContent';
import { bookingRequest } from '@/lib/booking-client';
import { ImagePicker } from '@/admin/components/ImagePicker';
import { VehicleIcon, VehicleSketchFilter } from '@/components/booking/VehicleIcon';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  FieldHelp,
  FieldLabel,
  Input,
  PageHeader,
  Select,
  Spinner
} from '@/admin/components/ui';

const ACTION_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirm after checking availability',
  declined: 'Decline request',
  cancelled: 'Cancel booking',
  completed: 'Mark completed'
};

const EMPTY_VEHICLE: BookingVehicle = {
  id: '',
  name: '',
  type: 'Car',
  kind: 'passenger',
  description: null,
  exampleModels: [],
  minPassengers: 1,
  passengerCapacity: null,
  luggageCapacity: null,
  luggagePerPassenger: null,
  airConditioned: false,
  maxLoadKg: null,
  icon: 'car',
  imageUrl: null,
  sortOrder: 0,
  acceptingRequests: false
};

const VEHICLE_TYPES: readonly BookingVehicle['type'][] = ['Car', 'SUV', 'Van', 'Minibus', 'Bus', 'Lorry'];

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' });

/**
 * Admin → Bookings: the requests (filtered by status, 50 a page), each with
 * its details, history and the status changes its lifecycle allows, and the
 * vehicle categories with their real capacities. "Switched off" while
 * `BOOKINGS_ENABLED` isn't true (the API is a 404 then).
 */
export const BookingsPage: React.FC = () => {
  const { loading } = useSiteContent();
  const { bookings: enabled } = useFeatures();
  if (loading) return <Spinner />;
  if (!enabled) {
    return (
      <>
        <PageHeader title="Bookings" />
        <Card>
          <EmptyState icon={PowerOff} title="Bookings are switched off">
            The site isn't taking booking requests. They start once the server's BOOKINGS_ENABLED setting is true.
          </EmptyState>
        </Card>
      </>
    );
  }
  return <Bookings />;
};

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [vehicles, setVehicles] = useState<BookingVehicle[]>([]);
  const [vehicle, setVehicle] = useState<BookingVehicle>(EMPTY_VEHICLE);
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [list, cars] = await Promise.all([
        bookingRequest<{ bookings: BookingRecord[]; nextOffset: number | null }>(`${BOOKING_API.admin}?status=${status}&offset=${offset}`),
        bookingRequest<{ vehicles: BookingVehicle[] }>(BOOKING_API.vehicles)
      ]);
      setBookings(list.bookings);
      setNextOffset(list.nextOffset);
      setVehicles(cars.vehicles);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load bookings.');
    } finally {
      setBusy(false);
    }
  }, [status, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  async function change(b: BookingRecord, to: BookingStatus) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await bookingRequest(`${BOOKING_API.admin}/${b.id}`, 'PATCH', { version: b.version, status: to });
      setNotice(`Booking ${b.reference} is now ${to}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the status.');
      setBusy(false);
    }
  }

  async function saveVehicle() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const exampleModels = vehicle.exampleModels.map((m) => m.trim()).filter(Boolean);
      await bookingRequest(`${BOOKING_API.vehicles}/${encodeURIComponent(vehicle.id)}`, 'PUT', { ...vehicle, exampleModels });
      setVehicle(EMPTY_VEHICLE);
      setNotice('Vehicle category saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the vehicle.');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Requests, not reservations: each starts pending. Confirm one only after checking a vehicle is free and agreeing the price with the traveller."
        actions={
          <Button variant="secondary" disabled={busy} onClick={() => void load()}>
            Refresh
          </Button>
        }
      />
      {error && <ErrorNote>{error}</ErrorNote>}
      <p role="status" className="mb-3 text-sm text-[var(--text-secondary)]">
        {notice}
      </p>

      <Card className="mb-6 p-5">
        <div className="mb-4 max-w-xs space-y-1.5">
          <FieldLabel htmlFor="admin-booking-status">Status</FieldLabel>
          <Select
            id="admin-booking-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {busy && bookings.length === 0 ? (
          <Spinner />
        ) : bookings.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No booking requests">
            None match this filter.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {bookings.map((b) => (
              <li key={b.id} className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-base font-bold text-[var(--brand-primary)]">{b.reference}</h2>
                  <Badge tone={b.status === 'pending' ? 'gold' : b.status === 'confirmed' ? 'success' : 'muted'}>{b.status}</Badge>
                </div>
                <p className="text-sm text-[var(--text-primary)]">
                  {b.details.kind === 'ride' ? `Ride: ${b.details.pickup.label}` : b.tourName ?? 'Custom transfer'} → {b.destinationName} · {b.details.departureDate} {b.details.departureTime} (Sri Lanka) ·{' '}
                  {b.vehicle.name} · {b.details.passengers} passengers
                </p>
                <details className="text-sm text-[var(--text-primary)]">
                  <summary className="cursor-pointer py-1 font-semibold text-[var(--brand-primary)]">Travel details, contact and history</summary>
                  <dl className="mt-2 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                    <dt className="text-[var(--text-secondary)]">Pickup</dt>
                    <dd>
                      {b.details.pickup.label} {b.details.pickup.address}
                      {b.details.pickup.source === 'gps' &&
                        ` (GPS ${b.details.pickup.lat}, ${b.details.pickup.lng}, ±${b.details.pickup.accuracy} m; not a verified address)`}
                    </dd>
                    <dt className="text-[var(--text-secondary)]">Contact</dt>
                    <dd>
                      {[b.details.contactName, b.details.contactEmail, b.details.contactPhone].filter(Boolean).join(' · ')}
                    </dd>
                    <dt className="text-[var(--text-secondary)]">Trip</dt>
                    <dd>
                      {b.details.tripType === 'round_trip'
                        ? `Round trip; back ${b.details.returnDate} ${b.details.returnTime} from ${b.details.returnPickup?.label ?? b.destinationName} to ${b.details.returnDropoff?.label ?? b.details.pickup.label}`
                        : 'One way'}
                    </dd>
                    <dt className="text-[var(--text-secondary)]">Route</dt>
                    <dd>{[...b.tourStops, ...b.details.stops].map((s) => `${s.label} ${s.address}`.trim()).join(' → ') || 'Direct'}</dd>
                    <dt className="text-[var(--text-secondary)]">Notes</dt>
                    <dd>{b.details.notes || 'None'}</dd>
                    <dt className="text-[var(--text-secondary)]">History</dt>
                    <dd>{b.history.map((h) => `${h.status} (${h.action}, ${when(h.at)})`).join('; ')}</dd>
                    <dt className="text-[var(--text-secondary)]">Emails</dt>
                    <dd>{b.notifications.length ? b.notifications.map((n) => `${n.event.split(':')[1]}: ${n.status}`).join(', ') : 'None queued'}</dd>
                  </dl>
                </details>
                <div className="flex flex-wrap gap-2">
                  {BOOKING_STATUSES.filter((s) => canTransition(b.status, s)).map((s) => (
                    <Button key={s} variant={s === 'confirmed' ? 'primary' : 'secondary'} disabled={busy} onClick={() => void change(b, s)}>
                      {ACTION_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
            Previous page
          </Button>
          <Button variant="secondary" disabled={busy || nextOffset === null} onClick={() => setOffset(nextOffset ?? offset)}>
            Next page
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <VehicleSketchFilter />
        <h2 className="font-heading text-lg font-bold text-[var(--brand-primary)]">Vehicle categories</h2>
        <FieldHelp>
          Enter real passenger and luggage capacities, not counting the driver: every ride comes with one. Taking requests for a category doesn't mean a vehicle is free: you still confirm each one. The ride page shows categories taking requests, in sort order.
        </FieldHelp>
        <div className="my-3 flex flex-wrap gap-2">
          {vehicles.map((v) => (
            <Button key={v.id} variant="secondary" disabled={busy} onClick={() => setVehicle(v)}>
              Edit {v.name} ({v.kind === 'goods' && v.maxLoadKg !== null ? `up to ${v.maxLoadKg} kg, ` : ''}{v.acceptingRequests ? 'taking requests' : 'off'})
            </Button>
          ))}
          <Button variant="ghost" disabled={busy} onClick={() => setVehicle(EMPTY_VEHICLE)}>
            New category
          </Button>
        </div>
        <form
          className="grid max-w-xl gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveVehicle();
          }}
        >
          <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-id" required>
              ID
            </FieldLabel>
            <Input id="vehicle-id" required pattern="[a-z0-9-]+" maxLength={100} value={vehicle.id} onChange={(e) => setVehicle((v) => ({ ...v, id: e.target.value }))} />
            <FieldHelp>Lowercase letters, numbers and hyphens.</FieldHelp>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-name" required>
              Name
            </FieldLabel>
            <Input id="vehicle-name" required maxLength={80} value={vehicle.name} onChange={(e) => setVehicle((v) => ({ ...v, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-type">Type</FieldLabel>
            <Select id="vehicle-type" value={vehicle.type} onChange={(e) => setVehicle((v) => ({ ...v, type: e.target.value as BookingVehicle['type'] }))}>
              {VEHICLE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-kind">Carries</FieldLabel>
            <Select
              id="vehicle-kind"
              value={vehicle.kind}
              onChange={(e) => {
                const kind = e.target.value as BookingVehicle['kind'];
                // Goods have a load, not bags; passengers have no load.
                setVehicle((v) => (kind === 'goods' ? { ...v, kind, luggageCapacity: null, luggagePerPassenger: null } : { ...v, kind, maxLoadKg: null }));
              }}
            >
              <option value="passenger">Passengers</option>
              <option value="goods">Goods</option>
            </Select>
            <FieldHelp>Goods categories show on the ride page's Goods tab.</FieldHelp>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <FieldLabel htmlFor="vehicle-description">Description</FieldLabel>
            <Input
              id="vehicle-description"
              maxLength={200}
              value={vehicle.description ?? ''}
              onChange={(e) => setVehicle((v) => ({ ...v, description: e.target.value || null }))}
            />
            <FieldHelp>One line on the ride page's card.</FieldHelp>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <FieldLabel htmlFor="vehicle-models">Example models</FieldLabel>
            <Input
              id="vehicle-models"
              maxLength={400}
              value={vehicle.exampleModels.join(', ')}
              onChange={(e) =>
                setVehicle((v) => ({ ...v, exampleModels: e.target.value.split(',').map((m) => m.trimStart()).filter((m, i, all) => m || i === all.length - 1) }))
              }
              onBlur={() => setVehicle((v) => ({ ...v, exampleModels: v.exampleModels.map((m) => m.trim()).filter(Boolean) }))}
            />
            <FieldHelp>Separated by commas, at most six. For example: Toyota Prius, Toyota Axio.</FieldHelp>
          </div>
          {vehicle.kind === 'goods' && (
            <div className="space-y-1.5">
              <FieldLabel htmlFor="vehicle-load" required={vehicle.acceptingRequests}>
                Maximum load (kg)
              </FieldLabel>
              <Input
                id="vehicle-load"
                type="number"
                min={1}
                max={10000}
                required={vehicle.acceptingRequests}
                value={vehicle.maxLoadKg ?? ''}
                onChange={(e) => setVehicle((v) => ({ ...v, maxLoadKg: e.target.value === '' ? null : Number(e.target.value) }))}
              />
              <FieldHelp>The ride page refuses anything heavier.</FieldHelp>
            </div>
          )}
          {vehicle.kind === 'passenger' && <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-min">Fewest passengers</FieldLabel>
            <Input
              id="vehicle-min"
              type="number"
              min={1}
              max={100}
              required
              value={vehicle.minPassengers}
              onChange={(e) => setVehicle((v) => ({ ...v, minPassengers: Number(e.target.value) || 1 }))}
            />
          </div>}
          <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-capacity" required={vehicle.acceptingRequests}>
              {vehicle.kind === 'goods' ? 'Seats next to the driver' : 'Most passengers'}
            </FieldLabel>
            <Input
              id="vehicle-capacity"
              type="number"
              min={1}
              max={100}
              required={vehicle.acceptingRequests}
              value={vehicle.passengerCapacity ?? ''}
              onChange={(e) => setVehicle((v) => ({ ...v, passengerCapacity: e.target.value === '' ? null : Number(e.target.value) }))}
            />
            {vehicle.kind === 'goods' && <FieldHelp>Riders only, never in the back.</FieldHelp>}
          </div>
          {vehicle.kind === 'passenger' && <>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-luggage">Bags for the vehicle (optional)</FieldLabel>
            <Input
              id="vehicle-luggage"
              type="number"
              min={0}
              max={100}
              value={vehicle.luggageCapacity ?? ''}
              onChange={(e) => setVehicle((v) => ({ ...v, luggageCapacity: e.target.value === '' ? null : Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-luggage-each">Bags per passenger (optional)</FieldLabel>
            <Input
              id="vehicle-luggage-each"
              type="number"
              min={1}
              max={10}
              value={vehicle.luggagePerPassenger ?? ''}
              onChange={(e) => setVehicle((v) => ({ ...v, luggagePerPassenger: e.target.value === '' ? null : Number(e.target.value) }))}
            />
            <FieldHelp>Use one of the two. Per passenger, the ride page works out the group's total.</FieldHelp>
          </div>
          </>}
          <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-sort">Sort order</FieldLabel>
            <Input
              id="vehicle-sort"
              type="number"
              min={0}
              max={10000}
              value={vehicle.sortOrder}
              onChange={(e) => setVehicle((v) => ({ ...v, sortOrder: Number(e.target.value) || 0 }))}
            />
            <FieldHelp>Smaller numbers come first.</FieldHelp>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="vehicle-icon">Icon</FieldLabel>
            <div className="flex items-center gap-3">
              <Select id="vehicle-icon" value={vehicle.icon} onChange={(e) => setVehicle((v) => ({ ...v, icon: e.target.value as BookingVehicle['icon'] }))}>
                {VEHICLE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {VEHICLE_ICON_LABELS[icon]}
                  </option>
                ))}
              </Select>
              <VehicleIcon name={vehicle.icon} width={75} height={40} />
            </div>
            <FieldHelp>Shown on the ride page unless an image is chosen below.</FieldHelp>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <FieldLabel htmlFor="vehicle-image">Image (optional)</FieldLabel>
            <ImagePicker id="vehicle-image" folder="library" value={vehicle.imageUrl ?? ''} onChange={(url) => setVehicle((v) => ({ ...v, imageUrl: url || null }))} />
            <FieldHelp>If set, it replaces the icon: the vehicle on a transparent background, facing right.</FieldHelp>
          </div>
          <label className="flex items-center gap-2 self-end text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked={vehicle.airConditioned} onChange={(e) => setVehicle((v) => ({ ...v, airConditioned: e.target.checked }))} />
            Air-conditioned (an AC badge on its card)
          </label>
          <label className="flex items-center gap-2 self-end text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked={vehicle.acceptingRequests} onChange={(e) => setVehicle((v) => ({ ...v, acceptingRequests: e.target.checked }))} />
            Take booking requests for this category
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              Save category
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
};
