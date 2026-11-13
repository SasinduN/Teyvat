import { useParams } from 'react-router-dom';
import { HeroChip, PageHero } from '@/components/PageHero';
import { ArticleCard, SectionHead } from '@/components/PageCards';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useArticles } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import type { Article } from '@/types';
import { NotFoundPage } from './NotFoundPage';
import { Section } from './Section';

/**
 * `/journal/:slug`: what the article reader modal showed, in a reading
 * column. There is no `/journal` index; "Journal" in the breadcrumb goes to
 * the home page's journal section.
 */
export function ArticlePage() {
  const { slug } = useParams();
  const article = useArticles().find((a) => a.id === slug);
  if (!article) return <NotFoundPage />;
  return <ArticleView key={article.id} a={article} />;
}

function ArticleView({ a }: { a: Article }) {
  usePageTitle(a.title);
  const all = useArticles();

  return (
    <>
      <PageHero
        image={a.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Journal', to: paths.journal }, { label: a.title }]}
        chips={<HeroChip gold>{a.category}</HeroChip>}
        title={a.title}
      />

      <article className="py-14 sm:py-20">
        <div className="te-container"><div className="te-reading-column">
          <div className="mb-10 flex flex-wrap gap-4 items-center justify-between border-b border-[var(--border-strong)]/40 pb-6 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center space-x-3">
              <img src={a.author.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
              <div>
                <span className="block text-sm font-bold text-[var(--brand-primary)]">{a.author.name}</span>
                <span>{a.author.role}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="block">{a.date}</span>
              <span className="font-semibold text-[var(--brand-primary)]">{a.readTime}</span>
            </div>
          </div>

          <div className="space-y-6 te-prose text-[var(--text-primary)]/85">
            <p className="font-heading text-xl font-medium text-[var(--brand-primary)]">“{a.snippet}”</p>
            {a.content?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>
        </div>
        </div>
      </article>

      {all.length > 1 && (
        <Section name="MoreArticles">
          <section className="bg-[var(--background-secondary)] py-16 sm:py-20">
            <div className="te-container">
              <SectionHead title="More from the journal" />
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {all
                  .filter((x) => x.id !== a.id)
                  .slice(0, 3)
                  .map((x) => (
                    <ArticleCard key={x.id} art={x} />
                  ))}
              </div>
            </div>
          </section>
        </Section>
      )}
    </>
  );
}
