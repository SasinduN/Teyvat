import { useDestinations } from '@/hooks/useSiteContent';
import { SectionHead } from './PageCards';
import { HomeDestinationCard } from './HomeDestinationCard';
import { SiteLink } from './SiteLink';
import { paths } from '@shared/site-paths';
import { ArrowRight } from 'lucide-react';

/** A preview, not the full collection: one large and three smaller. Unfeatured rows fill sparse selections. */
export function DestinationSpotlight() {
  const destinations = useDestinations();
  const firstFour = [...destinations.filter(row => row.featured), ...destinations.filter(row => !row.featured)].slice(0, 4);
  return <section id="discover" aria-label="Places to begin" className="te-home-discover">
    <div className="te-container">
      <SectionHead title="Where to begin" text="Four places people often start with. There are more on the map." />
      <div className="home-discover-grid">
        {firstFour.map((destination, index) => <HomeDestinationCard key={destination.id} destination={destination} lead={index === 0} />)}
      </div>
      <div className="home-discover-actions">
        <SiteLink to={paths.destinations} className="te-button te-button--primary">All Destinations</SiteLink>
        <SiteLink to={paths.experiences} className="te-ed-link">What to do here<ArrowRight aria-hidden="true" /></SiteLink>
      </div>
    </div>
  </section>;
}
