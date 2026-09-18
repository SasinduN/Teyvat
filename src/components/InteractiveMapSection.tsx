import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDestinations } from '@/hooks/useSiteContent';
import { Destination, CategoryType } from '../types';
import { MapPin, Sparkles, ChevronRight, Compass, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface InteractiveMapSectionProps {
  onSelectDestination: (dest: Destination) => void;
  activeFilterFromParent?: CategoryType | 'All';
  selectedWhereFromParent?: string;
}

export const InteractiveMapSection: React.FC<InteractiveMapSectionProps> = ({
  onSelectDestination,
  activeFilterFromParent,
  selectedWhereFromParent
}) => {
  const DESTINATIONS = useDestinations();
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [activeDest, setActiveDest] = useState<Destination | null>(
    DESTINATIONS.find((d) => d.id === 'ella') || DESTINATIONS[0]
  );
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

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
  }, [activeFilterFromParent]);

  useEffect(() => {
    if (selectedWhereFromParent && selectedWhereFromParent !== 'All') {
      const found = DESTINATIONS.find(
        (d) => d.name.toLowerCase() === selectedWhereFromParent.toLowerCase()
      );
      if (found) {
        setActiveDest(found);
      }
    }
  }, [selectedWhereFromParent]);

  // Filtered Destinations List
  const filteredDestinations = DESTINATIONS.filter((d) => {
    if (selectedCategory === 'All') return true;
    return d.category.includes(selectedCategory);
  });

  // Initialize Leaflet Map dynamically
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const L = await import('leaflet');

        if (!isMounted || !mapContainerRef.current) return;

        // Create Leaflet map centered on Sri Lanka
        const map = L.map(mapContainerRef.current, {
          center: [7.8731, 80.7718],
          zoom: 7.8,
          minZoom: 7,
          maxZoom: 13,
          zoomControl: false,
          scrollWheelZoom: false,
          attributionControl: false
        });

        // Custom Light/Sand styled Map Tiles (CartoDB Voyager)
        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          {
            maxZoom: 19,
            subdomains: 'abcd'
          }
        ).addTo(map);

        // Add Zoom Control to bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapInstanceRef.current = map;
        markersGroupRef.current = L.layerGroup().addTo(map);
      } catch (err) {
        console.error('Failed to initialize Leaflet map:', err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when active filter or destination changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    import('leaflet').then((L) => {
      markersGroupRef.current.clearLayers();

      filteredDestinations.forEach((dest) => {
        const isActive = activeDest?.id === dest.id;

        // Category Color Mapping
        const isBeach = dest.category.includes('Beaches');
        const isMountain = dest.category.includes('Mountains');
        const isCulture = dest.category.includes('Culture');
        const isWildlife = dest.category.includes('Wildlife');

        let badgeBg = '#1C4737'; // Default Forest Green
        if (isBeach) badgeBg = '#0284C7'; // Cyan/Blue
        if (isMountain) badgeBg = '#16A34A'; // Mountain Green
        if (isCulture) badgeBg = '#D97706'; // Terracotta Amber
        if (isWildlife) badgeBg = '#CA8A04'; // Warm Gold

        // Custom HTML Marker Element
        const markerHtml = `
          <div class="relative group cursor-pointer">
            ${
              isActive
                ? `<div class="custom-marker-pulse" style="background-color: ${badgeBg}"></div>`
                : ''
            }
            <div class="relative flex items-center justify-center transition-all duration-300 transform ${
              isActive ? 'scale-125 z-30' : 'hover:scale-110 z-10'
            }">
              <div class="w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center font-bold text-xs text-white" style="background-color: ${badgeBg}">
                ${dest.name.charAt(0)}
              </div>
              <div class="absolute top-9 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-[#0F2E23] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-md border border-white/20 opacity-90 group-hover:opacity-100">
                ${dest.name}
              </div>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-leaflet-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([dest.latitude, dest.longitude], {
          icon: customIcon
        });

        marker.on('click', () => {
          setActiveDest(dest);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([dest.latitude, dest.longitude], 9.5, {
              duration: 1.2
            });
          }
        });

        markersGroupRef.current.addLayer(marker);
      });
    });
  }, [filteredDestinations, activeDest]);

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
    <section id="explore-map" className="py-20 bg-[#F5EFEB] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1C4737] bg-[#1C4737]/10 px-4 py-1 rounded-full inline-block mb-3">
            Interactive Island Map
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[#0F2E23] tracking-tight mb-3">
            Explore Sri Lanka
          </h2>
          <p className="text-lg text-[#1A1A1A]/70 font-serif italic">
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
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 flex items-center space-x-1.5 shadow-xs ${
                  isSelected
                    ? 'bg-[#0F2E23] text-[#D4AF37] shadow-md scale-105 border border-[#368E6B]'
                    : 'bg-white text-[#1A1A1A]/80 hover:bg-[#1C4737] hover:text-white border border-[#D4C3B5]/50'
                }`}
              >
                <span>{cat}</span>
                {cat !== 'All' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans ${
                    isSelected ? 'bg-[#368E6B] text-white' : 'bg-[#F5EFEB] text-[#1A1A1A]'
                  }`}>
                    {DESTINATIONS.filter((d) => d.category.includes(cat)).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Map Container + Side Information Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#D4C3B5]/60 bg-white grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
          
          {/* Map Area */}
          <div className="lg:col-span-8 relative h-[450px] sm:h-[550px] lg:h-[620px] w-full">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Legend Overlay */}
            <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-[#D4C3B5]/40 text-xs hidden sm:flex items-center space-x-3">
              <span className="font-semibold text-[#0F2E23] flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-[#1C4737]" /> Map Guide:
              </span>
              <span className="text-[#1A1A1A]/70">
                Showing <strong className="text-[#0F2E23]">{filteredDestinations.length}</strong> location markers
              </span>
            </div>

            {/* Quick Location Pills */}
            <div className="absolute bottom-4 left-4 right-16 sm:right-auto z-20 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-md border border-[#D4C3B5]/40 overflow-x-auto max-w-full flex items-center space-x-2 no-scrollbar">
              <span className="text-[11px] font-bold text-[#1C4737] uppercase tracking-wider px-2 shrink-0">
                Quick Jump:
              </span>
              {filteredDestinations.slice(0, 6).map((dest) => (
                <button
                  key={dest.id}
                  onClick={() => handleDestinationClick(dest)}
                  className={`text-xs px-2.5 py-1 rounded-xl transition-colors font-medium whitespace-nowrap ${
                    activeDest?.id === dest.id
                      ? 'bg-[#1C4737] text-white font-bold'
                      : 'bg-[#F5EFEB] text-[#1A1A1A] hover:bg-[#1C4737]/10'
                  }`}
                >
                  {dest.name}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Floating Information Panel (lg:col-span-4) */}
          <div className="hidden lg:flex lg:col-span-4 bg-[#0F2E23] text-white p-6 sm:p-8 flex-col justify-between border-l border-white/10 relative overflow-hidden">
            {/* Background Decorative Blur */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#368E6B]/20 rounded-full blur-3xl pointer-events-none" />

            <AnimatePresence mode="wait">
              {activeDest ? (
                <motion.div
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
                      <img
                        src={activeDest.image}
                        alt={activeDest.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      
                      <div className="absolute top-3 right-3 bg-[#0F2E23]/90 text-[#D4AF37] px-2.5 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border border-[#D4AF37]/30">
                        <span>★ {activeDest.rating}</span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold">
                          {activeDest.region} • {activeDest.province}
                        </span>
                        <h3 className="font-heading text-2xl font-bold">{activeDest.name}</h3>
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
                          className="bg-[#1C4737] text-[#D4AF37] border border-[#368E6B]/50 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Best Time & Elevation */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-xl border border-white/10 text-xs mb-5">
                      <div>
                        <span className="text-white/50 block text-[10px] uppercase tracking-wider">Best Time</span>
                        <span className="font-semibold text-white">{activeDest.bestTime}</span>
                      </div>
                      <div>
                        <span className="text-white/50 block text-[10px] uppercase tracking-wider">Elevation/Type</span>
                        <span className="font-semibold text-white">{activeDest.elevation || activeDest.region}</span>
                      </div>
                    </div>

                    {/* Top Experiences */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-2 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Top Experiences</span>
                      </h4>
                      <ul className="space-y-1.5">
                        {activeDest.experiences.slice(0, 3).map((exp, i) => (
                          <li key={i} className="text-xs text-white/80 flex items-start space-x-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#368E6B] shrink-0 mt-0.5" />
                            <span>{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <button
                    onClick={() => onSelectDestination(activeDest)}
                    className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:from-[#C5A059] hover:to-[#B89248] text-[#0F2E23] rounded-xl font-bold text-sm shadow-lg flex items-center justify-center space-x-2 transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    <span>Explore {activeDest.name}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-white/60">
                  <MapPin className="w-12 h-12 text-[#D4AF37] mb-3 animate-bounce" />
                  <p className="font-heading text-lg text-white">Click any location marker on the map to explore</p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Mobile Animated Bottom Card / Sheet */}
        <div className="lg:hidden mt-6 bg-[#0F2E23] text-white p-6 rounded-3xl shadow-xl border border-white/10">
          {activeDest && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <img
                  src={activeDest.image}
                  alt={activeDest.name}
                  className="w-20 h-20 rounded-2xl object-cover border border-white/20 shrink-0"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold text-[#D4AF37]">{activeDest.region}</span>
                    <span className="text-xs text-white/50">• Best: {activeDest.bestTime}</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-white">{activeDest.name}</h3>
                  <p className="text-xs text-white/70 line-clamp-2 mt-1">{activeDest.shortDescription}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div className="flex gap-1.5 overflow-x-auto">
                  {activeDest.category.map((c) => (
                    <span key={c} className="text-[10px] bg-[#1C4737] text-[#D4AF37] px-2 py-0.5 rounded-full font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => onSelectDestination(activeDest)}
                  className="px-5 py-2.5 bg-[#D4AF37] text-[#0F2E23] rounded-xl font-bold text-xs flex items-center space-x-1 shrink-0"
                >
                  <span>Explore {activeDest.name}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
