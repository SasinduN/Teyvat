import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BOOKING_API, checkCapacity, sriLankaToday, type BookingCatalog } from '@shared/booking';
import { initialRide, rideSchema, type RideInput } from '@shared/ride';
import { PAGE_NAMES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useFeatures, useSiteSettings } from '@/hooks/useSiteContent';
import { bookingRequest } from '@/lib/booking-client';
import { rideWhatsAppUrl } from '@shared/ride-whatsapp';
import { normalizeWhatsAppNumber, whatsappNumberProblem } from '@shared/whatsapp';
import { currentPickup, pickupWarning } from '@/lib/booking-geolocation';
import { LocationField } from '@/components/booking/LocationField';
import { VehicleSelector } from '@/components/booking/VehicleSelector';
import { NotFoundPage } from './NotFoundPage';
import '@/styles/booking.css';
import '@/styles/ride-booking.css';

const TourBookingPage = lazy(() => import('./TourBookingPage').then(m => ({ default: m.TourBookingPage })));
const message = (error: unknown) => error instanceof Error ? error.message : 'Your request could not be sent. Please try again.';

export function BookingPage() {
  const { bookings } = useFeatures();
  const [params] = useSearchParams();
  if (!bookings) return <NotFoundPage />;
  // Existing tour CTAs retain their original itinerary/contact flow.
  if (params.has('tour')) return <Suspense fallback={<p role="status">Loading tour request…</p>}><TourBookingPage /></Suspense>;
  return <RideBookingForm />;
}

