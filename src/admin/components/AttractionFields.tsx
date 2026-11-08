import { useEffect, useRef, useState } from 'react';
import { useController, useWatch, type Control } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { listRows } from '@/lib/api/admin';
import { loadLeaflet } from '@/lib/leaflet';
import { ATTRACTION_RADIUS, attractionMarkerHtml, markerHtml, SRI_LANKA_BOUNDS } from '@/lib/mapMarkers';
import { addThemedTiles } from '@/lib/mapTiles';
import { queryKeys } from '@/lib/queryClient';
import { Select } from '@/admin/components/ui';
import type { FormValues } from '@/admin/components/RecordForm';
import type { DestinationRow } from '@shared/database.types';
import { TOUR_STOP_BOUNDS } from '@shared/tour-stops';

/** Every destination, drafts too, for the select and the map: the list the Destinations page loads. */
function useDestinationRows() {
  return useQuery({
    queryKey: queryKeys.admin.collection('destinations'),
    queryFn: () => listRows('destinations') as Promise<DestinationRow[]>
  });
}

/** A destination, chosen by name. Drafts say so: their attractions stay off the site until they're published. */
export function ReferenceSelect({ id, value, invalid, onChange, onBlur }: { id: string; value: string; invalid: boolean; onChange: (next: string) => void; onBlur: () => void }) {
  const destinations = useDestinationRows();
  const rows = [...(destinations.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Select
      id={id}
      value={value}
      disabled={destinations.isPending}
      className={invalid ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]' : ''}
      onBlur={onBlur}
      onChange={(e) => onChange(e.target.value)}
      data-reference-select
    >
      <option value="">{destinations.isPending ? 'Loading destinations…' : 'Choose a destination'}</option>
      {rows.map((row) => (
        <option key={row.id} value={row.id}>
          {row.name}{row.published ? '' : ' (draft)'}
        </option>
      ))}
    </Select>
  );
}

const inBounds = (value: unknown, { min, max }: { min: number; max: number }): number | null => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/** Five decimals: about a metre, finer than any map click. */
const coordinate = (n: number) => n.toFixed(5);

/**
 * The attraction's place on a map: a click sets the latitude and longitude above (or
 * drag the diamond), and its destination shows as its usual marker for reference. The
 * number boxes stay the way to type a place, for the keyboard too.
 */
export function LocationPicker({ control }: { control: Control<FormValues> }) {
  const latitude = useController({ control, name: 'latitude' });
  const longitude = useController({ control, name: 'longitude' });
  const destinationId = useWatch({ control, name: 'destination_id' }) as string | undefined;
  const destinations = useDestinationRows();
  const parent = destinations.data?.find((row) => row.id === destinationId);

  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const pinRef = useRef<import('leaflet').Marker | null>(null);
  const parentRef = useRef<import('leaflet').Marker | null>(null);
  const framedRef = useRef<string | null>(null);
  // The latest setters, for Leaflet's handlers, which are bound once.
  const setRef = useRef<(lat: number, lng: number) => void>(() => undefined);
  setRef.current = (lat, lng) => {
    latitude.field.onChange(coordinate(lat));
    longitude.field.onChange(coordinate(lng));
  };

  const lat = inBounds(latitude.field.value, TOUR_STOP_BOUNDS.lat);
  const lng = inBounds(longitude.field.value, TOUR_STOP_BOUNDS.lng);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadLeaflet().then((L) => {
      if (cancelled || !element.current || mapRef.current) return;
      const map = L.map(element.current, { zoomSnap: 0.5, minZoom: 6, maxZoom: 17, scrollWheelZoom: false });
      map.attributionControl.setPrefix(false);
      addThemedTiles(L, map, { maxZoom: 19 });
      map.fitBounds(SRI_LANKA_BOUNDS, { animate: false });
      map.on('click', (event: import('leaflet').LeafletMouseEvent) => setRef.current(event.latlng.lat, event.latlng.lng));
      leafletRef.current = L;
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [setReady]);

  // The diamond, where the boxes say.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (lat === null || lng === null) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }
    if (!pinRef.current) {
      const pin = L.marker([lat, lng], {
        draggable: true,
        keyboard: false,
        zIndexOffset: 1000,
        icon: L.divIcon({
          html: attractionMarkerHtml('This attraction'),
          className: 'attraction-leaflet-marker',
          iconSize: [ATTRACTION_RADIUS * 2, ATTRACTION_RADIUS * 2],
          iconAnchor: [ATTRACTION_RADIUS, ATTRACTION_RADIUS]
        })
      });
      pin.on('dragend', () => {
        const at = pin.getLatLng();
        setRef.current(at.lat, at.lng);
      });
      pin.addTo(map);
      pinRef.current = pin;
    } else {
      pinRef.current.setLatLng([lat, lng]);
    }
  }, [ready, lat, lng]);

  // Its destination, for reference.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    parentRef.current?.remove();
    parentRef.current = null;
    if (!parent) return;
    parentRef.current = L.marker([parent.latitude, parent.longitude], {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({ html: markerHtml(parent, true), className: 'custom-leaflet-marker', iconSize: [32, 32], iconAnchor: [16, 16] })
    }).addTo(map);
  }, [ready, parent]);

  // The view: the attraction if it has a place, else its destination. Once each, so
  // the admin's own panning isn't undone by every click.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const key = lat !== null && lng !== null ? 'pin' : parent ? `parent:${parent.id}` : null;
    if (!key || framedRef.current === key || framedRef.current === 'pin') return;
    framedRef.current = key;
    if (key === 'pin') map.setView([lat!, lng!], 13, { animate: false });
    else map.setView([parent!.latitude, parent!.longitude], 12, { animate: false });
  }, [ready, lat, lng, parent]);

  return (
    <div className="space-y-2" data-location-picker>
      {/* The height on a wrapper: the map's own element becomes `.leaflet-container`, whose
          unlayered rules (index.css) win over a Tailwind height. */}
      <div className="h-80 w-full overflow-hidden rounded-xl border border-[var(--border-strong)]/60" data-location-map>
        <div ref={element} role="region" aria-label="Map: click to set the attraction's latitude and longitude" className="h-full w-full" />
      </div>
      <p className="text-xs text-[var(--text-primary)]/60">
        Click the map to set the place, or drag the diamond. {parent ? `The round marker is ${parent.name}. ` : ''}
        Check it against OpenStreetMap before publishing.
      </p>
    </div>
  );
}
