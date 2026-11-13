import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { QuickSearch } from '@/components/QuickSearch';
import { WishlistTextLink } from '@/components/WishlistLink';
import { InteractiveMapSection } from '@/components/InteractiveMapSection';
import { HiddenGemsSection } from '@/components/HiddenGemsSection';
import { usePageSubject, usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { useDestinations, useTours } from '@/hooks/useSiteContent';
import { goToSection } from '@/lib/routeFocus';
import type { CategoryType } from '@/types';
import { KEEP_SCROLL } from '@/lib/ScrollRestorer';
import { PAGE_DESCRIPTIONS, PAGE_NAMES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/**
 * `/explore`: the quick search, the interactive map and the hidden gems.
 *
 * "View on map" on a destination's page comes here as `?place=<destination id>`: the
 * map picks that place and flies to it, so its nearby attractions show.
 *
 * "View route on map" on /tours comes here as `?mapTour=<tour id>`; the
 * route stays on the map until the visitor clears it or picks a filter
 * (which also drops the parameter). While a route is on the map in view, the
 * WhatsApp message names that tour.
 *
 * The header is full height, so the map starts below the fold and Leaflet
 * still loads only as it nears the screen.
 */
export function ExplorePage() {
  usePageTitle(PAGE_NAMES.explore);
  const destinations = useDestinations();
  const tours = useTours();
  const { openInquiry } = usePublicSite();
  const [params, setParams] = useSearchParams();

  const [filter, setFilter] = useState<CategoryType | 'All'>('All');
  const [where, setWhere] = useState('All');
  const [timing, setTiming] = useState('Anytime');
  const [requestId, setRequestId] = useState(0);
  const mapOnScreen = useMapOnScreen();

  const routeTour = tours.find((tour) => tour.id === params.get('mapTour')) ?? null;
  usePageSubject(
    routeTour && mapOnScreen ? { whatsapp: { kind: 'tour', id: routeTour.id, title: routeTour.title } } : null
  );

  const clearRoute = () =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('mapTour');
        return next;
      },
      { replace: true, state: KEEP_SCROLL }
    );

  return (
    <>
      <PageHero
        image={destinations.find((d) => d.featured)?.image ?? destinations[0]?.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Explore' }]}
        title="Explore Sri Lanka"
        subtitle={PAGE_DESCRIPTIONS.explore}
      />

      <Section name="QuickSearch">
        {/* #12's search bar: dark glass, the container's width, right under the header. */}
        <div className="te-destination-explorer">
          <QuickSearch
            onSearchSubmit={(nextWhere, nextFilter, nextTiming) => {
              clearRoute();
              setWhere(nextWhere);
              setFilter(nextFilter);
              setTiming(nextTiming);
              setRequestId((n) => n + 1);
              goToSection('explore-map');
            }}
          />
        </div>
      </Section>

      <Section name="InteractiveMapSection">
        <InteractiveMapSection
          activeFilterFromParent={filter}
          selectedWhereFromParent={where}
          selectedTimingFromParent={timing}
          searchRequestId={requestId}
          routeTour={routeTour}
          onClearRoute={clearRoute}
          focusPlaceId={params.get('place')}
        />
      </Section>

      <Section name="HiddenGemsSection">
        <HiddenGemsSection onOpenInquiry={openInquiry} />
      </Section>

      <p className="te-container te-wishlist-aside te-ed-actions">
        <WishlistTextLink text="See the places you saved" />
        <Link to={paths.whenToGo} className="te-ed-link" data-when-to-go-link>See when to go <ArrowRight aria-hidden="true" /></Link>
      </p>
    </>
  );
}

/** Whether any of the map section (`#explore-map`) is in the viewport. */
function useMapOnScreen(): boolean {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const map = document.getElementById('explore-map');
    if (!map) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(map);
    return () => observer.disconnect();
  }, []);
  return onScreen;
}