function RideBookingForm() {
  usePageTitle(PAGE_NAMES.booking);
  const [params] = useSearchParams();
  const [catalog, setCatalog] = useState<BookingCatalog | null>(null);
  const { whatsappNumber } = useSiteSettings();
  const whatsappAvailable = !whatsappNumberProblem(normalizeWhatsAppNumber(whatsappNumber ?? ''));
  const [whatsAppDraft, setWhatsAppDraft] = useState('');
  const [form, setForm] = useState<RideInput>(initialRide);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsNotice, setGpsNotice] = useState('');
  const errorBox = useRef<HTMLDivElement>(null);
  const gpsGeneration = useRef(0);

  useEffect(() => {
    let live = true;
    bookingRequest<BookingCatalog>(`${BOOKING_API.root}/catalog`)
      .then(c => {
        if (!live) return;
        setCatalog(c);
        const destination = c.destinations.find(d => d.id === params.get('destination'));
        if (destination) setForm(f => ({ ...f, dropoff: { ...f.dropoff, label: destination.name, source: 'destination', destinationId: destination.id, lat: destination.latitude, lng: destination.longitude } }));
      }).catch(e => { if (live) setError(message(e)); });
    return () => { live = false; gpsGeneration.current++; };
  }, [params]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);
  function update<K extends keyof RideInput>(key: K, value: RideInput[K]) {
    setForm(f => ({ ...f, [key]: value })); setFields({}); setError(''); setWhatsAppDraft('');
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
  function submit() {
    if (!validate()) return;
    const selected = catalog?.vehicles.find(v => v.id === form.vehicleId);
    if (!selected) return;
    try {
      const href = rideWhatsAppUrl(whatsappNumber, form, selected);
      setWhatsAppDraft(href);
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch (e) { setError(message(e)); }
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
      {!catalog && <button type="button" className="te-button te-button--secondary" onClick={() => window.location.reload()}>Retry loading</button>}</div>}
    {!catalog ? <p role="status">Loading ride options…</p> : <>
      {!whatsappAvailable && <p className="booking-notice" role="status">WhatsApp ride enquiries are currently unavailable. Please <Link to={paths.contact}>contact our team</Link>.</p>}
      {!available && <p className="booking-notice">Ride requests are currently unavailable. Please <Link to={paths.contact}>contact our team</Link>.</p>}
      <div className={`booking-grid ride-grid${hasSummary ? '' : ' ride-grid--empty'}`}>
        <form className="booking-card ride-form" noValidate onSubmit={e => { e.preventDefault(); submit(); }}>
          <fieldset><legend className="ride-sr-only">Your ride details</legend>
            <div className="ride-field"><LocationField compact label="Pickup location" value={form.pickup} destinations={catalog.destinations}
              error={fields['pickup.label'] || fields.pickup} onChange={value => { gpsGeneration.current++; setGpsBusy(false); setGpsNotice(''); update('pickup', value); }} />
              <button type="button" className="ride-location-button" onClick={() => void locate()} disabled={gpsBusy} aria-describedby="ride-gps-help">{gpsBusy ? 'Finding your location…' : 'Use My Current Location'}</button>
              <small id="ride-gps-help">Permission is requested on click, once; we never track you. Coordinates are not a complete address. Manual entry is always available.</small>
              {gpsNotice && <p role="status" className="ride-gps-notice">{gpsNotice}</p>}</div>
            <LocationField compact label="Drop-off location" value={form.dropoff} destinations={catalog.destinations} error={fields['dropoff.label'] || fields.dropoff} onChange={value => update('dropoff', value)} />
            <fieldset className="ride-trip"><legend>Trip type</legend><div className="ride-trip-options">{(['one_way', 'round_trip'] as const).map(type => <label key={type} className={form.tripType === type ? 'ride-trip-option is-selected' : 'ride-trip-option'}>
              <input type="radio" name="ride-trip-type" value={type} checked={form.tripType === type} onChange={() => { setForm(f => ({ ...f, tripType: type, returnDate: null, returnTime: null })); setFields({}); setError(''); setWhatsAppDraft(''); }} />{type === 'one_way' ? 'One Way' : 'Round Trip'}</label>)}</div></fieldset>
            <div className="booking-pair">{dateField('departureDate', 'Pickup date', 'date')}{dateField('departureTime', 'Pickup time', 'time')}</div>
            <small>All times are Sri Lanka time (UTC+05:30).</small>
            {form.tripType === 'round_trip' && <div className="booking-pair ride-return">{dateField('returnDate', 'Return date', 'date')}{dateField('returnTime', 'Return time', 'time')}</div>}
            <div className="booking-pair"><div><label htmlFor="ride-passengers">Number of passengers</label>
              <input id="ride-passengers" type="number" min={1} max={vehicle?.passengerCapacity ?? 100} step={1} required value={Number.isNaN(form.passengers) ? '' : form.passengers}
                aria-invalid={Boolean(fields.passengers)} aria-describedby={fields.passengers ? 'ride-passengers-error' : undefined} onChange={e => update('passengers', e.target.value === '' ? NaN : Number(e.target.value))} />
              {fields.passengers && <small id="ride-passengers-error" className="ride-field-error">{fields.passengers}</small>}</div>
              <VehicleSelector compact vehicles={catalog.vehicles} value={form.vehicleId} passengers={form.passengers} onChange={id => update('vehicleId', id)} error={fields.vehicleId} /></div>
          </fieldset>
          <button type="submit" className="te-button te-button--primary ride-submit" disabled={!available || !whatsappAvailable}>Continue on WhatsApp</button>
          <p className="ride-consent">WhatsApp opens with your ride details. Review the message and tap Send to enquire. Fare and availability will be confirmed in the chat.</p>
          {whatsAppDraft && <p role="status">Your WhatsApp draft is ready. <a href={whatsAppDraft} target="_blank" rel="noopener noreferrer">Open WhatsApp</a> and tap Send to contact our team.</p>}
        </form>
        {hasSummary && <aside className="booking-card booking-aside ride-summary" aria-label="Ride summary"><h2>Your ride</h2>
          <dl className="booking-summary"><dt>Pickup</dt><dd>{form.pickup.label || 'Not entered'}</dd><dt>Destination</dt><dd>{form.dropoff.label || 'Not entered'}</dd>
            <dt>Trip type</dt><dd>{form.tripType === 'round_trip' ? 'Round Trip' : 'One Way'}</dd><dt>Pickup time</dt><dd>{form.departureDate || 'Choose date'}{form.departureTime ? ` · ${form.departureTime}` : ''}</dd>
            {form.tripType === 'round_trip' && <><dt>Return</dt><dd>{form.returnDate || 'Choose date'}{form.returnTime ? ` · ${form.returnTime}` : ''}<small>{form.dropoff.label || 'Drop-off'} → {form.pickup.label || 'Pickup'}</small></dd></>}
            <dt>Passengers</dt><dd>{Number.isNaN(form.passengers) ? 'Not entered' : form.passengers}</dd><dt>Vehicle</dt><dd>{vehicle?.name || 'Choose category'}</dd></dl>
          <p className="booking-price">Fare will be confirmed after reviewing your request.</p></aside>}
      </div></>}
  </div></div>;
}
