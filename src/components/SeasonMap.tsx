import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { categoryLabel } from '@/lib/categories';
import { loadLeaflet } from '@/lib/leaflet';
import {
  ATTRACTION_RADIUS,
  ATTRACTION_ZOOM,
  attractionMarkerHtml,
  attractionPopupHtml,
  seasonMarkerHtml,
  seasonPopupHtml,
  spreadByRank,
  SRI_LANKA_BOUNDS
} from '@/lib/mapMarkers';
import { addThemedTiles } from '@/lib/mapTiles';
import type { Attraction, Destination } from '@/types';
import { monthName, suitability, suitabilityPhrase, SUITABILITIES } from '@shared/best-months';
import { distanceKm, distanceLabel } from '@shared/geo';
import { paths } from '@shared/site-paths';

/** Start loading Leaflet and tiles this far before the map scrolls into view. */
const LAZY_MARGIN = '400px 0px';
/** Markers are 32 px across (radius 16); this keeps a small gap between them. */
const MARKER_RADIUS = 16;
const MARKER_GAP = 4;
/** The space kept between a framed marker's centre and the map's edge. */
const EDGE = 36;
/** The zoom buttons share the right-hand side: markers stay this far from it. */
const RIGHT_EDGE = 72;

/**
 * The island map on /when-to-go: the same Leaflet, tiles and marker shape as /explore, with
 * each marker showing how its place suits `month`. No filters or side panel: the page's own
 * slider and lists are those. A month changes each marker's insides and popup, never the
 * marker itself, so keyboard focus and the view both stay where they are.
 *
 * Nearby attractions are small diamonds: all of them from zoom 10, and before that a
 * place's own while its popup is open. Their popups link to their destination's page.
 */
export function SeasonMap({ destinations, attractions = [], month }: { destinations: Destination[]; attractions?: Attraction[]; month: number }) {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const layerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const attractionLayerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const markersRef = useRef<Map<string, { marker: import('leaflet').Marker; popup: HTMLDivElement; dest: Destination }>>(new Map());
  const attractionMarkersRef = useRef<Map<string, { marker: import('leaflet').Marker; attraction: Attraction }>>(new Map());
  /** The destination whose popup is open: its attractions show at any zoom. */
  const openPlaceRef = useRef<string | null>(null);
  const spreadRef = useRef<() => void>(() => undefined);
  const syncAttractionsRef = useRef<() => void>(() => undefined);
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
        syncAttractionsRef.current();
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
      attractionLayerRef.current = L.layerGroup().addTo(map);
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

  // Markers closer than their own size are nudged apart at this zoom, so none hides
  // another: an attraction steps aside for a destination, two of a kind share the move.
  spreadRef.current = () => {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom();
    const entries = [
      ...[...markersRef.current.values()].map(({ marker, dest }) => ({ marker, home: [dest.latitude, dest.longitude] as [number, number], r: MARKER_RADIUS, rank: 2 })),
      ...[...attractionMarkersRef.current.values()]
        .filter(({ marker }) => attractionLayerRef.current?.hasLayer(marker))
        .map(({ marker, attraction }) => ({ marker, home: [attraction.latitude, attraction.longitude] as [number, number], r: ATTRACTION_RADIUS, rank: 1 }))
    ];
    const homes = entries.map(({ home, r, rank }) => ({ ...map.project(home, zoom), r, rank }));
    spreadByRank(homes, MARKER_GAP).forEach((point, i) => {
      const nudged = Math.hypot(point.x - homes[i].x, point.y - homes[i].y) > 0.5;
      const { marker, home } = entries[i];
      marker.setLatLng(nudged ? map.unproject([point.x, point.y], zoom) : home);
    });
  };

  /** A popup of `placeId`'s closed: the place is closed unless its own or an attraction's popup is still open. */
  const closePlace = (placeId: string) => {
    if (openPlaceRef.current !== placeId) return;
    const stillOpen =
      markersRef.current.get(placeId)?.marker.isPopupOpen() ||
      [...attractionMarkersRef.current.values()].some(({ marker, attraction }) => attraction.destinationId === placeId && marker.isPopupOpen());
    if (stillOpen) return;
    openPlaceRef.current = null;
    syncAttractionsRef.current();
    spreadRef.current();
  };

  // Which attractions show: all from zoom 10; before that, the open place's own.
  syncAttractionsRef.current = () => {
    const map = mapRef.current;
    const layer = attractionLayerRef.current;
    if (!map || !layer) return;
    const zoom = map.getZoom();
    let count = 0;
    for (const { marker, attraction } of attractionMarkersRef.current.values()) {
      const visible = zoom >= ATTRACTION_ZOOM || attraction.destinationId === openPlaceRef.current;
      if (visible) count += 1;
      if (visible && !layer.hasLayer(marker)) layer.addLayer(marker);
      if (!visible && layer.hasLayer(marker)) {
        marker.closePopup();
        layer.removeLayer(marker);
      }
    }
    if (container.current) container.current.dataset.attractions = String(count);
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
      // While it's open, the place's own attractions show at any zoom.
      marker.on('popupopen', () => {
        if (marker.getElement()?.matches(':focus-visible')) popup.querySelector('a')?.focus();
        openPlaceRef.current = dest.id;
        syncAttractionsRef.current();
        spreadRef.current();
      });
      // Opening one of its attractions closes this popup (one at a time): the place
      // stays open while that one is, so the attraction doesn't vanish under its popup.
      marker.on('popupclose', () => setTimeout(() => closePlace(dest.id), 0));
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

  // One diamond per attraction of a place on the map, drawn while `syncAttractionsRef` says.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = attractionLayerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    attractionMarkersRef.current.clear();
    const places = new Map(destinations.map((d) => [d.id, d]));
    for (const attraction of attractions) {
      const parent = places.get(attraction.destinationId);
      if (!parent) continue;
      const marker = L.marker([attraction.latitude, attraction.longitude], {
        icon: L.divIcon({
          html: attractionMarkerHtml(attraction.name),
          className: 'attraction-leaflet-marker',
          iconSize: [ATTRACTION_RADIUS * 2, ATTRACTION_RADIUS * 2],
          iconAnchor: [ATTRACTION_RADIUS, ATTRACTION_RADIUS]
        }),
        keyboard: true,
        zIndexOffset: -100
      });
      const popup = document.createElement('div');
      popup.innerHTML = attractionPopupHtml({
        name: attraction.name,
        category: categoryLabel(attraction.category),
        text: attraction.shortDescription,
        destination: parent.name,
        distance: distanceLabel(distanceKm(parent, attraction)),
        href: paths.attraction(parent.id, attraction.id)
      });
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
      marker.bindPopup(popup, { maxWidth: 280, minWidth: 200, autoPanPadding: [16, 16] });
      marker.on('popupopen', () => {
        if (marker.getElement()?.matches(':focus-visible')) popup.querySelector('a')?.focus();
      });
      marker.on('popupclose', () => setTimeout(() => closePlace(parent.id), 0));
      marker.on('add', () => {
        const el = marker.getElement();
        if (!el || el.dataset.attraction) return;
        el.dataset.attraction = attraction.id;
        el.setAttribute('aria-label', `${attraction.name}, near ${parent.name}`);
        el.addEventListener('keydown', (event) => {
          if (event.key !== ' ') return;
          event.preventDefault();
          marker.openPopup();
        });
      });
      attractionMarkersRef.current.set(attraction.id, { marker, attraction });
    }
    syncAttractionsRef.current();
    spreadRef.current();
  }, [ready, destinations, attractions, navigate]);

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
