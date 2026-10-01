import React, { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, CircleAlert, Plus, Trash2 } from 'lucide-react';
import { MAX_TOUR_STOPS, TOUR_STOP_BOUNDS } from '@shared/tour-stops';
import { listRows } from '@/lib/api/admin';
import { loadLeaflet } from '@/lib/leaflet';
import { mapTiles } from '@/lib/mapTiles';
import { queryKeys } from '@/lib/queryClient';
import { Button, Input, Select } from '@/admin/components/ui';
import { IconGhost } from '@/admin/components/fields';
import { cn } from '@/utils/cn';

/**
 * One stop while it's being edited: the coordinate boxes hold strings until
 * Zod coerces them on submit (`shared/content-schema.ts`).
 */
export type StopDraft =
  | { kind: 'destination'; destination_id: string; name: string | null }
  | { kind: 'custom'; name: string; lat: number | string; lng: number | string };

/** The message for `stops.<index>.<key>`, from react-hook-form's nested errors. */
function rowError(errors: unknown, index: number, key: string): string | null {
  const row = Array.isArray(errors) ? (errors as unknown[])[index] : undefined;
  const entry = row && typeof row === 'object' ? (row as Record<string, unknown>)[key] : undefined;
  const message = entry && typeof entry === 'object' ? (entry as { message?: unknown }).message : undefined;
  return typeof message === 'string' && message ? message : null;
}

const inBounds = (value: number, { min, max }: { min: number; max: number }) =>
  Number.isFinite(value) && value >= min && value <= max;

/**
 * A tour's route stops: an ordered list, each a destination or a custom
 * place. A custom place shows a small map with its pin, so a mistyped
 * coordinate is visible before saving.
 */
