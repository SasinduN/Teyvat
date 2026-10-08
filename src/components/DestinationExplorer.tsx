import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { QuickSearch } from './QuickSearch';
import { InteractiveMapSection } from './InteractiveMapSection';
import { useTours } from '@/hooks/useSiteContent';
import { usePageSubject } from '@/context/PublicSiteContext';
import { goToSection } from '@/lib/routeFocus';
import type { CategoryType } from '@/types';
import { Section } from '@/pages/Section';

/** The existing interactive discovery tools belong to the dedicated Explore route. */
export function DestinationExplorer() {
  const tours = useTours();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<CategoryType | 'All'>('All');
  const [where, setWhere] = useState('All');
  const [timing, setTiming] = useState('Anytime');
  const [requestId, setRequestId] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const tourId = params.get('mapTour') ?? (location.state as { routeTourId?: string } | null)?.routeTourId;
  const routeTour = tours.find(tour => tour.id === tourId) ?? null;
  usePageSubject(routeTour && onScreen ? { whatsapp: { kind: 'tour', id: routeTour.id, title: routeTour.title } } : null);

  useEffect(() => {
    const map = document.getElementById('explore-map');
    if (!map) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  const clearRoute = () => {
    setParams(previous => { const next = new URLSearchParams(previous); next.delete('mapTour'); return next; }, { replace: true, preventScrollReset: true, state: null });
  };
  return <div className="te-destination-explorer">
    <Section name="QuickSearch"><QuickSearch onSearchSubmit={(nextWhere, nextFilter, nextTiming) => {
      clearRoute(); setWhere(nextWhere); setFilter(nextFilter); setTiming(nextTiming);
      setRequestId(value => value + 1); goToSection('explore-map');
    }} /></Section>
    <Section name="InteractiveMapSection"><InteractiveMapSection activeFilterFromParent={filter} selectedWhereFromParent={where}
      selectedTimingFromParent={timing} searchRequestId={requestId} routeTour={routeTour} onClearRoute={clearRoute} /></Section>
  </div>;
}
