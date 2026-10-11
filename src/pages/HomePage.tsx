import { ArrowRight, Compass } from 'lucide-react';
import { HeroSection } from '@/components/HeroSection';
import { DestinationSpotlight } from '@/components/DestinationSpotlight';
import { SiteLink } from '@/components/SiteLink';
import { usePageTitle } from '@/context/PublicSiteContext';
import { HOME_TITLE } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/**
 * The home page: the hero, four places to begin, and a way to plan. The map,
 * planner, journal and the other collections have pages of their own; old
 * links to their home sections are redirected (`LEGACY_HOME_SECTIONS`).
 */
export function HomePage() {
  usePageTitle(HOME_TITLE);
  return (
    <>
      <Section name="HeroSection">
        <HeroSection />
      </Section>

      <Section name="DestinationSpotlight">
        <DestinationSpotlight />
      </Section>

      <section id="plan-your-journey" aria-labelledby="home-plan-title" className="te-home-plan">
        <div className="te-container">
          <div className="te-home-plan-panel">
            <div className="te-reading-column">
              <h2 id="home-plan-title" className="font-heading text-[var(--brand-primary)]">
                Plan Your Journey
              </h2>
              <p className="mt-4 text-[var(--text-secondary)]">
                Tell us what you love. Shape a Sri Lankan journey around your interests, your pace, and the places you
                want to discover.
              </p>
            </div>
            <div className="te-cta-group flex flex-wrap">
              <SiteLink to={paths.plan} className="te-button te-button--primary">
                <Compass size={18} aria-hidden="true" />
                Plan Your Trip
              </SiteLink>
              <SiteLink to={paths.contact} className="te-button te-button--outline">
                Talk to a Travel Designer
                <ArrowRight size={18} aria-hidden="true" />
              </SiteLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
