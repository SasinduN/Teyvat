import { useParams } from 'react-router-dom';
import { HeroChip, PageHero } from '@/components/PageHero';
import { ArticleCard, SectionHead } from '@/components/PageCards';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useArticles } from '@/hooks/useSiteContent';
import { pageTitle } from '@shared/page-meta';
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
  usePageTitle(pageTitle(a.title));
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
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-10 flex items-center justify-between border-b border-[#D4C3B5]/40 pb-6 text-xs text-[#1A1A1A]/60">
            <div className="flex items-center space-x-3">
              <img src={a.author.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
              <div>
                <span className="block text-sm font-bold text-[#0F2E23]">{a.author.name}</span>
                <span>{a.author.role}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="block">{a.date}</span>
              <span className="font-semibold text-[#1C4737]">{a.readTime}</span>
            </div>
          </div>

          <div className="space-y-6 text-base font-light leading-relaxed text-[#1A1A1A]/85 sm:text-lg">
            <p className="font-heading text-xl font-medium italic text-[#0F2E23] sm:text-2xl">“{a.snippet}”</p>
            {a.content?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>
        </div>
      </article>

      {all.length > 1 && (
        <Section name="MoreArticles">
          <section className="bg-[#F5EFEB] py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionHead eyebrow="Stories & Insights" title="More From the Journal" />
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
