import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BOOKING_API, checkCapacity, maxPassengers, offeredVehicle, passengerRange, smallestFit, sriLankaToday, type BookingCatalog } from '@shared/booking';
import { initialRide, rideSchema, withTripType, type RideInput } from '@shared/ride';
import { PAGE_NAMES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useFeatures, useSiteSettings } from '@/hooks/useSiteContent';
import { bookingRequest } from '@/lib/booking-client';
import { rideWhatsAppUrl } from '@shared/ride-whatsapp';
import { normalizeWhatsAppNumber, whatsappNumberProblem } from '@shared/whatsapp';
import { currentPickup, pickupWarning } from '@/lib/booking-geolocation';
import { LocationField } from '@/components/booking/LocationField';
import { rangeLabel, VehicleImage, VehiclePicker } from '@/components/booking/VehiclePicker';
import { PassengerStepper } from '@/components/booking/PassengerStepper';
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
  /** Any change: the old errors and the prepared WhatsApp draft go. */
  function changed(next: (f: RideInput) => RideInput) {
    setForm(next); setFields({}); setError(''); setWhatsAppDraft('');
  }
  function update<K extends keyof RideInput>(key: K, value: RideInput[K]) {
    changed(f => ({ ...f, [key]: value }));
  }
  // Only categories taking requests are offered, in the admin's order (the catalog's).
  const offered = catalog?.vehicles.filter(offeredVehicle) ?? [];
  const vehicle = offered.find(v => v.id === form.vehicleId);
  const counted = Number.isFinite(form.passengers);
  const capacityError = vehicle && counted ? checkCapacity(vehicle, form.passengers) : null;
  const suggestion = capacityError && counted ? smallestFit(offered, form.passengers) : null;
  function validate() {
    const result = rideSchema.safeParse(form);
    const errors: Record<string, string> = {};
    if (!result.success) for (const issue of result.error.issues) errors[issue.path.join('.')] = issue.message;
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
    if (!validate() || !vehicle) return;
    try {
      const href = rideWhatsAppUrl(whatsappNumber, form, vehicle);
      setWhatsAppDraft(href);
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch (e) { setError(message(e)); }
  }
  const available = offered.length > 0;
  const canSubmit = available && whatsappAvailable;
  const dateField = (key: 'departureDate' | 'departureTime' | 'returnDate' | 'returnTime', label: string, type: 'date' | 'time') => (
    <div><label htmlFor={`ride-${key}`}>{label}</label>
      <input id={`ride-${key}`} type={type} required value={form[key] ?? ''} min={type === 'date' ? key === 'returnDate' ? form.departureDate || sriLankaToday() : sriLankaToday() : undefined}
        aria-invalid={Boolean(fields[key])} aria-describedby={fields[key] ? `ride-${key}-error` : undefined} onChange={e => update(key, e.target.value)} />
      {fields[key] && <small className="ride-field-error" id={`ride-${key}-error`}>{fields[key]}</small>}</div>
  );
  const switchAction = !capacityError ? null
    : suggestion ? suggestion.id !== vehicle?.id && <button type="button" className="te-button te-button--secondary ride-switch" onClick={() => update('vehicleId', suggestion.id)}>Switch to {suggestion.name}</button>
    : <p className="ride-switch-none">None of our vehicles takes {form.passengers} passengers. Please <Link to={paths.contact}>contact our team</Link>.</p>;

  return <div className="booking-page ride-page"><div className="te-container ride-container">
    <header className="booking-intro"><p className="te-eyebrow">CITY · HOTEL · AIRPORT</p><h1 className="font-heading">Book Your Ride</h1>
      <p>Choose your pickup, destination, and travel details for a comfortable journey across Sri Lanka.</p></header>
    {error && <div className="booking-error" ref={errorBox} role="alert" tabIndex={-1}><strong>{error}</strong>
      {Object.keys(fields).length > 0 && <ul>{Object.entries(fields).map(([key, value]) => <li key={key}>{value}</li>)}</ul>}
      {!catalog && <button type="button" className="te-button te-button--secondary" onClick={() => window.location.reload()}>Retry loading</button>}</div>}
    {!catalog ? <p role="status">Loading ride options…</p> : <>
      {!whatsappAvailable && <p className="booking-notice" role="status">WhatsApp ride enquiries are currently unavailable. Please <Link to={paths.contact}>contact our team</Link>.</p>}
      {!available && <p className="booking-notice">Ride requests are currently unavailable. Please <Link to={paths.contact}>contact our team</Link>.</p>}
      <div className="booking-grid ride-grid">
        <form id="ride-form" className="booking-card ride-form" noValidate onSubmit={e => { e.preventDefault(); submit(); }}>
          <fieldset><legend className="ride-sr-only">Your ride details</legend>
            <fieldset className="ride-trip"><legend className="ride-sr-only">Trip type</legend>
              <div className="ride-segmented">{(['one_way', 'round_trip'] as const).map(type => <label key={type} className={form.tripType === type ? 'ride-segment is-selected' : 'ride-segment'}>
                <input type="radio" name="ride-trip-type" value={type} checked={form.tripType === type} onChange={() => changed(f => withTripType(f, type))} />
                {type === 'one_way' ? 'One way' : 'Round trip'}</label>)}</div></fieldset>
            <div className="ride-field"><LocationField compact label="Pickup location" value={form.pickup} destinations={catalog.destinations}
              error={fields['pickup.label'] || fields.pickup} onChange={value => { gpsGeneration.current++; setGpsBusy(false); setGpsNotice(''); update('pickup', value); }} />
              <button type="button" className="ride-location-button" onClick={() => void locate()} disabled={gpsBusy} aria-describedby="ride-gps-help">{gpsBusy ? 'Finding your location…' : 'Use My Current Location'}</button>
              <small id="ride-gps-help">Permission is requested on click, once; we never track you. Coordinates are not a complete address. Manual entry is always available.</small>
              {gpsNotice && <p role="status" className="ride-gps-notice">{gpsNotice}</p>}</div>
            <LocationField compact label="Drop-off location" value={form.dropoff} destinations={catalog.destinations} error={fields['dropoff.label'] || fields.dropoff} onChange={value => update('dropoff', value)} />
            <div className="booking-pair">{dateField('departureDate', 'Pickup date', 'date')}{dateField('departureTime', 'Pickup time', 'time')}</div>
            {form.tripType === 'round_trip' && <div className="ride-return"><div className="ride-return__inner"><div className="booking-pair">{dateField('returnDate', 'Return date', 'date')}{dateField('returnTime', 'Return time', 'time')}</div></div></div>}
            <small>All times are Sri Lanka time (UTC+05:30).</small>
            <PassengerStepper value={form.passengers} max={maxPassengers(offered)} onChange={value => update('passengers', value)}
              error={fields.passengers || capacityError || undefined}
              note={vehicle && !capacityError ? `${form.passengers} of ${vehicle.passengerCapacity} passengers` : undefined}
              action={switchAction} />
            {available && <VehiclePicker vehicles={offered} value={form.vehicleId} passengers={form.passengers} onChange={id => update('vehicleId', id)} error={fields.vehicleId} />}
          </fieldset>
          <button type="submit" className="te-button te-button--primary ride-submit" disabled={!canSubmit}>Continue on WhatsApp</button>
          <p className="ride-consent">WhatsApp opens with your ride details. Review the message and tap Send to enquire. Fare and availability will be confirmed in the chat.</p>
          {whatsAppDraft && <p role="status">Your WhatsApp draft is ready. <a href={whatsAppDraft} target="_blank" rel="noopener noreferrer">Open WhatsApp</a> and tap Send to contact our team.</p>}
        </form>
        <aside className="booking-card booking-aside ride-summary" aria-label="Ride summary"><h2>Your ride</h2>
          <div className="ride-showcase">
            {vehicle
              ? <figure key={vehicle.id} className="ride-showcase__vehicle">
                  <VehicleImage vehicle={vehicle} width={300} height={160} className="ride-showcase__image" eager />
                  <figcaption><strong>{vehicle.name}</strong>
                    {vehicle.exampleModels.length > 0 && <span>{vehicle.exampleModels.join(', ')}</span>}
                    <span>{rangeLabel(vehicle)}{vehicle.luggageCapacity !== null ? ` · ${vehicle.luggageCapacity} bags` : ''}</span></figcaption>
                </figure>
              : <div className="ride-showcase__empty"><p>Choose a vehicle</p></div>}
          </div>
          <dl className="booking-summary"><dt>Pickup</dt><dd>{form.pickup.label || 'Not entered'}</dd><dt>Destination</dt><dd>{form.dropoff.label || 'Not entered'}</dd>
            <dt>Trip type</dt><dd>{form.tripType === 'round_trip' ? 'Round trip' : 'One way'}</dd><dt>Pickup time</dt><dd>{form.departureDate || 'Choose date'}{form.departureTime ? ` · ${form.departureTime}` : ''}</dd>
            {form.tripType === 'round_trip' && <><dt>Return</dt><dd>{form.returnDate || 'Choose date'}{form.returnTime ? ` · ${form.returnTime}` : ''}<small>{form.dropoff.label || 'Drop-off'} → {form.pickup.label || 'Pickup'}</small></dd></>}
            <dt>Passengers</dt><dd>{counted ? form.passengers : 'Not entered'}</dd></dl>
          <p className="booking-price">Fare will be confirmed after reviewing your request.</p></aside>
      </div>
      {/* Phones: the summary becomes this bar, held at the bottom of the screen until the page ends. */}
      <div className="ride-bar" data-float-avoid data-keep-clear>
        {vehicle && <VehicleImage vehicle={vehicle} width={60} height={32} className="ride-bar__image" />}
        <p className="ride-bar__name">{vehicle ? <><strong>{vehicle.name}</strong> <span>{passengerRange(vehicle)}</span></> : 'Choose a vehicle'}</p>
        <button type="submit" form="ride-form" className="te-button te-button--primary ride-bar__submit" disabled={!canSubmit}>Continue</button>
      </div></>}
  </div></div>;
}