export const TourStopsField: React.FC<{
  value: StopDraft[];
  onChange: (stops: StopDraft[]) => void;
  /** react-hook-form's errors for the field (per row and per input). */
  errors: unknown;
}> = ({ value, onChange, errors }) => {
  const destinations = useQuery({
    queryKey: queryKeys.admin.collection('destinations'),
    queryFn: () => listRows('destinations')
  });

  const options = useMemo(
    () => [...(destinations.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [destinations.data]
  );

  const setAt = (index: number, next: StopDraft) =>
    onChange(value.map((s, i) => (i === index ? next : s)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const switchKind = (index: number, kind: StopDraft['kind']) => {
    const stop = value[index];
    if (stop.kind === kind) return;
    if (kind === 'custom') {
      const dest = options.find((d) => stop.kind === 'destination' && d.id === stop.destination_id);
      setAt(index, { kind: 'custom', name: dest?.name ?? '', lat: '', lng: '' });
    } else {
      setAt(index, { kind: 'destination', destination_id: '', name: null });
    }
  };

  return (
    <div className="space-y-3">
      {value.map((stop, i) => {
        const dest =
          stop.kind === 'destination' ? options.find((d) => d.id === stop.destination_id) : undefined;
        const lat = stop.kind === 'custom' ? Number(stop.lat) : NaN;
        const lng = stop.kind === 'custom' ? Number(stop.lng) : NaN;
        const showPreview =
          stop.kind === 'custom' &&
          stop.lat !== '' &&
          stop.lng !== '' &&
          inBounds(lat, TOUR_STOP_BOUNDS.lat) &&
          inBounds(lng, TOUR_STOP_BOUNDS.lng);

        return (
          <div
            key={i}
            className="rounded-xl border border-[#D4C3B5]/70 bg-[#FBF9F6] p-4"
            data-stop-row={i}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1C4737] text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="flex rounded-lg border border-[#D4C3B5] bg-white p-0.5" role="group" aria-label={`Stop ${i + 1} type`}>
                  {(['destination', 'custom'] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={stop.kind === kind}
                      onClick={() => switchKind(i, kind)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors',
                        stop.kind === kind ? 'bg-[#1C4737] text-white' : 'text-[#1A1A1A]/60 hover:text-[#1C4737]'
                      )}
                    >
                      {kind === 'destination' ? 'Destination' : 'Custom place'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconGhost label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconGhost>
                <IconGhost label="Move down" onClick={() => move(i, 1)} disabled={i === value.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconGhost>
                <IconGhost
                  label="Remove stop"
                  tone="danger"
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconGhost>
              </div>
            </div>

            {stop.kind === 'destination' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Labelled label="Destination" error={rowError(errors, i, 'destination_id')}>
                  <Select
                    aria-label={`Stop ${i + 1} destination`}
                    value={stop.destination_id}
                    onChange={(e) => setAt(i, { ...stop, destination_id: e.target.value })}
                  >
                    <option value="">{destinations.isPending ? 'Loading…' : '— Choose —'}</option>
                    {options.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.region}
                        {d.published ? '' : ' (unpublished)'}
                      </option>
                    ))}
                  </Select>
                </Labelled>
                <Labelled label="Chip label (optional)" error={rowError(errors, i, 'name')}>
                  <Input
                    aria-label={`Stop ${i + 1} chip label`}
                    value={stop.name ?? ''}
                    placeholder={dest ? dest.name : 'The destination’s name'}
                    onChange={(e) => setAt(i, { ...stop, name: e.target.value })}
                  />
                </Labelled>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem]">
                  <Labelled label="Name" error={rowError(errors, i, 'name')}>
                    <Input
                      aria-label={`Stop ${i + 1} name`}
                      value={stop.name}
                      onChange={(e) => setAt(i, { ...stop, name: e.target.value })}
                    />
                  </Labelled>
                  <Labelled label="Latitude" error={rowError(errors, i, 'lat')}>
                    <Input
                      aria-label={`Stop ${i + 1} latitude`}
                      type="number"
                      inputMode="decimal"
                      step="0.0001"
                      placeholder="e.g. 8.3063"
                      value={String(stop.lat)}
                      onChange={(e) => setAt(i, { ...stop, lat: e.target.value })}
                    />
                  </Labelled>
                  <Labelled label="Longitude" error={rowError(errors, i, 'lng')}>
                    <Input
                      aria-label={`Stop ${i + 1} longitude`}
                      type="number"
                      inputMode="decimal"
                      step="0.0001"
                      placeholder="e.g. 80.1484"
                      value={String(stop.lng)}
                      onChange={(e) => setAt(i, { ...stop, lng: e.target.value })}
                    />
                  </Labelled>
                </div>
                {showPreview ? (
                  <StopPreview lat={lat} lng={lng} />
                ) : (
                  <p className="text-[11px] text-[#1A1A1A]/50">
                    A map preview appears once both coordinates are inside Sri Lanka.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="secondary"
        icon={Plus}
        disabled={value.length >= MAX_TOUR_STOPS}
        onClick={() => onChange([...value, { kind: 'destination', destination_id: '', name: null }])}
      >
        Add stop
      </Button>
    </div>
  );
};

const Labelled: React.FC<{ label: string; error: string | null; children: React.ReactNode }> = ({
  label,
  error,
  children
}) => (
  <div className="space-y-1">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">{label}</span>
    {children}
    {error && (
      <p className="flex items-start gap-1.5 text-[11px] font-medium text-[#B3261E]">
        <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {error}
      </p>
    )}
  </div>
);

/**
 * A small, still map with the stop's pin. Leaflet loads only when the first
 * one appears.
 */
const StopPreview: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const pinRef = useRef<import('leaflet').CircleMarker | null>(null);
  const latest = useRef({ lat, lng });
  latest.current = { lat, lng };

  useEffect(() => {
    let cancelled = false;
    void loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const at: [number, number] = [latest.current.lat, latest.current.lng];
      const map = L.map(containerRef.current, {
        center: at,
        zoom: 8,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false
      });
      map.attributionControl.setPrefix(false);
      L.tileLayer(mapTiles.url, { maxZoom: 19, attribution: mapTiles.attribution }).addTo(map);
      pinRef.current = L.circleMarker(at, {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#1C4737',
        fillOpacity: 1
      }).addTo(map);
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      pinRef.current = null;
    };
  }, []);

  useEffect(() => {
    mapRef.current?.setView([lat, lng]);
    pinRef.current?.setLatLng([lat, lng]);
  }, [lat, lng]);

  // The height sits on a wrapper: index.css gives `.leaflet-container` a
  // height of 100%, which would override one set on the map's own element.
  return (
    <div
      role="img"
      aria-label={`Map preview: ${lat}, ${lng}`}
      className="h-40 w-full overflow-hidden rounded-lg border border-[#D4C3B5]/70"
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
};
