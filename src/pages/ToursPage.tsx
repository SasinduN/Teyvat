import { useNavigate } from 'react-router-dom';
import { PageHero } from '@/components/PageHero';
import { TailorMadeCard } from '@/components/TailorMadeCard';
import { TourCategoryRow } from '@/components/TourCategoryRow';
import { ToursSection } from '@/components/ToursSection';
import { usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { useTours } from '@/hooks/useSiteContent';
import { PAGE_DESCRIPTIONS, PAGE_NAMES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/**
 * `/tours`: the tour categories (each a link to its page), then every tour, then the
 * tailor-made card. "View route on map" goes to the Explore map with that tour's route.
 */
export function ToursPage() {
  usePageTitle(PAGE_NAMES.tours);
  const tours = useTours();
  const { openInquiry } = usePublicSite();
  const navigate = useNavigate();
  return (
    <>
      <PageHero
        compact
        image={tours[0]?.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Tours' }]}
        title="Tours"
        subtitle={PAGE_DESCRIPTIONS.tours}
      />
      <Section name="TourCategoryRow">
        <TourCategoryRow />
      </Section>
      <Section name="ToursSection">
        <ToursSection
          onOpenInquiry={openInquiry}
          onViewRoute={(tour) => navigate(paths.tourOnMap(tour.id))}
        />
      </Section>
      <Section name="TailorMadeCard">
        <TailorMadeCard />
      </Section>
    </>
  );
}
