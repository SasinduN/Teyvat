import { PageHero } from '@/components/PageHero';
import { JournalSection } from '@/components/JournalSection';
import { PhotoStorySection } from '@/components/PhotoStorySection';
import { useArticles } from '@/hooks/useSiteContent';
import { usePageTitle } from '@/context/PublicSiteContext';
import { PAGE_TITLES, PAGE_DESCRIPTIONS } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

export function JournalPage() {
  usePageTitle(PAGE_TITLES.journal);
  const articles = useArticles();
  return <>
    <PageHero compact image={articles[0]?.image} title="Travel Eye Journal" eyebrow="Stories from the island"
      subtitle={PAGE_DESCRIPTIONS.journal} crumbs={[{ label: 'Home', to: paths.home }, { label: 'Journal' }]} />
    <Section name="JournalSection"><JournalSection /></Section>
    <Section name="PhotoStorySection"><PhotoStorySection /></Section>
  </>;
}
