import React, { useEffect, useRef } from 'react';
import { loadLeaflet } from '@/lib/leaflet';
import { mapTiles } from '@/lib/mapTiles';
import { routeStopHtml } from '@/lib/mapMarkers';
import type { TourStop } from '@/types';

/**
 * A tour's route on its own map (the tour page): the home map's numbered
 * stops and dashed line, framed to fit. Leaflet loads with it, so only pages
 * that show a map pay for it.
 */
export const RouteMap: React.FC<{ stops: TourStop[] }> = ({ stops }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let map: import('leaflet').Map | undefined;

    void loadLeaflet().then((L) => {
      if (!alive || !containerRef.current || stops.length === 0) return;
      // Touch screens: one finger scrolls the page, as on the home map.
      const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      map = L.map(containerRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: !coarsePointer,
        attributionControl: true
      });
      map.attributionControl.setPrefix(false);
      L.tileLayer(mapTiles.url, { maxZoom: 19, attribution: mapTiles.attribution }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const points = stops.map((s) => [s.lat, s.lng] as [number, number]);
      L.polyline(points, { color: 'var(--inverse-raised)', weight: 3, dashArray: '8 8', interactive: false, className: 'route-line' }).addTo(map);
      stops.forEach((stop, i) => {
        const marker = L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            html: routeStopHtml(i + 1, stop.name),
            className: 'route-stop-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          }),
          keyboard: true
        });
        marker.on('add', () => {
          const el = marker.getElement();
          el?.setAttribute('aria-label', `Stop ${i + 1}: ${stop.name}`);
          el?.setAttribute('role', 'img');
        });
        marker.addTo(map!);
      });
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 10 });
    });

    return () => {
      alive = false;
      map?.remove();
    };
  }, [stops]);

  return <div ref={containerRef} className="h-full w-full" data-route-map />;
};
