import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BOOKING_API, checkCapacity, sriLankaToday, type BookingCatalog, type BookingRecord } from '@shared/booking';
import { callbackPhoneSchema, initialRide, rideSchema, type RideInput, type RideSubmission } from '@shared/ride';
import { PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useFeatures } from '@/hooks/useSiteContent';
import { bookingRequest, guestBookings, guestSession } from '@/lib/booking-client';
import { ApiRequestError } from '@/lib/api/http';
import { currentPickup, pickupWarning } from '@/lib/booking-geolocation';
import { LocationField } from '@/components/booking/LocationField';
import { VehicleSelector } from '@/components/booking/VehicleSelector';
import { NotFoundPage } from './NotFoundPage';
import '@/styles/booking.css';
import '@/styles/ride-booking.css';

const TourBookingPage = lazy(() => import('./TourBookingPage').then(m => ({ default: m.TourBookingPage })));
const message = (error: unknown) => error instanceof Error ? error.message : 'Your request could not be sent. Please try again.';
type RideAccount = { signedIn: boolean; email: string | null };

export function BookingPage() {
  const { bookings } = useFeatures();
  const [params] = useSearchParams();
  if (!bookings) return <NotFoundPage />;
  // Existing tour CTAs retain their original itinerary/contact flow.
  if (params.has('tour')) return <Suspense fallback={<p role="status">Loading tour request…</p>}><TourBookingPage /></Suspense>;
  return <RideBookingForm />;
}

