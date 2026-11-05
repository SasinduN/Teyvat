import { PageHero } from '@/components/PageHero';
import { SiteLink } from '@/components/SiteLink';
import { TravelPlanner } from '@/components/TravelPlanner';
import { usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { useHeroSlides } from '@/hooks/useSiteContent';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/**
 * `/plan`: the journey builder, then a way to a travel designer. The Navbar's
 * "Plan Your Trip" comes here. Saving a journey opens the enquiry form with
 * the choices as its subject.
 */
export function PlanPage() {
  usePageTitle(PAGE_TITLES.plan);
  const slides = useHeroSlides();
  const { openInquiry } = usePublicSite();

  return (
    <>
      <PageHero
        compact
        image={slides[0]?.url}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Plan Your Trip' }]}
        title="Plan Your Trip"
        subtitle={PAGE_DESCRIPTIONS.plan}
      />

      <Section name="TravelPlanner">
        <TravelPlanner onSavePlan={(name) => openInquiry(`Journey Plan: ${name}`)} />
      </Section>

      <section className="bg-[var(--background)] py-16 sm:py-20">
        <div className="te-container">
          <div className="te-reading-column">
            <h2 className="te-ed-title font-heading">We can handle the details</h2>
            <p className="my-4 text-[var(--text-secondary)]">
              This is a sample route. Our travel designers check availability and transfers, and adjust the pace with you.
            </p>
            <SiteLink to={paths.contact} className="te-button te-button--primary">
              Contact a Travel Designer
            </SiteLink>
          </div>
        </div>
      </section>
    </>
  );
}
