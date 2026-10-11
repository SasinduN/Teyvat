import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BOOKING_API,
  blankLocation,
  bookingSchema,
  checkCapacity,
  sriLankaToday,
  tripInstant,
  type BookingCatalog,
  type BookingInput,
  type BookingRecord
} from '@shared/booking';
import { PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useFeatures } from '@/hooks/useSiteContent';
import { ApiRequestError } from '@/lib/api/http';
import { bookingRequest, guestBookings, guestSession } from '@/lib/booking-client';
import { currentPickup, pickupWarning } from '@/lib/booking-geolocation';
import { LocationField } from '@/components/booking/LocationField';
import { VehicleSelector } from '@/components/booking/VehicleSelector';
import { NotFoundPage } from './NotFoundPage';
import '@/styles/booking.css';

const BookingMap = lazy(() => import('@/components/RouteMap').then((m) => ({ default: m.RouteMap })));

const initial = (): BookingInput => ({
  tourId: null,
  pickup: blankLocation(),
  destinationId: '',
  stops: [],
  tripType: 'one_way',
  departureDate: '',
  departureTime: '09:00',
  returnDate: null,
  returnTime: null,
  returnPickup: null,
  returnDropoff: null,
  vehicleId: '',
  passengers: 1,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  notes: '',
  termsAccepted: true
});

const message = (e: unknown) => (e instanceof Error ? e.message : 'The request could not be completed.');

/** /booking: a 404 unless bookings are on (`BOOKINGS_ENABLED`, which the server also enforces). */
export function TourBookingPage() {
  const { bookings } = useFeatures();
  return bookings ? <BookingForm /> : <NotFoundPage />;
}

/**
 * A booking request (the friend import; docs/BOOKING_API.md): pickup (typed,
 * a destination, or the device's GPS on request), optional stops, the trip,
 * vehicle and contact details, then a review step before it's sent. Requests
 * sent from this browser are listed below for 30 days, to edit or cancel.
 */
