import { useDestinations } from '@/hooks/useSiteContent';
import { SectionHead } from './PageCards';
import { HomeDestinationCard } from './HomeDestinationCard';
import { SiteLink } from './SiteLink';
import { paths } from '@shared/site-paths';
import { ArrowRight } from 'lucide-react';

/** A preview, not the full collection. Unfeatured rows fill sparse selections. */
export function DestinationSpotlight() {
  const destinations = useDestinations();
  const curated = [...destinations.filter(row => row.featured), ...destinations.filter(row => !row.featured)].slice(0, 4);
  return <section id="discover" aria-label="Discover Sri Lanka" className="te-home-discover">
    <div className="te-container">
      <SectionHead eyebrow="A few places to begin" title="Discover Sri Lanka" text="Misty highlands, ancient citadels, coastal forts and tropical shores. Find your own way into the island." />
      <div className="home-discover-grid">
        {curated.map(destination => <HomeDestinationCard key={destination.id} destination={destination} />)}
      </div>
      <div className="home-discover-actions">
        <SiteLink to={paths.destinations} className="te-button te-button--primary">All Destinations<ArrowRight size={16} aria-hidden="true" /></SiteLink>
        <SiteLink to={paths.experiences} className="te-button te-button--text-link">Explore Experiences<ArrowRight size={16} aria-hidden="true" /></SiteLink>
      </div>
    </div>
  </section>;
}