function RideBookingForm() {
  usePageTitle(PAGE_TITLES.booking);
  const [params] = useSearchParams();
  const [catalog, setCatalog] = useState<BookingCatalog | null>(null);
  const [account, setAccount] = useState<RideAccount | null>(null);
  const [form, setForm] = useState<RideInput>(initialRide);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsNotice, setGpsNotice] = useState('');
  const [receipt, setReceipt] = useState<BookingRecord | null>(null);
  const [requests, setRequests] = useState<BookingRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState('');
  const [callbackError, setCallbackError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const requestButton = useRef<HTMLButtonElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const successBox = useRef<HTMLElement>(null);
  const attempt = useRef<{ key: string; body: RideSubmission } | null>(null);
  const sending = useRef(false);
  const gpsGeneration = useRef(0);
  const locked = busy || attempt.current !== null;

  async function refresh() {
    setRefreshing(true);
    try { setRequests((await guestBookings()).bookings.filter(b => b.details.kind === 'ride')); }
    catch (e) { setError(message(e)); }
    finally { setRefreshing(false); }
  }
  useEffect(() => {
    let live = true;
    Promise.all([bookingRequest<BookingCatalog>(`${BOOKING_API.root}/catalog`), bookingRequest<RideAccount>(`${BOOKING_API.root}/rides/account`), guestSession()])
      .then(async ([c, identity]) => {
        if (!live) return;
        setCatalog(c); setAccount(identity);
        const destination = c.destinations.find(d => d.id === params.get('destination'));
        if (destination) setForm(f => ({ ...f, dropoff: { ...f.dropoff, label: destination.name, source: 'destination', destinationId: destination.id, lat: destination.latitude, lng: destination.longitude } }));
        const mine = await guestBookings();
        if (live) setRequests(mine.bookings.filter(b => b.details.kind === 'ride'));
      }).catch(e => { if (live) setError(message(e)); });
    return () => { live = false; gpsGeneration.current++; };
  }, [params]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);
  useEffect(() => {
    if (!receipt) return;
    const frame = requestAnimationFrame(() => successBox.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [receipt]);
  useEffect(() => {
    const node = dialog.current;
    if (callbackOpen && node && !node.open) node.showModal();
    if (!callbackOpen && node?.open) { node.close(); requestButton.current?.focus(); }
  }, [callbackOpen]);
  function update<K extends keyof RideInput>(key: K, value: RideInput[K]) {
    setForm(f => ({ ...f, [key]: value })); setFields({}); setError('');
  }
  function validate() {
    const result = rideSchema.safeParse(form);
    const errors: Record<string, string> = {};
    if (!result.success) for (const issue of result.error.issues) errors[issue.path.join('.')] = issue.message;
    const vehicle = catalog?.vehicles.find(v => v.id === form.vehicleId);
    if (vehicle) { const capacity = checkCapacity(vehicle, form.passengers); if (capacity) errors.passengers = capacity; }
    else errors.vehicleId = 'Select a supported vehicle category.';
    setFields(errors);
    if (Object.keys(errors).length) { setError('Please check the highlighted ride details.'); return false; }
    setError(''); return true;
  }
  async function locate() {
    const generation = ++gpsGeneration.current;
    setGpsBusy(true); setGpsNotice('');
    try {
      if (!window.isSecureContext) throw new Error('Location needs HTTPS. Please type your pickup instead.');
      const pickup = await currentPickup(navigator.geolocation);
      if (generation !== gpsGeneration.current) return;
      update('pickup', pickup); setGpsNotice(pickupWarning(pickup));
    } catch (e) { if (generation === gpsGeneration.current) setGpsNotice(`${message(e)} You can type your pickup location.`); }
    finally { if (generation === gpsGeneration.current) setGpsBusy(false); }
  }
  async function submit(phone?: string) {
    if (sending.current) return;
    if (!attempt.current && !validate()) return;
    sending.current = true; setBusy(true); setError(''); gpsGeneration.current++; setGpsBusy(false);
    if (!attempt.current) attempt.current = { key: crypto.randomUUID(), body: { details: structuredClone(form), ...(phone ? { callbackPhone: phone } : {}) } };
    try {
      const saved = await bookingRequest<BookingRecord>(`${BOOKING_API.root}/rides`, 'POST', attempt.current.body, attempt.current.key);
      attempt.current = null; setCallbackOpen(false); setCallbackPhone(''); setReceipt(saved); setForm(initialRide());
      setRequests(previous => [saved, ...previous.filter(b => b.id !== saved.id)]);
    } catch (e) {
      setError(message(e));
      if (e instanceof ApiRequestError && e.status >= 400 && e.status < 500) {
        attempt.current = null;
        setFields(Object.fromEntries(Object.entries(e.fields ?? {}).map(([key, value]) => [key.replace(/^details\./, ''), value])));
        if (e.fields?.callbackPhone) { setCallbackError(e.fields.callbackPhone); setCallbackOpen(true); }
      }
    } finally { sending.current = false; setBusy(false); }
  }
  const available = catalog?.vehicles.some(v => v.acceptingRequests && v.passengerCapacity !== null);
  const vehicle = catalog?.vehicles.find(v => v.id === form.vehicleId);
  const hasSummary = Boolean(form.pickup.label || form.dropoff.label || form.departureDate || form.vehicleId);
  const dateField = (key: 'departureDate' | 'departureTime' | 'returnDate' | 'returnTime', label: string, type: 'date' | 'time') => (
    <div><label htmlFor={`ride-${key}`}>{label}</label>
      <input id={`ride-${key}`} type={type} required value={form[key] ?? ''} min={type === 'date' ? key === 'returnDate' ? form.departureDate || sriLankaToday() : sriLankaToday() : undefined}
        aria-invalid={Boolean(fields[key])} aria-describedby={fields[key] ? `ride-${key}-error` : undefined} onChange={e => update(key, e.target.value)} />
      {fields[key] && <small className="ride-field-error" id={`ride-${key}-error`}>{fields[key]}</small>}</div>
  );

  return <div className="booking-page ride-page"><div className="te-container ride-container">
    <header className="booking-intro"><p className="te-eyebrow">CITY · HOTEL · AIRPORT</p><h1 className="font-heading">Book Your Ride</h1>
      <p>Choose your pickup, destination, and travel details for a comfortable journey across Sri Lanka.</p></header>
    {error && <div className="booking-error" ref={errorBox} role="alert" tabIndex={-1}><strong>{error}</strong>
      {Object.keys(fields).length > 0 && <ul>{Object.entries(fields).map(([key, value]) => <li key={key}>{value}</li>)}</ul>}
      {(!catalog || !account) && <button type="button" className="te-button te-button--secondary" onClick={() => window.location.reload()}>Retry loading</button>}</div>}
    {receipt && <section ref={successBox} tabIndex={-1} className="booking-card ride-success" role="status">
      <h2>Ride request submitted. Confirmation is pending.</h2><p>Reference: <strong>{receipt.reference}</strong></p>
      <p>{receipt.details.contactEmail ? 'Our team can reply to your account email.' : 'Our team can call the number provided in the follow-up step.'} You can also check its status below.</p></section>}
    {!catalog || !account ? <p role="status">Loading ride options…</p> : <>
      {!available && <p className="booking-notice">Ride requests are currently unavailable. Please <Link to={paths.contact}>contact our team</Link>.</p>}
      <div className={`booking-grid ride-grid${hasSummary ? '' : ' ride-grid--empty'}`}>
        <form className="booking-card ride-form" aria-busy={busy} noValidate onSubmit={e => {
          e.preventDefault(); if (attempt.current) { void submit(); return; }
          if (!validate()) return; if (account.signedIn) void submit(); else { setCallbackError(''); setCallbackOpen(true); }
        }}>
          <fieldset disabled={locked}><legend className="ride-sr-only">Your ride details</legend>
            <div className="ride-field"><LocationField compact label="Pickup location" value={form.pickup} destinations={catalog.destinations}
              error={fields['pickup.label'] || fields.pickup} onChange={value => { gpsGeneration.current++; setGpsBusy(false); setGpsNotice(''); update('pickup', value); }} />
              <button type="button" className="ride-location-button" onClick={() => void locate()} disabled={gpsBusy} aria-describedby="ride-gps-help">{gpsBusy ? 'Finding your location…' : 'Use My Current Location'}</button>
              <small id="ride-gps-help">Permission is requested on click, once; we never track you. Coordinates are not a complete address. Manual entry is always available.</small>
              {gpsNotice && <p role="status" className="ride-gps-notice">{gpsNotice}</p>}</div>
            <LocationField compact label="Drop-off location" value={form.dropoff} destinations={catalog.destinations} error={fields['dropoff.label'] || fields.dropoff} onChange={value => update('dropoff', value)} />
            <fieldset className="ride-trip"><legend>Trip type</legend><div className="ride-trip-options">{(['one_way', 'round_trip'] as const).map(type => <label key={type} className={form.tripType === type ? 'ride-trip-option is-selected' : 'ride-trip-option'}>
              <input type="radio" name="ride-trip-type" value={type} checked={form.tripType === type} onChange={() => { setForm(f => ({ ...f, tripType: type, returnDate: null, returnTime: null })); setFields({}); }} />{type === 'one_way' ? 'One Way' : 'Round Trip'}</label>)}</div></fieldset>
            <div className="booking-pair">{dateField('departureDate', 'Pickup date', 'date')}{dateField('departureTime', 'Pickup time', 'time')}</div>
            <small>All times are Sri Lanka time (UTC+05:30).</small>
            {form.tripType === 'round_trip' && <div className="booking-pair ride-return">{dateField('returnDate', 'Return date', 'date')}{dateField('returnTime', 'Return time', 'time')}</div>}
            <div className="booking-pair"><div><label htmlFor="ride-passengers">Number of passengers</label>
              <input id="ride-passengers" type="number" min={1} max={vehicle?.passengerCapacity ?? 100} step={1} required value={Number.isNaN(form.passengers) ? '' : form.passengers}
                aria-invalid={Boolean(fields.passengers)} aria-describedby={fields.passengers ? 'ride-passengers-error' : undefined} onChange={e => update('passengers', e.target.value === '' ? NaN : Number(e.target.value))} />
              {fields.passengers && <small id="ride-passengers-error" className="ride-field-error">{fields.passengers}</small>}</div>
              <VehicleSelector compact vehicles={catalog.vehicles} value={form.vehicleId} passengers={form.passengers} onChange={id => update('vehicleId', id)} error={fields.vehicleId} /></div>
          </fieldset>
          <button ref={requestButton} type="submit" className="te-button te-button--primary ride-submit" disabled={busy || !available}>{busy ? 'Submitting…' : attempt.current ? 'Retry Ride Request' : 'Request Ride'}</button>
          {busy && !callbackOpen && <p role="status">Sending your ride request…</p>}
          <p className="ride-consent">By requesting a ride, you consent to our team using these details to respond. A request is pending until reviewed.</p>
          {attempt.current && !busy && <p role="status">We could not confirm delivery. Retry the same request safely, or refresh your request status below.</p>}
        </form>
        {hasSummary && <aside className="booking-card booking-aside ride-summary" aria-label="Ride summary"><h2>Your ride</h2>
          <dl className="booking-summary"><dt>Pickup</dt><dd>{form.pickup.label || 'Not entered'}</dd><dt>Destination</dt><dd>{form.dropoff.label || 'Not entered'}</dd>
            <dt>Trip type</dt><dd>{form.tripType === 'round_trip' ? 'Round Trip' : 'One Way'}</dd><dt>Pickup time</dt><dd>{form.departureDate || 'Choose date'}{form.departureTime ? ` · ${form.departureTime}` : ''}</dd>
            {form.tripType === 'round_trip' && <><dt>Return</dt><dd>{form.returnDate || 'Choose date'}{form.returnTime ? ` · ${form.returnTime}` : ''}<small>{form.dropoff.label || 'Drop-off'} → {form.pickup.label || 'Pickup'}</small></dd></>}
            <dt>Passengers</dt><dd>{Number.isNaN(form.passengers) ? 'Not entered' : form.passengers}</dd><dt>Vehicle</dt><dd>{vehicle?.name || 'Choose category'}</dd></dl>
          <p className="booking-price">Fare will be confirmed after reviewing your request.</p></aside>}
      </div></>}
    {(requests.length > 0 || attempt.current) && <section className="booking-card ride-requests"><h2>My ride requests</h2>
      <button type="button" className="te-button te-button--secondary te-button--sm" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? 'Refreshing…' : 'Refresh status'}</button>
      {requests.map(request => <article className="booking-request" key={request.id}><h3>{request.reference} · {request.status}</h3><p>{request.details.pickup.label} → {request.destinationName} · {request.details.departureDate} {request.details.departureTime}</p><p>{request.vehicle.name} · {request.details.passengers} passengers</p></article>)}
      <small>Keep your reference. Request status is available in this browser for 30 days.</small></section>}
    <dialog ref={dialog} className="ride-callback" aria-labelledby="ride-callback-title" onCancel={e => { if (busy || attempt.current) e.preventDefault(); else setCallbackOpen(false); }}>
      <form aria-busy={busy} onSubmit={e => { e.preventDefault(); if (attempt.current) { void submit(); return; } const parsed = callbackPhoneSchema.safeParse(callbackPhone); if (!parsed.success) { setCallbackError(parsed.error.issues[0].message); return; } setCallbackError(''); void submit(parsed.data); }}>
        <h2 id="ride-callback-title">How can we reach you?</h2><p>Our team needs a callback number to review your ride. This is a separate follow-up step.</p>
        <label htmlFor="ride-callback-phone">Callback phone number</label><input id="ride-callback-phone" type="tel" autoComplete="tel" required maxLength={40} value={callbackPhone} disabled={locked} aria-invalid={Boolean(callbackError)} aria-describedby="ride-callback-help" onChange={e => { setCallbackPhone(e.target.value); setCallbackError(''); }} />
        <small id="ride-callback-help" role={callbackError ? 'alert' : undefined}>{callbackError || 'Include your country code if outside Sri Lanka.'}</small>{error && <p role="alert">{error}</p>}
        {busy && <p role="status">Sending your ride request…</p>}
        <div className="booking-actions"><button type="button" className="te-button te-button--secondary" disabled={locked} onClick={() => setCallbackOpen(false)}>Back</button><button type="submit" className="te-button te-button--primary" disabled={busy}>{busy ? 'Submitting…' : attempt.current ? 'Retry Ride Request' : 'Submit Ride Request'}</button></div>
      </form></dialog>
  </div></div>;
}
