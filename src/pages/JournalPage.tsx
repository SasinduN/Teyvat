import { PageHero } from '@/components/PageHero';
import { JournalSection } from '@/components/JournalSection';
import { PhotoStorySection } from '@/components/PhotoStorySection';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useArticles } from '@/hooks/useSiteContent';
import { CRUMB_NAMES, PAGE_DESCRIPTIONS } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/** `/journal`: every published article, then the photo stories. */
export function JournalPage() {
  usePageTitle('journal');
  const articles = useArticles();

  return (
    <>
      <PageHero
        compact
        image={articles[0]?.image}
        crumbs={[{ label: CRUMB_NAMES.home, to: paths.home }, { label: CRUMB_NAMES.journal }]}
        title="Journal"
        subtitle={PAGE_DESCRIPTIONS.journal}
      />
      <Section name="JournalSection">
        <JournalSection />
      </Section>
      <Section name="PhotoStorySection">
        <PhotoStorySection />
      </Section>
    </>
  );
}
