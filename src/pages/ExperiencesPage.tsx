import { PageHero } from '@/components/PageHero';
import { FeaturedExperiences } from '@/components/FeaturedExperiences';
import { ExperiencesSection } from '@/components/ExperiencesSection';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useFeaturedExperiences } from '@/hooks/useSiteContent';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/**
 * `/experiences`: the home page's two experience sections, as they are. Here
 * a category card goes to the destinations list filtered to it; on the home
 * page it filters the map.
 */
export function ExperiencesPage() {
  usePageTitle(PAGE_TITLES.experiences);
  const featured = useFeaturedExperiences();
  return (
    <>
      <PageHero
        compact
        image={featured[0]?.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Experiences' }]}
        title="Experiences"
        subtitle={PAGE_DESCRIPTIONS.experiences}
      />
      <Section name="FeaturedExperiences">
        <FeaturedExperiences />
      </Section>
      <Section name="ExperiencesSection">
        <ExperiencesSection categoryHref={(category) => paths.destinationsIn(category)} />
      </Section>
    </>
  );
}
