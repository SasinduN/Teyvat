import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { TailorMadeCard } from '@/components/TailorMadeCard';
import { ToursSection } from '@/components/ToursSection';
import { usePageSubject, usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { useTourCategories, useTours } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import type { TourCategory } from '@/types';
import { NotFoundPage } from './NotFoundPage';
import { Section } from './Section';

/**
 * `/tours/category/:slug`: one travel style (0030). Its photo and heading, the intro,
 * the best-time note linking to When to go, its published tours (the same cards and
 * phone swipe row as `/tours`), and the tailor-made card. An unknown or unpublished
 * slug is the 404 page, as the server's status says.
 */
export function TourCategoryPage() {
  const { slug } = useParams();
  const category = useTourCategories().find((c) => c.id === slug);
  if (!category) return <NotFoundPage />;
  // Keyed, so moving between categories starts each one's swipe row afresh.
  return <TourCategoryView key={category.id} category={category} />;
}

function TourCategoryView({ category }: { category: TourCategory }) {
  usePageTitle(category.heading);
  usePageSubject({ inquiry: category.name, whatsapp: { kind: 'tourCategory', id: category.id, name: category.name } });
  const tours = useTours().filter((tour) => tour.categoryIds.includes(category.id));
  const { openInquiry } = usePublicSite();
  const navigate = useNavigate();

  return (
    <>
      <PageHero
        compact
        image={category.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Tours', to: paths.tours }, { label: category.name }]}
        title={category.heading}
        subtitle={category.shortIntro}
      />

      <section className="te-ed-section te-cat-intro" aria-label="About these tours">
        <div className="te-container">
          <div className="space-y-5">
            {category.intro.map((paragraph, i) => (
              <p key={i} className="te-prose text-[var(--text-primary)]/85">{paragraph}</p>
            ))}
          </div>
          {category.bestTimeNote && (
            <div className="te-cat-best" data-best-time>
              <p className="te-prose">
                <strong>When to go.</strong> {category.bestTimeNote}
              </p>
              <Link to={paths.whenToGo} className="te-ed-link">
                See when to go <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {tours.length > 0 ? (
        <Section name="ToursSection">
          <ToursSection
            tours={tours}
            title="Tours in this category"
            lead="Each one can change to suit your dates, hotels and pace."
            onOpenInquiry={openInquiry}
            onViewRoute={(tour) => navigate(paths.tourOnMap(tour.id))}
          />
        </Section>
      ) : (
        <section className="te-ed-section te-cat-empty" aria-labelledby="category-empty-title" data-category-empty>
          <div className="te-container">
            <h2 id="category-empty-title" className="te-ed-title font-heading">Tours in this category</h2>
            <p className="te-ed-lead">We&rsquo;re putting these together. Ask us for a tailor-made trip.</p>
          </div>
        </section>
      )}

      <Section name="TailorMadeCard">
        <TailorMadeCard />
      </Section>
    </>
  );
}
