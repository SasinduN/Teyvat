import { HeroSection } from '@/components/HeroSection';
import { DestinationSpotlight } from '@/components/DestinationSpotlight';
import { SiteLink } from '@/components/SiteLink';
import { ArrowRight, Compass } from 'lucide-react';
import { usePageTitle } from '@/context/PublicSiteContext';
import { HOME_TITLE } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/** One homepage: a cinematic introduction, four previews, and a planning invitation. */
export function HomePage() {
  usePageTitle(HOME_TITLE);
  return <>
    <Section name="HeroSection"><HeroSection /></Section>
    <Section name="DiscoverSriLanka"><DestinationSpotlight /></Section>
    <section id="plan-your-journey" aria-labelledby="home-plan-title" className="te-home-plan">
      <div className="te-container">
        <div className="glass3d glass3d--cta glass-strong te-home-plan-panel">
          <div className="te-reading-column">
            <span className="te-eyebrow">Made personal. Designed locally.</span>
            <h2 id="home-plan-title" className="font-heading text-[var(--brand-primary)]">Plan Your Journey</h2>
            <p className="mt-4 text-[var(--text-secondary)]">Tell us what you love. Shape a Sri Lankan journey around your interests, your pace, and the places you want to discover.</p>
          </div>
          <div className="te-cta-group flex flex-wrap">
            <SiteLink to={paths.plan} className="te-button te-button--primary"><Compass size={18} aria-hidden="true" />Plan Your Trip</SiteLink>
            <SiteLink to={paths.contact} className="te-button te-button--outline">Talk to a Travel Designer<ArrowRight size={18} aria-hidden="true" /></SiteLink>
          </div>
        </div>
      </div>
    </section>
  </>;
}
