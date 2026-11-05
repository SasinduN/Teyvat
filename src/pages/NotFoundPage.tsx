import { TravelImage } from '@/components/TravelImage';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, MapPin } from 'lucide-react';
import { DestinationCard, SectionHead } from '@/components/PageCards';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useDestinations } from '@/hooks/useSiteContent';
import { PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/**
 * Any path that isn't a page, and any slug that isn't (or is no longer) a
 * published row. Phase 8b makes the server answer these with HTTP 404.
 */
export function NotFoundPage() {
  usePageTitle(PAGE_TITLES.notFound);
  const featured = useDestinations().filter((d) => d.featured);
  return (
    <>
      <section className="te-page-hero te-page-hero--detail relative overflow-hidden bg-[var(--inverse-surface)] text-white" data-not-found>
        {featured[0] && <TravelImage fullWidth loading="eager" fetchPriority="high" sizes="100vw" src={featured[0].image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="te-page-hero-overlay absolute inset-0" />
        <div className="te-container te-page-hero-content relative z-10"
        ><div className="te-page-hero-copy space-y-6">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent-text)]">
            Error 404
          </span>
          <h1 className="te-page-title font-heading font-bold leading-tight">
            This path isn’t <span className="font-heading text-[var(--accent-text)]">on the map.</span>
          </h1>
          <p className="te-page-description text-lg text-white/80">
            The page may have moved, or the link may be mistyped. Here are some good places to pick up the trail.
          </p>
          <div className="te-cta-group flex flex-col gap-4 pt-4 sm:flex-row">
            <Link
              to={paths.home}
              className="te-button te-button--primary w-full sm:w-auto"
            >
              <Compass className="h-5 w-5" aria-hidden="true" />
              <span>Back to Home</span>
            </Link>
            <Link
              to={paths.destinations}
              className="te-button te-button--secondary w-full sm:w-auto"
            >
              <MapPin className="h-5 w-5" aria-hidden="true" />
              <span>Browse Destinations</span>
            </Link>
            <Link
              to={paths.tours}
              className="te-button te-button--secondary w-full sm:w-auto"
            >
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
              <span>See Tours</span>
            </Link>
          </div>
        </div></div>
      </section>

      {featured.length > 0 && (
        <Section name="NotFoundSuggestions">
          <section className="py-16 sm:py-20">
            <div className="te-container">
              <SectionHead eyebrow="Popular Right Now" title="Start Somewhere Beautiful" />
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {featured.slice(0, 3).map((d) => (
                  <DestinationCard key={d.id} dest={d} />
                ))}
              </div>
            </div>
          </section>
        </Section>
      )}
    </>
  );
}
