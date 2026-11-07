import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { loadLeaflet } from '@/lib/leaflet';
import { seasonMarkerHtml, seasonPopupHtml, spreadApart, SRI_LANKA_BOUNDS } from '@/lib/mapMarkers';
import { addThemedTiles } from '@/lib/mapTiles';
import type { Destination } from '@/types';
import { monthName, suitability, suitabilityPhrase, SUITABILITIES } from '@shared/best-months';
import { paths } from '@shared/site-paths';

/** Start loading Leaflet and tiles this far before the map scrolls into view. */
const LAZY_MARGIN = '400px 0px';
/** Markers are 32 px across; this keeps a small gap between them. */
const MARKER_SPACING = 36;
/** The space kept between a framed marker's centre and the map's edge. */
const EDGE = 36;
/** The zoom buttons share the right-hand side: markers stay this far from it. */
const RIGHT_EDGE = 72;

/**
 * The island map on /when-to-go: the same Leaflet, tiles and marker shape as /explore, with
 * each marker showing how its place suits `month`. No filters or side panel: the page's own
 * slider and lists are those. A month changes each marker's insides and popup, never the
 * marker itself, so keyboard focus and the view both stay where they are.
 */
export function SeasonMap({ destinations, month }: { destinations: Destination[]; month: number }) {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const layerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const markersRef = useRef<Map<string, { marker: import('leaflet').Marker; popup: HTMLDivElement; dest: Destination }>>(new Map());
  const spreadRef = useRef<() => void>(() => undefined);
  const [ready, setReady] = useState(false);
  const [showTouchHint, setShowTouchHint] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let mounted = true;
    let resize: ResizeObserver | undefined;
    let hint: ReturnType<typeof setTimeout> | undefined;
    let onTouchMove: ((event: TouchEvent) => void) | undefined;

    async function start() {
      const L = await loadLeaflet();
      if (!mounted || !element || mapRef.current) return;
      // As on /explore: on touch screens one finger scrolls the page, two move the map.
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const map = L.map(element, {
        center: [7.8731, 80.7718],
        zoom: 7.5,
        minZoom: 6,
        maxZoom: 13,
        zoomSnap: 0.25,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: !coarse,
        attributionControl: true
      });
      map.attributionControl.setPrefix(false);
      addThemedTiles(L, map, { maxZoom: 19 });
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      if (coarse) {
        onTouchMove = (event) => {
          if (event.touches.length !== 1) return;
          setShowTouchHint(true);
          clearTimeout(hint);
          hint = setTimeout(() => setShowTouchHint(false), 1500);
        };
        element.addEventListener('touchmove', onTouchMove, { passive: true });
      }

      let moved = false;
      let framing = false;
      const frame = () => {
        // Not laid out yet: the resize that follows frames it.
        const size = map.getSize();
        if (size.x < 100 || size.y < 100) return;
        const credit = element.querySelector<HTMLElement>('.leaflet-control-attribution');
        framing = true;
        map.fitBounds(SRI_LANKA_BOUNDS, {
          paddingTopLeft: [EDGE, EDGE],
          // Clear of the credit, however many lines the text size gives it.
          paddingBottomRight: [RIGHT_EDGE, Math.max(EDGE, (credit?.offsetHeight ?? 0) + EDGE + 8)],
          animate: false
        });
        framing = false;
      };
      map.on('movestart', () => { if (!framing) moved = true; });
      map.on('zoomend', () => {
        element.classList.toggle('map-labels-on', map.getZoom() >= 9);
        element.dataset.zoom = String(map.getZoom());
        spreadRef.current();
      });
      resize = new ResizeObserver(() => {
        const before = map.getSize();
        // invalidateSize may move the map itself; that isn't the visitor.
        framing = true;
        map.invalidateSize({ animate: false });
        framing = false;
        if (!moved && !map.getSize().equals(before)) frame();
      });
      resize.observe(element);
      frame();
      element.dataset.zoom = String(map.getZoom());

      leafletRef.current = L;
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        start().catch((error: unknown) => console.error('Failed to initialize Leaflet map:', error));
      }
    }, { rootMargin: LAZY_MARGIN });
    observer.observe(element);

    return () => {
      mounted = false;
      observer.disconnect();
      resize?.disconnect();
      clearTimeout(hint);
      if (onTouchMove) element.removeEventListener('touchmove', onTouchMove);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Markers closer than their own size are nudged apart at this zoom, so none hides another.
  spreadRef.current = () => {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom();
    const entries = [...markersRef.current.values()];
    const homes = entries.map(({ dest }) => map.project([dest.latitude, dest.longitude], zoom));
    spreadApart(homes, MARKER_SPACING).forEach((point, i) => {
      const nudged = Math.hypot(point.x - homes[i].x, point.y - homes[i].y) > 0.5;
      const { marker, dest } = entries[i];
      marker.setLatLng(nudged ? map.unproject([point.x, point.y], zoom) : [dest.latitude, dest.longitude]);
    });
  };

  // One marker per place. Their looks come from the effect below.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    for (const dest of destinations) {
      const marker = L.marker([dest.latitude, dest.longitude], {
        icon: L.divIcon({ className: 'custom-leaflet-marker', iconSize: [32, 32], iconAnchor: [16, 16] }),
        // Tab reaches every marker; Enter opens its popup.
        keyboard: true
      });
      const popup = document.createElement('div');
      // A real link that stays inside the app, unless the visitor asks for a new tab.
      popup.addEventListener('click', (event) => {
        const link = (event.target as Element).closest('a');
        if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        navigate(link.getAttribute('href')!);
      });
      popup.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        marker.closePopup();
        marker.getElement()?.focus();
      });
      marker.bindPopup(popup, { maxWidth: 300, minWidth: 220, autoPanPadding: [16, 16] });
      // From the keyboard, the popup's text and link come next, and Escape comes back.
      marker.on('popupopen', () => {
        if (marker.getElement()?.matches(':focus-visible')) popup.querySelector('a')?.focus();
      });
      marker.addTo(layer);
      marker.getElement()?.addEventListener('keydown', (event) => {
        // A button takes Space as well as Enter.
        if (event.key !== ' ') return;
        event.preventDefault();
        marker.openPopup();
      });
      markersRef.current.set(dest.id, { marker, popup, dest });
    }
    spreadRef.current();
  }, [ready, destinations, navigate]);

  // The month: each marker's icon, name for screen readers and popup.
  useEffect(() => {
    if (!ready) return;
    for (const { marker, popup, dest } of markersRef.current.values()) {
      const value = suitability(dest.bestMonths, month);
      const element = marker.getElement();
      if (element) {
        element.innerHTML = seasonMarkerHtml(dest.name, value);
        element.setAttribute('aria-label', `${dest.name}: ${suitabilityPhrase(value, month)}`);
        element.dataset.suitability = value;
        element.dataset.destination = dest.id;
      }
      // The better fits sit on top where markers touch.
      marker.setZIndexOffset((SUITABILITIES.length - SUITABILITIES.indexOf(value)) * 100);
      popup.innerHTML = seasonPopupHtml({ name: dest.name, bestTime: dest.bestTime, href: paths.destination(dest.id) }, value, month);
      if (marker.isPopupOpen()) marker.getPopup()?.update();
    }
    if (container.current) container.current.dataset.month = String(month);
  }, [ready, destinations, month]);

  return (
    <div className="te-season-map" data-season-map>
      <div ref={container} className="te-season-map__canvas" role="region" aria-label={`Map of Sri Lanka: how each place suits ${monthName(month)}`} />
      {showTouchHint && (
        <span className="te-season-map__hint" aria-hidden="true">Use two fingers to move the map</span>
      )}
    </div>
  );
}
