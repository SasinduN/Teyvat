import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HeroSection } from '@/components/HeroSection';
import { DestinationSpotlight } from '@/components/DestinationSpotlight';
import { SiteLink } from '@/components/SiteLink';
import { StatStrip } from '@/components/StatStrip';
import { TravelImage } from '@/components/TravelImage';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useDestinations, useHeroSlides, useTours } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/** A photo the width of the window, and why the coast depends on the month. */
function CoastBand() {
  const destinations = useDestinations();
  const photo = destinations.find((d) => d.id === 'galle')?.image ?? destinations[0]?.image;
  if (!photo) return null;
  return (
    <section className="te-band" aria-labelledby="home-coast-title" data-photo-band>
      <TravelImage fullWidth sizes="100vw" src={photo} alt="" className="te-band__photo" />
      <div className="te-container te-band__inner">
        <div className="te-band__copy">
          <h2 id="home-coast-title" className="font-heading">Two coasts, two seasons</h2>
          <p>The south and west are at their best from November to April. The east is at its best from May to September.</p>
          <Link to={paths.destinationsIn('Beaches')}>
            See the beaches <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** The tours as a plain list: what, how long, how much. */
function RouteList() {
  const tours = useTours();
  if (tours.length === 0) return null;
  return (
    <section className="te-ed-section" aria-labelledby="home-routes-title" id="home-routes">
      <div className="te-container">
        <h2 id="home-routes-title" className="te-ed-title font-heading">Routes to start from</h2>
        <p className="te-ed-lead">Every route can change to suit your dates and pace.</p>
        <ul className="te-ed-list mt-8">
          {tours.slice(0, 4).map((tour) => (
            <li key={tour.id}>
              <Link to={paths.tour(tour.id)} className="te-ed-list__link">
                <span className="te-ed-list__title font-heading">{tour.title}</span>
                <span className="te-ed-meta">{tour.route.join(', ')}</span>
                <span className="te-ed-list__price">{tour.days} days, from ${tour.priceFrom}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="te-ed-actions">
          <SiteLink to={paths.tours} className="te-ed-link">All tours <ArrowRight aria-hidden="true" /></SiteLink>
        </div>
      </div>
    </section>
  );
}

/**
 * The home page: the hero, the numbers, four places to begin, a photo band, the
 * routes, and a way to plan. The map, planner, journal and the other collections
 * have pages of their own; old links to their home sections are redirected
 * (`LEGACY_HOME_SECTIONS`).
 */
export function HomePage() {
  usePageTitle(null);
  const slides = useHeroSlides();
  const planPhoto = slides[1]?.url ?? slides[0]?.url;
  return (
    <>
      <Section name="HeroSection">
        <HeroSection />
      </Section>

      <Section name="StatStrip">
        <StatStrip />
      </Section>

      <Section name="DestinationSpotlight">
        <DestinationSpotlight />
      </Section>

      <Section name="CoastBand">
        <CoastBand />
      </Section>

      <Section name="RouteList">
        <RouteList />
      </Section>

      <section id="plan-your-journey" aria-labelledby="home-plan-title" className="te-ed-section te-ed-section--tint">
        <div className="te-container te-split te-split--flip">
          {planPhoto && (
            <div className="te-ed-photo">
              <TravelImage src={planPhoto} alt="" sizes="(min-width: 900px) 58vw, 100vw" />
            </div>
          )}
          <div className="te-reading-column">
            <h2 id="home-plan-title" className="te-ed-title font-heading">Plan your trip</h2>
            <p className="te-ed-lead">
              Tell us the dates and what you want to see. We will suggest a route, then change it until it suits you.
            </p>
            <div className="te-cta-group mt-6 flex flex-wrap">
              <SiteLink to={paths.plan} className="te-button te-button--primary">Plan Your Trip</SiteLink>
              <SiteLink to={paths.contact} className="te-button te-button--outline">Talk to Us</SiteLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
