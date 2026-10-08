import { PageHero } from '@/components/PageHero';
import { TravelPlanner } from '@/components/TravelPlanner';
import { SiteLink } from '@/components/SiteLink';
import { useHeroSlides } from '@/hooks/useSiteContent';
import { usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { PAGE_TITLES, PAGE_DESCRIPTIONS } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

export function PlanPage() {
  usePageTitle(PAGE_TITLES.plan);
  const slides = useHeroSlides();
  const { openInquiry } = usePublicSite();
  return <>
    <PageHero compact image={slides[0]?.url} title="Plan Your Trip" eyebrow="Your island. Your pace."
      subtitle={PAGE_DESCRIPTIONS.plan} crumbs={[{ label: 'Home', to: paths.home }, { label: 'Plan Your Trip' }]} />
    <Section name="TravelPlanner"><TravelPlanner onSavePlan={name => openInquiry(`Journey Plan: ${name}`)} /></Section>
    <section className="te-container">
      <div className="glass3d glass-strong p-6 sm:p-8">
        <h2 className="font-heading text-[var(--brand-primary)]">Let us take care of the details.</h2>
        <p className="my-4 text-[var(--text-secondary)]">Your generated journey is a starting point. Our local travel designers will confirm availability, transfers and the right pace for you.</p>
        <SiteLink to={paths.contact} className="te-button te-button--primary">Contact a Travel Designer</SiteLink>
      </div>
    </section>
  </>;
}
