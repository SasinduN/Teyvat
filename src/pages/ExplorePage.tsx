import { PageHero } from '@/components/PageHero';
import { DestinationExplorer } from '@/components/DestinationExplorer';
import { HiddenGemsSection } from '@/components/HiddenGemsSection';
import { useDestinations } from '@/hooks/useSiteContent';
import { usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { PAGE_TITLES, PAGE_DESCRIPTIONS } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/** Discovery tools have their own route; the destination catalogue stays separate. */
export function ExplorePage() {
  usePageTitle(PAGE_TITLES.explore);
  const destinations = useDestinations();
  const { openInquiry } = usePublicSite();
  return <>
    <PageHero compact image={destinations.find(row => row.featured)?.image ?? destinations[0]?.image}
      crumbs={[{ label: 'Home', to: paths.home }, { label: 'Explore' }]}
      title="Explore Sri Lanka" eyebrow="Find Your Way Around the Island" subtitle={PAGE_DESCRIPTIONS.explore} />
    <DestinationExplorer />
    <Section name="HiddenGemsSection"><HiddenGemsSection onOpenInquiry={openInquiry} /></Section>
  </>;
}
