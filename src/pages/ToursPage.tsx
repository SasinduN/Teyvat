import { useNavigate } from 'react-router-dom';
import { PageHero } from '@/components/PageHero';
import { ToursSection } from '@/components/ToursSection';
import { usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { useTours } from '@/hooks/useSiteContent';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/**
 * `/tours`: the complete tour collection. "View route on map" opens the
 * destinations explorer with a shareable tour query and the route showing.
 */
export function ToursPage() {
  usePageTitle(PAGE_TITLES.tours);
  const tours = useTours();
  const { openInquiry } = usePublicSite();
  const navigate = useNavigate();
  return (
    <>
      <PageHero
        compact
        image={tours[0]?.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Tours' }]}
        eyebrow="Signature Itineraries"
        title="Tours"
        subtitle={PAGE_DESCRIPTIONS.tours}
      />
      <Section name="ToursSection">
        <ToursSection
          onOpenInquiry={openInquiry}
          onViewRoute={(tour) =>
            navigate(paths.tourOnMap(tour.id))
          }
        />
      </Section>
    </>
  );
}
