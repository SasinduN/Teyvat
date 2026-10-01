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
      <section className="relative flex min-h-[78vh] items-center overflow-hidden bg-[#0F2E23] pt-24 text-white" data-not-found>
        {featured[0] && <img src={featured[0].image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F2E23]/60 to-[#0F2E23]" />
        <div className="relative z-10 mx-auto max-w-3xl space-y-6 px-4 text-center">
          <span className="inline-block rounded-full border border-[#D4AF37]/30 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Error 404
          </span>
          <h1 className="font-heading text-4xl font-bold leading-tight sm:text-6xl">
            This path isn’t <span className="font-serif italic text-[#D4AF37]">on the map.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg font-light text-white/80">
            The page may have moved, or the link may be mistyped. Here are some good places to pick up the trail.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link
              to={paths.home}
              className="flex w-full items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C5A059] px-8 py-3.5 font-bold text-[#0F2E23] shadow-2xl sm:w-auto"
            >
              <Compass className="h-5 w-5" aria-hidden="true" />
              <span>Back to Home</span>
            </Link>
            <Link
              to={paths.destinations}
              className="flex w-full items-center justify-center space-x-2 rounded-full border border-white/20 bg-white/10 px-8 py-3.5 font-semibold text-white transition-colors hover:bg-white/20 sm:w-auto"
            >
              <MapPin className="h-5 w-5 text-[#D4AF37]" aria-hidden="true" />
              <span>Browse Destinations</span>
            </Link>
            <Link
              to={paths.tours}
              className="flex w-full items-center justify-center space-x-2 rounded-full border border-white/20 bg-white/10 px-8 py-3.5 font-semibold text-white transition-colors hover:bg-white/20 sm:w-auto"
            >
              <ArrowRight className="h-5 w-5 text-[#D4AF37]" aria-hidden="true" />
              <span>See Tours</span>
            </Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <Section name="NotFoundSuggestions">
          <section className="py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
