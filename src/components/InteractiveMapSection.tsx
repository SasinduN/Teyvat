import { TravelImage } from '@/components/TravelImage';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDestinations } from '@/hooks/useSiteContent';
import { Link } from 'react-router-dom';
import { paths } from '@shared/site-paths';
import { matchesTravelTiming } from '@/lib/travelTiming';
import { loadLeaflet } from '@/lib/leaflet';
import { mapTiles } from '@/lib/mapTiles';
import { MAP_CATEGORIES, MAP_CATEGORY_STYLES, markerHtml, routeStopHtml, type MapCategory } from '@/lib/mapMarkers';
import { airportTravelTime, googleMapsUrl } from '@/lib/googleMaps';
import { Destination, CategoryType, TourPackage } from '../types';
import {
  MapPin,
  Sparkles,
  ChevronRight,
  Compass,
  ArrowUpRight,
  CheckCircle2,
  Waves,
  Mountain,
  Landmark,
  PawPrint,
  Utensils,
  Gem,
  ExternalLink,
  Plane,
  Route,
  X,
  type LucideIcon
} from 'lucide-react';

interface InteractiveMapSectionProps {
  activeFilterFromParent?: CategoryType | 'All';
  selectedWhereFromParent?: string;
  selectedTimingFromParent?: string;
  searchRequestId?: number;
  /** A tour whose route the map shows ("View route on map"), or null. */
  routeTour?: TourPackage | null;
  /** Leaves route mode (the chip's ✕, Escape, or choosing a filter). */
  onClearRoute?: () => void;
}

/** The legend's icons: the same Lucide icons the markers draw (src/lib/mapMarkers.ts). */
const LEGEND_ICONS: Record<MapCategory, LucideIcon> = {
  Beaches: Waves,
  Mountains: Mountain,
  Culture: Landmark,
  Wildlife: PawPrint,
  Adventure: Compass,
  Food: Utensils,
  'Hidden Gems': Gem
};

/** The legend list: a marker's colour and icon come from its first category. */
const MapLegendList: React.FC<{ id?: string; className: string }> = ({ id, className }) => (
  <ul id={id} className={className} aria-label="Map legend">
    {MAP_CATEGORIES.map((cat) => {
      const Icon = LEGEND_ICONS[cat];
      const style = MAP_CATEGORY_STYLES[cat];
      return (
        <li key={cat} className="flex items-center gap-1.5 text-[11px] text-[var(--text-primary)]/75" data-legend={cat}>
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: style.color }}
          >
            <Icon className="w-2.5 h-2.5" style={{ color: style.iconColor }} strokeWidth={2.6} aria-hidden="true" />
          </span>
          {cat}
        </li>
      );
    })}
  </ul>
);

/** Names show for every marker from this zoom in (and always on hover/focus/active). */
const LABEL_ZOOM = 9;
/** Filter changes fit the map to the markers, but never closer than this. */
const FIT_MAX_ZOOM = 9;
/** A route is framed no closer than this. */
const ROUTE_MAX_ZOOM = 10;
/** Start loading Leaflet and tiles this far before the map scrolls into view. */
const LAZY_MARGIN = '400px 0px';

/** The Google Maps link, and the airport travel time when it's set. */
const PlaceLinks: React.FC<{
  dest: Destination;
  className: string;
  linkClassName: string;
  timeClassName: string;
}> = ({ dest, className, linkClassName, timeClassName }) => (
  <div className={className}>
    <a
      href={googleMapsUrl(dest.latitude, dest.longitude)}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
      data-google-maps
    >
      <span>Open in Google Maps</span>
      <ExternalLink className="w-3 h-3" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
    {dest.travelTimeFromAirport && (
      <span className={timeClassName} data-travel-time>
        <Plane className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{airportTravelTime(dest.travelTimeFromAirport)}</span>
      </span>
    )}
  </div>
);