function BookingForm() {
  usePageTitle(PAGE_TITLES.booking);
  const [params] = useSearchParams();
  const [catalog, setCatalog] = useState<BookingCatalog | null>(null);
  const [form, setForm] = useState<BookingInput>(initial);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState('');
  const [gpsNotice, setGpsNotice] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [editing, setEditing] = useState<BookingRecord | null>(null);
  const [receipt, setReceipt] = useState<BookingRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // The request being sent and its retry key, kept until the server answers clearly.
  const attempt = useRef<{ key: string; details: BookingInput } | null>(null);
  const sending = useRef(false);
  // A GPS answer that arrives after the pickup changed is dropped.
  const gpsGeneration = useRef(0);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);

  function chooseTour(id: string, c: BookingCatalog) {
    const tour = c.tours.find((t) => t.id === id);
    const last = tour?.stops.at(-1);
    setForm((f) => ({ ...f, tourId: tour?.id ?? null, destinationId: last?.destinationId ?? '' }));
  }

  async function refresh() {
    setRefreshing(true);
    try {
      setBookings((await guestBookings()).bookings.filter(b => b.details.kind !== 'ride'));
    } catch (e) {
      setError(message(e));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let live = true;
    Promise.all([bookingRequest<BookingCatalog>(`${BOOKING_API.root}/catalog`), guestSession()])
      .then(async ([c]) => {
        if (!live) return;
        setCatalog(c);
        const tour = params.get('tour');
        const destination = params.get('destination');
        if (tour) chooseTour(tour, c);
        else if (c.destinations.some((d) => d.id === destination)) setForm((f) => ({ ...f, destinationId: destination! }));
        const mine = await guestBookings();
        if (live) setBookings(mine.bookings.filter(b => b.details.kind !== 'ride'));
      })
      .catch((e) => {
        if (live) setError(message(e));
      });
    return () => {
      live = false;
      gpsGeneration.current++;
    };
  }, [params]);

  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);
  useEffect(() => {
    if (error) errorBox.current?.focus();
  }, [error]);

  function update<K extends keyof BookingInput>(key: K, value: BookingInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFields({});
  }

  async function locate() {
    const generation = ++gpsGeneration.current;
    setGpsBusy(true);
    setGpsNotice('');
    try {
      if (!window.isSecureContext) throw new Error('GPS needs a secure (https) page. Enter your address manually.');
      const point = await currentPickup(navigator.geolocation);
      if (generation !== gpsGeneration.current) return;
      update('pickup', point);
      setGpsNotice(pickupWarning(point));
    } catch (e) {
      if (generation === gpsGeneration.current) setGpsNotice(message(e));
    } finally {
      if (generation === gpsGeneration.current) setGpsBusy(false);
    }
  }

  function validate(): boolean {
    const result = bookingSchema.safeParse(form);
    const errors: Record<string, string> = {};
    if (!result.success) for (const issue of result.error.issues) errors[issue.path.join('.')] = issue.message;
    const vehicle = catalog?.vehicles.find((v) => v.id === form.vehicleId);
    if (vehicle) {
      const capacity = checkCapacity(vehicle, form.passengers);
      if (capacity) errors.passengers = capacity;
    } else {
      errors.vehicleId = 'Select an available vehicle category.';
    }
    if (!accepted) errors.termsAccepted = 'Please accept the booking terms.';
    setFields(errors);
    if (Object.keys(errors).length) {
      setError('Please correct the listed fields before reviewing.');
      return false;
    }
    setError('');
    return true;
  }

  async function submit() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    if (!attempt.current) attempt.current = { key: crypto.randomUUID(), details: structuredClone(form) };
    try {
      const saved = editing
        ? await bookingRequest<BookingRecord>(`${BOOKING_API.root}/${editing.id}`, 'PATCH', { version: editing.version, details: attempt.current.details })
        : await bookingRequest<BookingRecord>(BOOKING_API.root, 'POST', attempt.current.details, attempt.current.key);
      attempt.current = null;
      setReceipt(saved);
      setEditing(null);
      setReview(false);
      setForm(initial());
      setAccepted(false);
      await refresh();
    } catch (e) {
      setError(message(e));
      // A clear refusal: the next try is a new request. Anything else: retry this one.
      if (e instanceof ApiRequestError && e.status >= 400 && e.status < 500) {
        attempt.current = null;
        setFields(e.fields ?? {});
      }
    } finally {
      setBusy(false);
      sending.current = false;
    }
  }

  async function cancel(b: BookingRecord) {
    setBusy(true);
    setError('');
    try {
      await bookingRequest(`${BOOKING_API.root}/${b.id}/cancel`, 'POST', { version: b.version, status: 'cancelled' });
      await refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  const tour = catalog?.tours.find((t) => t.id === form.tourId);
  const destination = catalog?.destinations.find((d) => d.id === form.destinationId);
  const vehicle = catalog?.vehicles.find((v) => v.id === form.vehicleId);
  const available = catalog?.vehicles.some((v) => v.acceptingRequests && v.passengerCapacity !== null);
  const locked = busy || !!attempt.current;
  const mapPoints = [
    form.pickup,
    ...(tour?.stops ?? []),
    ...form.stops,
    ...(destination ? [{ lat: destination.latitude, lng: destination.longitude, label: destination.name }] : [])
  ]
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({ lat: p.lat!, lng: p.lng!, name: p.label }));
  const routeNames = [form.pickup.label, ...(tour?.stops.map((s) => s.label) ?? []), ...form.stops.map((s) => s.label), destination?.name].filter(Boolean);
  const move = (from: number, to: number) => {
    const next = [...form.stops];
    [next[from], next[to]] = [next[to], next[from]];
    update('stops', next);
  };

  return (
    <div className="booking-page">
      <div className="te-container">
        <header className="booking-intro">
          <p className="te-eyebrow">Book a trip</p>
          <h1 className="font-heading">Your journey, thoughtfully planned</h1>
          <p>Choose your pickup and travel details. Our team reviews every request before confirming availability and price.</p>
          <p>
            <a href="#my-bookings">My requests</a> · <Link to={paths.tours}>Browse tours</Link>
          </p>
        </header>

        {error && (
          <div id="booking-errors" ref={errorBox} tabIndex={-1} className="booking-error" role="alert">
            <strong>{error}</strong>
            {Object.entries(fields).length > 0 && (
              <ul>
                {Object.entries(fields).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            )}
            {!catalog && (
              <button type="button" className="te-button te-button--secondary te-button--sm" onClick={() => window.location.reload()}>
                Retry loading
              </button>
            )}
          </div>
        )}

        {receipt && (
          <section className="booking-card" role="status">
            <h2>Request {receipt.status}</h2>
            <p>
              Reference: <strong>{receipt.reference}</strong>
            </p>
            <p>
              {receipt.status === 'pending'
                ? 'Your request is recorded. It is awaiting staff review and is not a confirmed reservation.'
                : 'Your request was updated.'}
            </p>
            <p>
              {catalog?.notificationsConfigured
                ? 'We will email you when its status changes; My requests below always shows the latest.'
                : 'Email updates are currently unavailable. Check My requests in this browser.'}
            </p>
          </section>
        )}

        {!catalog ? (
          <p role="status">Loading destinations and vehicles…</p>
        ) : (
          <>
            {!available && (
              <p className="booking-notice">
                Online requests are currently unavailable. You can plan your details below or <Link to={paths.contact}>contact our team</Link>.
              </p>
            )}
            <form
              className="booking-grid"
              aria-describedby={error ? 'booking-errors' : undefined}
              onSubmit={(e) => {
                e.preventDefault();
                if (validate()) {
                  gpsGeneration.current++;
                  setGpsBusy(false);
                  setReview(true);
                }
              }}
            >
              <div className="booking-card">
                {review ? (
                  <>
                    <h2 ref={reviewHeading} tabIndex={-1}>
                      Review your request
                    </h2>
                    <p>The price is confirmed after we review your request.</p>
                    <dl className="booking-summary">
                      <dt>Tour</dt>
                      <dd>{tour?.title ?? 'Custom transfer'}</dd>
                      <dt>Pickup</dt>
                      <dd>
                        {form.pickup.label} {form.pickup.address}
                        {form.pickup.source === 'gps' && ` (GPS ±${Math.round(form.pickup.accuracy ?? 0)} m; not a verified address)`}
                      </dd>
                      <dt>Destination</dt>
                      <dd>{destination?.name}</dd>
                      <dt>Trip</dt>
                      <dd>{form.tripType === 'round_trip' ? 'Round trip' : 'One way'}</dd>
                      <dt>Departure</dt>
                      <dd>
                        {form.departureDate} at {form.departureTime}, Sri Lanka time
                      </dd>
                      {form.tripType === 'round_trip' && (
                        <>
                          <dt>Return</dt>
                          <dd>
                            {form.returnDate} at {form.returnTime}
                            <br />
                            Pickup: {form.returnPickup?.label ?? destination?.name} {form.returnPickup?.address}
                            <br />
                            Drop-off: {form.returnDropoff?.label ?? form.pickup.label} {form.returnDropoff?.address ?? form.pickup.address}
                          </dd>
                        </>
                      )}
                      <dt>Vehicle</dt>
                      <dd>{vehicle?.name}</dd>
                      <dt>Passengers</dt>
                      <dd>{form.passengers}</dd>
                      <dt>Contact</dt>
                      <dd>
                        {form.contactName}
                        <br />
                        {form.contactEmail}
                        <br />
                        {form.contactPhone}
                      </dd>
                      <dt>Notes</dt>
                      <dd>{form.notes || 'None'}</dd>
                    </dl>
                    <h3>In this order</h3>
                    <ol>
                      {routeNames.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ol>
                    <p>Your stops come after the tour's own and before the final destination. We'll confirm the route and travel times with you.</p>
                    <div className="booking-actions">
                      <button type="button" className="te-button te-button--secondary" disabled={locked} onClick={() => setReview(false)}>
                        Edit selections
                      </button>
                      <button type="button" className="te-button te-button--primary" disabled={busy || !available} onClick={() => void submit()}>
                        {busy ? 'Saving…' : attempt.current ? 'Retry same request' : editing ? 'Save request changes' : 'Send booking request'}
                      </button>
                    </div>
                    {attempt.current && !busy && (
                      <p>We couldn't tell whether your last request arrived. Retry it (it won't be sent twice) or check My requests below.</p>
                    )}
                  </>
                ) : (
                  <fieldset disabled={locked}>
                    <legend>
                      <h2>{editing ? 'Edit your pending request' : 'Plan your trip'}</h2>
                    </legend>
                    <label htmlFor="booking-tour">Tour (optional)</label>
                    <select id="booking-tour" value={form.tourId ?? ''} onChange={(e) => chooseTour(e.target.value, catalog)}>
                      <option value="">Custom transfer</option>
                      {catalog.tours.map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    {tour && (
                      <div className="booking-notice">
                        <strong>{tour.title}</strong>
                        <ol>
                          {tour.stops.map((s, i) => (
                            <li key={i}>{s.label}</li>
                          ))}
                        </ol>
                        <small>The tour's route; its last destination is chosen for you.</small>
                      </div>
                    )}

                    <LocationField
                      label="Pickup location"
                      value={form.pickup}
                      destinations={catalog.destinations}
                      onChange={(v) => {
                        gpsGeneration.current++;
                        setGpsBusy(false);
                        setGpsNotice('');
                        update('pickup', v);
                      }}
                    />
                    <button type="button" className="te-button te-button--secondary te-button--sm" onClick={() => void locate()} disabled={gpsBusy} aria-describedby="booking-gps-help">
                      {gpsBusy ? 'Finding your location…' : 'Use my current location'}
                    </button>
                    <small id="booking-gps-help">
                      Optional. Your browser asks first, then reads your location once, only now. It stays on this page unless you send the
                      request, and we never track it.
                    </small>
                    <p role="status">{gpsNotice}</p>

                    <label htmlFor="booking-destination-search">Search destinations</label>
                    <input
                      id="booking-destination-search"
                      type="search"
                      placeholder="Search destinations"
                      value={destinationSearch}
                      onChange={(e) => setDestinationSearch(e.target.value)}
                    />
                    <label htmlFor="booking-destination">Destination</label>
                    <select
                      id="booking-destination"
                      value={form.destinationId}
                      required
                      disabled={!!tour?.stops.at(-1)?.destinationId}
                      onChange={(e) => update('destinationId', e.target.value)}
                    >
                      <option value="">Select destination</option>
                      {catalog.destinations
                        .filter((d) => d.id === form.destinationId || d.name.toLowerCase().includes(destinationSearch.trim().toLowerCase()))
                        .map((d) => (
                          <option value={d.id} key={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>

                    <h3>Optional stops</h3>
                    {form.stops.map((s, i) => (
                      <div className="booking-stop" key={i}>
                        <LocationField
                          label={`Stop ${i + 1}`}
                          value={s}
                          destinations={catalog.destinations}
                          onChange={(v) => update('stops', form.stops.map((p, j) => (j === i ? v : p)))}
                        />
                        <div className="booking-actions">
                          <button type="button" className="te-button te-button--outline te-button--sm" disabled={i === 0} aria-label={`Move stop ${i + 1} up`} onClick={() => move(i, i - 1)}>
                            Move up
                          </button>
                          <button
                            type="button"
                            className="te-button te-button--outline te-button--sm"
                            disabled={i === form.stops.length - 1}
                            aria-label={`Move stop ${i + 1} down`}
                            onClick={() => move(i, i + 1)}
                          >
                            Move down
                          </button>
                          <button type="button" className="te-button te-button--outline te-button--sm" onClick={() => update('stops', form.stops.filter((_, j) => j !== i))}>
                            Remove stop {i + 1}
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="te-button te-button--secondary te-button--sm"
                      disabled={form.stops.length >= 10}
                      onClick={() => update('stops', [...form.stops, blankLocation()])}
                    >
                      Add stop
                    </button>

                    <fieldset className="booking-trip">
                      <legend>Trip type</legend>
                      <label>
                        <input
                          type="radio"
                          name="trip-type"
                          checked={form.tripType === 'one_way'}
                          onChange={() => setForm((f) => ({ ...f, tripType: 'one_way', returnDate: null, returnTime: null, returnPickup: null, returnDropoff: null }))}
                        />
                        One way
                      </label>
                      <label>
                        <input type="radio" name="trip-type" checked={form.tripType === 'round_trip'} onChange={() => update('tripType', 'round_trip')} />
                        Round trip
                      </label>
                    </fieldset>
                    <p>All dates and times are Sri Lanka time (UTC+05:30).</p>
                    <div className="booking-pair">
                      <div>
                        <label htmlFor="departure-date">Departure date</label>
                        <input id="departure-date" type="date" min={sriLankaToday()} required value={form.departureDate} onChange={(e) => update('departureDate', e.target.value)} />
                      </div>
                      <div>
                        <label htmlFor="departure-time">Pickup time</label>
                        <input id="departure-time" type="time" required value={form.departureTime} onChange={(e) => update('departureTime', e.target.value)} />
                      </div>
                    </div>
                    {form.tripType === 'round_trip' && (
                      <>
                        <div className="booking-pair">
                          <div>
                            <label htmlFor="return-date">Return date</label>
                            <input
                              id="return-date"
                              type="date"
                              required
                              min={form.departureDate || sriLankaToday()}
                              value={form.returnDate ?? ''}
                              onChange={(e) => update('returnDate', e.target.value || null)}
                            />
                          </div>
                          <div>
                            <label htmlFor="return-time">Return pickup time</label>
                            <input id="return-time" type="time" required value={form.returnTime ?? ''} onChange={(e) => update('returnTime', e.target.value || null)} />
                          </div>
                        </div>
                        <label className="booking-check">
                          <input type="checkbox" checked={!!form.returnPickup} onChange={(e) => update('returnPickup', e.target.checked ? blankLocation() : null)} />
                          A different return pickup
                        </label>
                        {form.returnPickup && (
                          <LocationField label="Return pickup" value={form.returnPickup} destinations={catalog.destinations} onChange={(v) => update('returnPickup', v)} />
                        )}
                        <label className="booking-check">
                          <input type="checkbox" checked={!!form.returnDropoff} onChange={(e) => update('returnDropoff', e.target.checked ? blankLocation() : null)} />
                          A different return drop-off
                        </label>
                        {form.returnDropoff && (
                          <LocationField label="Return drop-off" value={form.returnDropoff} destinations={catalog.destinations} onChange={(v) => update('returnDropoff', v)} />
                        )}
                      </>
                    )}

                    <label htmlFor="booking-passengers">Passengers (including children)</label>
                    <input
                      id="booking-passengers"
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={form.passengers}
                      onChange={(e) => update('passengers', Number(e.target.value))}
                    />
                    <VehicleSelector vehicles={catalog.vehicles} value={form.vehicleId} passengers={form.passengers} onChange={(v) => update('vehicleId', v)} />

                    <h3>Contact details</h3>
                    <label htmlFor="contact-name">Your name</label>
                    <input id="contact-name" required maxLength={100} autoComplete="name" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} />
                    <label htmlFor="contact-email">Email</label>
                    <input
                      id="contact-email"
                      required
                      type="email"
                      maxLength={254}
                      autoComplete="email"
                      value={form.contactEmail}
                      onChange={(e) => update('contactEmail', e.target.value)}
                    />
                    <label htmlFor="contact-phone">Phone</label>
                    <input id="contact-phone" required type="tel" maxLength={40} autoComplete="tel" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />
                    <label htmlFor="booking-notes">Travel notes (optional)</label>
                    <textarea id="booking-notes" maxLength={1000} value={form.notes} onChange={(e) => update('notes', e.target.value)} />

                    <label className="booking-check">
                      <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                      I understand this is a request, subject to staff confirmation, availability and final price. You may use these contact
                      and pickup details to arrange this trip and email me about its status.
                    </label>
                    <p>
                      We keep only the places you send, never a location history. Requests from this browser show here for 30 days; finished ones
                      are deleted after 12 months.
                    </p>
                    <div className="booking-actions">
                      <button className="te-button te-button--primary" type="submit" disabled={gpsBusy}>
                        Review booking request
                      </button>
                      {editing && (
                        <button
                          type="button"
                          className="te-button te-button--outline"
                          onClick={() => {
                            setEditing(null);
                            setForm(initial());
                            setAccepted(false);
                          }}
                        >
                          Discard edits
                        </button>
                      )}
                    </div>
                  </fieldset>
                )}
              </div>

              <aside className="booking-card booking-aside">
                <p className="te-eyebrow">Your travel plan</p>
                <h2>{tour?.title ?? 'A journey made for you'}</h2>
                <ol aria-label="Planned stop order">
                  {routeNames.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ol>
                <p>
                  {form.passengers} passenger{form.passengers === 1 ? '' : 's'} · {vehicle?.name ?? 'Vehicle to select'}
                </p>
                <button type="button" className="te-button te-button--outline te-button--sm" disabled={mapPoints.length < 2} onClick={() => setShowMap((v) => !v)}>
                  {showMap ? 'Hide the places on a map' : 'Show the places on a map'}
                </button>
                {showMap && (
                  <>
                    <div className="booking-map">
                      <Suspense fallback={<p>Loading map…</p>}>
                        <BookingMap stops={mapPoints} />
                      </Suspense>
                    </div>
                    <small>Straight lines between the places, not a road route. Typed addresses without coordinates aren't shown.</small>
                  </>
                )}
                <p className="booking-price">The price is confirmed after we review your request.</p>
                <p>No payment is taken here. Sending records a pending request; we confirm availability separately.</p>
                <p>Your requests show in this browser for 30 days. If you lose access, contact us with your reference.</p>
              </aside>
            </form>
          </>
        )}

        <section id="my-bookings" className="booking-card">
          <h2>My requests</h2>
          <button type="button" className="te-button te-button--secondary te-button--sm" disabled={refreshing} onClick={() => void refresh()}>
            {refreshing ? 'Refreshing…' : 'Refresh status'}
          </button>
          <p>Requests sent from this browser show here.</p>
          {bookings.length === 0 && <p>No requests from this browser yet.</p>}
          {bookings.map((b) => (
            <article className="booking-request" key={b.id}>
              <h3>
                {b.reference} · <span>{b.status}</span>
              </h3>
              <p>
                {b.tourName ?? b.destinationName} · {b.details.departureDate} {b.details.departureTime} (Sri Lanka time)
              </p>
              <details>
                <summary>Travel details and history</summary>
                <p>
                  Pickup: {b.details.pickup.label} {b.details.pickup.address}
                </p>
                <p>
                  Destination: {b.destinationName} · {b.vehicle.name} · {b.details.passengers} passengers
                </p>
                {b.details.pickup.source === 'gps' && (
                  <p>
                    GPS: {b.details.pickup.lat}, {b.details.pickup.lng} (not a verified address)
                  </p>
                )}
                <ol>
                  {[...b.tourStops, ...b.details.stops].map((s, i) => (
                    <li key={i}>
                      {s.label} {s.address}
                    </li>
                  ))}
                </ol>
                {b.details.tripType === 'round_trip' && (
                  <p>
                    Return: {b.details.returnDate} {b.details.returnTime}
                    <br />
                    Pickup: {b.details.returnPickup?.label ?? b.destinationName}
                    <br />
                    Drop-off: {b.details.returnDropoff?.label ?? b.details.pickup.label}
                  </p>
                )}
                <ul>
                  {b.history.map((h, i) => (
                    <li key={i}>
                      {h.status} · {h.action} · {new Date(h.at).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}
                    </li>
                  ))}
                </ul>
              </details>
              <div className="booking-actions">
                {b.status === 'pending' && (
                  <button
                    type="button"
                    className="te-button te-button--outline te-button--sm"
                    disabled={locked}
                    onClick={() => {
                      setEditing(b);
                      setForm(structuredClone(b.details));
                      setReview(false);
                      setAccepted(false);
                      setReceipt(null);
                      window.scrollTo({ top: 0, behavior: 'auto' });
                    }}
                  >
                    Edit request
                  </button>
                )}
                {['pending', 'confirmed'].includes(b.status) && tripInstant(b.details.departureDate, b.details.departureTime) > Date.now() && (
                  <button type="button" className="te-button te-button--outline te-button--sm" disabled={busy} onClick={() => void cancel(b)}>
                    Cancel request
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