export const InteractiveMapSection: React.FC<InteractiveMapSectionProps> = ({
  activeFilterFromParent,
  selectedWhereFromParent,
  selectedTimingFromParent = 'Anytime',
  searchRequestId = 0,
  routeTour = null,
  onClearRoute
}) => {
  const DESTINATIONS = useDestinations();
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [activeDest, setActiveDest] = useState<Destination | null>(
    DESTINATIONS.find((d) => d.id === 'ella') || DESTINATIONS[0]
  );
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const markersByIdRef = useRef<Map<string, any>>(new Map());
  // Markers wait for this: before it there is no map to put them on. (Without
  // it, the first markers were never drawn until something re-rendered.)
  const [mapReady, setMapReady] = useState(false);
  const [showTouchHint, setShowTouchHint] = useState(false);
  // Phones: the legend behind the Key button.
  const [showKey, setShowKey] = useState(false);
  const keyRef = useRef<HTMLDivElement>(null);
  const quickJumpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = quickJumpRef.current;
    const selected = row?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (!row || !selected) return;
    // Scroll only the location row; selecting a marker must not move the page.
    const left = selected.offsetLeft;
    const right = left + selected.offsetWidth;
    if (left < row.scrollLeft) row.scrollLeft = left;
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth;
  }, [activeDest?.id]);

  useEffect(() => {
    if (!showKey) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowKey(false);
    const onPointer = (e: PointerEvent) => {
      if (keyRef.current && !keyRef.current.contains(e.target as Node)) setShowKey(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [showKey]);

  // Route mode. The view from before the route, to go back to on ✕ or Escape.
  const routeLayerRef = useRef<any>(null);
  const preRouteViewRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  /** How the route was left: ✕ or Escape restore the view; a filter frames itself. */
  const restoreOnClearRef = useRef(false);
  const wasRouteRef = useRef(false);

  const clearRoute = (restoreView: boolean) => {
    restoreOnClearRef.current = restoreView;
    onClearRoute?.();
  };

  const chooseCategory = (cat: CategoryType | 'All') => {
    if (routeTour) clearRoute(false);
    setSelectedCategory(cat);
  };

  useEffect(() => {
    if (!routeTour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearRoute(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [routeTour]);

  const categories: (CategoryType | 'All')[] = [
    'All',
    'Beaches',
    'Mountains',
    'Culture',
    'Wildlife',
    'Adventure',
    'Food',
    'Hidden Gems'
  ];

  // Sync parent props if changed
  useEffect(() => {
    if (activeFilterFromParent && activeFilterFromParent !== selectedCategory) {
      setSelectedCategory(activeFilterFromParent);
    }
  }, [activeFilterFromParent, searchRequestId]);

  useEffect(() => {
    if (selectedWhereFromParent && selectedWhereFromParent !== 'All') {
      const found = DESTINATIONS.find(
        (d) => d.name.toLowerCase() === selectedWhereFromParent.toLowerCase()
      );
      if (found) {
        setActiveDest(found);
      }
    }
  }, [selectedWhereFromParent, searchRequestId]);

  // Filtered Destinations List
  const filteredDestinations = useMemo(
    () =>
      DESTINATIONS.filter((d) => {
        if (!matchesTravelTiming(d.bestTime, selectedTimingFromParent)) return false;
        if (selectedCategory === 'All') return true;
        return d.category.includes(selectedCategory);
      }),
    [DESTINATIONS, selectedCategory, selectedTimingFromParent]
  );

  useEffect(() => {
    setActiveDest(current => filteredDestinations.find(d => d.name === selectedWhereFromParent)
      ?? filteredDestinations.find(d => d.id === current?.id) ?? filteredDestinations[0] ?? null);
  }, [filteredDestinations, selectedWhereFromParent, searchRequestId]);

  // Initialize Leaflet only when the map is about to be seen: until then the
  // page downloads neither Leaflet nor a single tile.
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let isMounted = true;
    let hintTimer: ReturnType<typeof setTimeout> | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let onTouchMove: ((e: TouchEvent) => void) | undefined;

    async function initMap() {
      if (!container || mapInstanceRef.current) return;

      try {
        const L = await loadLeaflet();

        if (!isMounted || !mapContainerRef.current) return;

        // Touch screens: one finger scrolls the page, two fingers move and
        // zoom the map (Leaflet's pinch handler pans as it zooms). Mouse and
        // trackpad drag as before.
        const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;

        // Create Leaflet map centered on Sri Lanka
        const map = L.map(container, {
          center: [7.8731, 80.7718],
          zoom: 7.8,
          minZoom: 7,
          maxZoom: 13,
          zoomControl: false,
          scrollWheelZoom: false,
          dragging: !coarsePointer,
          // Required by the OpenStreetMap licence and CARTO's terms.
          attributionControl: true
        });
        // Just the credit itself, without Leaflet's own "Leaflet" prefix.
        map.attributionControl.setPrefix(false);

        // Custom Light/Sand styled Map Tiles (CARTO Voyager, keyed: src/lib/mapTiles.ts)
        L.tileLayer(mapTiles.url, {
          maxZoom: 19,
          attribution: mapTiles.attribution
        }).addTo(map);

        // Add Zoom Control to bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Names for every marker once zoomed in.
        const syncZoom = () => {
          container.classList.toggle('map-labels-on', map.getZoom() >= LABEL_ZOOM);
          container.dataset.zoom = String(map.getZoom());
        };
        map.on('zoomend', syncZoom);
        syncZoom();

        if (coarsePointer) {
          // A one-finger swipe over the map scrolls the page; say how to move it.
          onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            setShowTouchHint(true);
            clearTimeout(hintTimer);
            hintTimer = setTimeout(() => setShowTouchHint(false), 1500);
          };
          container.addEventListener('touchmove', onTouchMove, { passive: true });
        }

        // The map's height follows the side panel's on large screens.
        if ('ResizeObserver' in window) {
          resizeObserver = new ResizeObserver(() => map.invalidateSize());
          resizeObserver.observe(container);
        }

        leafletRef.current = L;
        mapInstanceRef.current = map;
        markersGroupRef.current = L.layerGroup().addTo(map);
        setMapReady(true);
      } catch (err) {
        console.error('Failed to initialize Leaflet map:', err);
      }
    }

    let observer: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer?.disconnect();
            void initMap();
          }
        },
        { rootMargin: LAZY_MARGIN }
      );
      observer.observe(container);
    } else {
      void initMap();
    }

    return () => {
      isMounted = false;
      observer?.disconnect();
      resizeObserver?.disconnect();
      clearTimeout(hintTimer);
      if (onTouchMove) container.removeEventListener('touchmove', onTouchMove);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Draw the markers for the current filter (and once the map is ready).
  useEffect(() => {
    const L = leafletRef.current;
    if (!mapReady || !L || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    markersByIdRef.current.clear();

    filteredDestinations.forEach((dest) => {
      const isActive = activeDest?.id === dest.id;

      const marker = L.marker([dest.latitude, dest.longitude], {
        icon: L.divIcon({
          html: markerHtml(dest, isActive),
          className: 'custom-leaflet-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        }),
        // Tab reaches every marker; Enter opens it.
        keyboard: true,
        zIndexOffset: isActive ? 1000 : 0
      });

      marker.on('add', () => {
        marker.getElement()?.setAttribute('aria-label', dest.name);
      });

      marker.on('click', () => {
        setActiveDest(dest);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([dest.latitude, dest.longitude], 9.5, {
            duration: 1.2
          });
        }
      });

      markersByIdRef.current.set(dest.id, marker);
      markersGroupRef.current.addLayer(marker);
    });
  }, [mapReady, filteredDestinations]);

  // The active marker: a class toggle, so focus and hover state survive.
  useEffect(() => {
    if (!mapReady) return;
    markersByIdRef.current.forEach((marker, id) => {
      const active = id === activeDest?.id;
      marker.getElement()?.querySelector('.map-marker')?.classList.toggle('is-active', active);
      marker.setZIndexOffset(active ? 1000 : 0);
    });
  }, [mapReady, activeDest, filteredDestinations]);

  /** How far down the map the visible top overlays reach, plus a margin. */
  const topOverlayClearance = (): number => {
    const container = mapContainerRef.current;
    if (!container?.parentElement) return 80;
    const top = container.getBoundingClientRect().top;
    let clearance = 40;
    container.parentElement.querySelectorAll('[data-map-overlay]').forEach((el) => {
      const box = el.getBoundingClientRect();
      if (box.height > 0) clearance = Math.max(clearance, box.bottom - top + 16);
    });
    return Math.round(clearance);
  };

  /** Frames `points`, smoothly unless the visitor prefers reduced motion. */
  const fitPoints = (points: [number, number][], maxZoom: number) => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map || points.length === 0) return;

    const animate = !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    if (points.length === 1) {
      map.flyTo(points[0], maxZoom, { animate, duration: 0.8 });
      return;
    }
    // Room for what sits on the map: the overlays along the top (the Map
    // Guide, or the Key on phones, and the route chip), measured, and the
    // Quick Jump bar (bottom) and zoom buttons (bottom right).
    const options = {
      paddingTopLeft: [40, topOverlayClearance()] as [number, number],
      paddingBottomRight: [64, 90] as [number, number],
      maxZoom
    };
    if (animate) map.flyToBounds(L.latLngBounds(points), { ...options, duration: 0.8 });
    else map.fitBounds(L.latLngBounds(points), { ...options, animate: false });
  };

  // Leaving route mode: ✕ or Escape go back to the view from before the
  // route; choosing a filter frames that filter (the next effect). Declared
  // first, so the re-fit is requested before that effect runs.
  const fittedCategoryRef = useRef<CategoryType | 'All' | null>('All');
  const fittedDestinationsRef = useRef<Destination[] | null>(null);
  useEffect(() => {
    const was = wasRouteRef.current;
    wasRouteRef.current = Boolean(routeTour);
    if (!was || routeTour) return;

    const map = mapInstanceRef.current;
    const saved = preRouteViewRef.current;
    if (restoreOnClearRef.current) {
      if (map && saved) {
        const animate = !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
        if (animate) map.flyTo(saved.center, saved.zoom, { duration: 0.8 });
        else map.setView(saved.center, saved.zoom, { animate: false });
      }
    } else {
      fittedCategoryRef.current = null;
    }
    restoreOnClearRef.current = false;
    preRouteViewRef.current = null;
  }, [routeTour]);

  // A new category filter frames its markers, smoothly.
  useEffect(() => {
    if (!mapReady || routeTour) return;
    if (fittedCategoryRef.current === selectedCategory && fittedDestinationsRef.current === filteredDestinations) return;
    fittedCategoryRef.current = selectedCategory;
    fittedDestinationsRef.current = filteredDestinations;
    fitPoints(
      filteredDestinations.map((d) => [d.latitude, d.longitude] as [number, number]),
      FIT_MAX_ZOOM
    );
  }, [mapReady, selectedCategory, filteredDestinations, routeTour]);

  // Route mode: the tour's numbered stops, joined in order by a dashed line,
  // framed to fit. Waits for the map, so a route picked before it loaded is
  // drawn as soon as the map is up.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!mapReady || !L || !map || !container) return;

    routeLayerRef.current?.remove();
    routeLayerRef.current = null;

    const stops = routeTour?.stops ?? [];
    container.classList.toggle('map-route-on', stops.length > 0);
    if (stops.length === 0) return;

    if (!preRouteViewRef.current) {
      const center = map.getCenter();
      preRouteViewRef.current = { center: [center.lat, center.lng], zoom: map.getZoom() };
    }

    const points = stops.map((s) => [s.lat, s.lng] as [number, number]);
    const layer = L.layerGroup();
    L.polyline(points, {
      color: 'var(--inverse-raised)',
      weight: 3,
      dashArray: '8 8',
      interactive: false,
      className: 'route-line'
    }).addTo(layer);

    stops.forEach((stop, i) => {
      const marker = L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          html: routeStopHtml(i + 1, stop.name),
          className: 'route-stop-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        }),
        // Tab reaches each stop, which reads out as "Stop 2: Sigiriya".
        keyboard: true,
        zIndexOffset: 2000
      });
      marker.on('add', () => {
        const el = marker.getElement();
        el?.setAttribute('aria-label', `Stop ${i + 1}: ${stop.name}`);
        el?.setAttribute('role', 'img');
      });
      marker.addTo(layer);
    });

    layer.addTo(map);
    routeLayerRef.current = layer;
    fitPoints(points, ROUTE_MAX_ZOOM);
  }, [mapReady, routeTour]);

  // While a route shows, the faded category markers leave the tab order.
  useEffect(() => {
    if (!mapReady) return;
    markersByIdRef.current.forEach((marker) => {
      const el = marker.getElement();
      if (!el) return;
      el.setAttribute('tabindex', routeTour ? '-1' : '0');
      if (routeTour) el.setAttribute('aria-hidden', 'true');
      else el.removeAttribute('aria-hidden');
    });
  }, [mapReady, routeTour, filteredDestinations]);

  // Center map on active destination if selection changes
  const handleDestinationClick = (dest: Destination) => {
    setActiveDest(dest);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([dest.latitude, dest.longitude], 9.5, {
        duration: 1.2
      });
    }
  };

  return (
    <section id="explore-map" className="py-20 bg-[var(--background-secondary)] relative overflow-hidden">
      <div className="te-container">
        
        {/* Section Header */}
        <div className="te-section-header te-section-header--stack">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--brand-primary)] bg-[var(--brand-secondary)]/10 px-4 py-1 rounded-full inline-block mb-3">
            Interactive Island Map
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[var(--brand-primary)] tracking-tight mb-3">
            Explore Sri Lanka
          </h2>
          <p className="text-lg text-[var(--text-primary)]/70 font-serif italic">
            “Pick a place. Start your story.”
          </p>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-8">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => chooseCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 flex items-center space-x-1.5 shadow-xs ${
                  isSelected
                    ? 'bg-[var(--inverse-surface)] text-[var(--accent-text)] shadow-md scale-105 border border-[var(--emerald-edge)]'
                    : 'bg-[var(--surface)] text-[var(--text-primary)]/80 hover:bg-[var(--background-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-strong)]/50'
                }`}
              >
                <span>{cat}</span>
                {cat !== 'All' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans ${
                    isSelected ? 'bg-[var(--emerald-edge)] text-[var(--on-secondary)]' : 'bg-[var(--background-secondary)] text-[var(--text-primary)]'
                  }`}>
                    {DESTINATIONS.filter((d) => d.category.includes(cat)).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Map Container + Side Information Card */}
        {filteredDestinations.length === 0 && <p role="status" className="mb-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-4 text-sm text-[var(--brand-primary)]">No destinations match this category and season. Try another combination to explore more of Sri Lanka.</p>}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-strong)]/60 bg-[var(--surface)] grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
          
          {/* Map Area */}
          <div className="lg:col-span-8 relative h-[450px] sm:h-[550px] lg:h-auto lg:min-h-[620px] w-full">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Legend Overlay */}
            <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-[var(--border-strong)]/40 text-xs hidden sm:block" data-map-overlay>
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-[var(--brand-primary)] flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-[var(--brand-primary)]" /> Map Guide:
                </span>
                <span className="text-[var(--text-primary)]/70">
                  Showing <strong className="text-[var(--brand-primary)]">{filteredDestinations.length}</strong> location markers
                  {selectedTimingFromParent !== 'Anytime' && <span className="block mt-1">Season: {selectedTimingFromParent}</span>}
                </span>
              </div>
              <MapLegendList className="mt-2 pt-2 border-t border-[var(--border-strong)]/40 grid grid-cols-2 gap-x-3 gap-y-1" />
            </div>

            {/* Phones, where the Map Guide is hidden: a small Key button that opens the legend. */}
            <div ref={keyRef} className="absolute top-4 left-4 z-20 sm:hidden" data-map-overlay>
              <button
                type="button"
                onClick={() => setShowKey((open) => !open)}
                aria-expanded={showKey}
                aria-controls="map-key-legend"
                className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-[var(--border-strong)]/40 text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1"
              >
                <Compass className="w-3.5 h-3.5 text-[var(--brand-primary)]" aria-hidden="true" />
                Key
              </button>
              {showKey && (
                <div className="mt-2 bg-white/95 backdrop-blur-md px-3 py-2.5 rounded-2xl shadow-md border border-[var(--border-strong)]/40">
                  <MapLegendList id="map-key-legend" className="grid grid-cols-2 gap-x-3 gap-y-1.5" />
                </div>
              )}
            </div>

            {/* Route mode: which tour is shown, and ✕ to go back. */}
            {routeTour && (
              <div
                className="absolute top-4 right-4 z-20 max-w-[calc(100%-7.5rem)] sm:max-w-[60%] bg-white/90 backdrop-blur-md pl-3.5 pr-1.5 py-1.5 rounded-2xl shadow-md border border-[var(--border-strong)]/40 text-xs flex items-center gap-2"
                data-route-chip
                data-map-overlay
              >
                <Route className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
                <span className="truncate text-[var(--text-primary)]/70" role="status">
                  Showing: <strong className="text-[var(--brand-primary)]">{routeTour.title}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => clearRoute(true)}
                  aria-label="Clear route"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--brand-primary)] hover:bg-[var(--brand-secondary)]/10 shrink-0 transition-colors"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Touch screens: shown briefly when one finger swipes over the map. */}
            <AnimatePresence>
              {showTouchHint && (
                <motion.div data-reveal
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                >
                  <span className="bg-[var(--inverse-surface)]/85 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
                    Use two fingers to move the map
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Location Pills */}
            <div ref={quickJumpRef} role="group" data-keep-clear aria-label="Jump to a map location" className="absolute bottom-4 left-4 right-16 z-20 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-md border border-[var(--border-strong)]/40 overflow-x-auto flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--brand-primary)] uppercase tracking-wider px-2 shrink-0">
                Quick Jump:
              </span>
              {filteredDestinations.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  aria-pressed={activeDest?.id === dest.id}
                  onClick={() => handleDestinationClick(dest)}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-xl transition-colors font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] ${
                    activeDest?.id === dest.id
                      ? 'bg-[var(--brand-secondary)] text-white font-bold'
                      : 'bg-[var(--background-secondary)] text-[var(--text-primary)] hover:bg-[var(--brand-secondary)]/10'
                  }`}
                >
                  {dest.name}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Floating Information Panel (lg:col-span-4) */}
          <div className="hidden lg:flex lg:col-span-4 bg-[var(--inverse-surface)] text-white p-6 sm:p-8 flex-col justify-between border-l border-white/10 relative overflow-hidden">
            {/* Background Decorative Blur */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--emerald-edge)]/20 rounded-full blur-3xl pointer-events-none" />

            <AnimatePresence mode="wait">
              {activeDest ? (
                <motion.div data-reveal
                  key={activeDest.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 flex-1 flex flex-col justify-between"
                >
                  <div>
                    {/* Image Preview Header */}
                    <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[16/9] mb-5 border border-white/10 group">
                      <TravelImage
                        src={activeDest.image}
                        alt={activeDest.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      
                      <div className="absolute top-3 right-3 bg-[var(--inverse-surface)]/90 text-[var(--accent-text)] px-2.5 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border border-[var(--accent)]/30">
                        <span>★ {activeDest.rating}</span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="text-[10px] uppercase tracking-widest text-[var(--accent-text)] font-semibold">
                          {activeDest.region} • {activeDest.province}
                        </span>
                        <h3 className="te-place-name font-heading text-2xl font-bold">{activeDest.name}</h3>
                      </div>
                    </div>

                    {/* Short Description */}
                    <p className="text-sm text-white/85 leading-relaxed font-light mb-4">
                      {activeDest.shortDescription}
                    </p>

                    {/* Category Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {activeDest.category.map((cat) => (
                        <span
                          key={cat}
                          className="bg-[var(--inverse-raised)] text-[var(--on-inverse)] border border-[var(--emerald-edge)]/50 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Best Time & Elevation */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-xl border border-white/10 text-xs mb-3">
                      <div>
                        <span className="text-white/50 block text-[10px] uppercase tracking-wider">Best Time</span>
                        <span className="font-semibold text-white">{activeDest.bestTime}</span>
                      </div>
                      <div>
                        <span className="text-white/50 block text-[10px] uppercase tracking-wider">Elevation/Type</span>
                        <span className="font-semibold text-white">{activeDest.elevation || activeDest.region}</span>
                      </div>
                    </div>

                    {/* Google Maps, and the travel time from the airport when set */}
                    <PlaceLinks
                      dest={activeDest}
                      className="flex flex-col items-start gap-1.5 text-xs mb-5"
                      linkClassName="inline-flex items-center gap-1.5 font-semibold text-[var(--accent-text)] hover:text-white transition-colors"
                      timeClassName="flex items-center gap-1.5 text-white/70"
                    />

                    {/* Top Experiences */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-text)] mb-2 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Top Experiences</span>
                      </h4>
                      <ul className="space-y-1.5">
                        {activeDest.experiences.slice(0, 3).map((exp, i) => (
                          <li key={i} className="text-xs text-white/80 flex items-start space-x-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--emerald-edge)] shrink-0 mt-0.5" />
                            <span>{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <Link
                    to={paths.destination(activeDest.id)}
                    className="te-button te-button--primary w-full py-3.5 font-bold text-sm"
                  >
                    <span className="te-place-name">Explore {activeDest.name}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-white/60">
                  <MapPin className="w-12 h-12 text-[var(--accent-text)] mb-3 animate-bounce" />
                  <p className="font-heading text-lg text-white">Click any location marker on the map to explore</p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Mobile Animated Bottom Card / Sheet */}
        <div className="lg:hidden mt-6 bg-[var(--inverse-surface)] text-white p-6 rounded-3xl shadow-xl border border-white/10">
          {activeDest && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <TravelImage
                  src={activeDest.image}
                  alt={activeDest.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-white/20 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--accent-text)]">{activeDest.region}</span>
                    <span className="text-xs text-white/50">• Best: {activeDest.bestTime}</span>
                  </div>
                  <h3 className="te-place-name font-heading text-xl font-bold text-white">{activeDest.name}</h3>
                  <p className="text-xs text-white/70 line-clamp-2 mt-1">{activeDest.shortDescription}</p>
                  <PlaceLinks
                    dest={activeDest}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]"
                    linkClassName="inline-flex items-center gap-1 font-semibold text-[var(--accent-text)] hover:text-white transition-colors"
                    timeClassName="flex items-center gap-1 text-white/70"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-white/10 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex flex-wrap gap-1.5">
                  {activeDest.category.map((c) => (
                    <span key={c} className="shrink-0 whitespace-nowrap text-[10px] bg-[var(--inverse-raised)] text-[var(--on-inverse)] px-2 py-0.5 rounded-full font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
                <Link
                  to={paths.destination(activeDest.id)}
                  className="te-button te-button--primary w-full sm:w-auto min-w-0 px-4 py-3 font-bold text-xs"
                >
                  <span className="te-place-name">Explore {activeDest.name}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
