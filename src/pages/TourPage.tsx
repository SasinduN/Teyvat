import { Link, useParams } from 'react-router-dom';
import { HeroChip, PageHero } from '@/components/PageHero';
import { SectionHead, TourCard } from '@/components/PageCards';
import { PlanCard } from '@/components/PlanCard';
import { RouteMap } from '@/components/RouteMap';
import { usePageSubject, usePageTitle } from '@/context/PublicSiteContext';
import { useFeatures, useTours } from '@/hooks/useSiteContent';
import { pageTitle } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import type { TourPackage } from '@/types';
import { NotFoundPage } from './NotFoundPage';
import { Section } from './Section';

/** `/tours/:slug`: what the tour modal showed, plus its route on a map. */
export function TourPage() {
  const { slug } = useParams();
  const tour = useTours().find((t) => t.id === slug);
  if (!tour) return <NotFoundPage />;
  return <TourView key={tour.id} t={tour} />;
}

function TourView({ t }: { t: TourPackage }) {
  usePageTitle(pageTitle(t.title));
  usePageSubject({ inquiry: t.title, whatsapp: { kind: 'tour', id: t.id, title: t.title } });
  const tours = useTours();
  const { bookings } = useFeatures();

  return (
    <>
      <PageHero
        image={t.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Tours', to: paths.tours }, { label: t.title }]}
        chips={
          <>
            <HeroChip gold>
              {t.days} Days / {t.days - 1} Nights
            </HeroChip>
            <HeroChip>From ${t.priceFrom} USD</HeroChip>
          </>
        }
        eyebrow={`${t.category} Tour`}
        title={t.title}
        subtitle={t.subtitle}
      />

      <section className="py-14 sm:py-20">
        <div className="te-container grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="space-y-14 lg:col-span-8">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-bold text-[var(--brand-primary)]">Tour Overview</h2>
              <p className="te-prose text-[var(--text-primary)]/85">{t.fullDesc}</p>
            </div>

            {t.highlights.length > 0 && (
              <div>
                <h2 className="mb-4 font-heading text-2xl font-bold text-[var(--brand-primary)]">Highlights</h2>
                <ul className="te-plain-list te-plain-list--2">
                  {t.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {t.stops.length > 0 && (
              <Section name="TourRoute">
                <div>
                  <h2 className="mb-4 font-heading text-3xl font-bold text-[var(--brand-primary)]">The Route</h2>
                  <ol className="mb-4 flex flex-wrap gap-x-1.5 text-[var(--text-primary)]" aria-label="Stops, in order">
                    {t.route.map((place, i) => (
                      <li key={i}>{place}{i < t.route.length - 1 ? ',' : ''}</li>
                    ))}
                  </ol>
                  <div className="h-[380px] overflow-hidden rounded-lg border border-[var(--border-strong)]/60 sm:h-[460px]">
                    <RouteMap stops={t.stops} />
                  </div>
                </div>
              </Section>
            )}

            {t.itinerary.length > 0 && (
              <div>
                <h2 className="mb-5 font-heading text-3xl font-bold text-[var(--brand-primary)]">Day-by-Day Itinerary</h2>
                <ol className="te-days">
                  {t.itinerary.map((day) => (
                    <li key={day.day}>
                      <span className="te-days__day">Day {day.day}</span>
                      <div>
                        <h3 className="font-heading">{day.title}</h3>
                        {day.location && <span className="te-ed-meta">{day.location}</span>}
                        <p>{day.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              {bookings && (
                <Link to={paths.bookTour(t.id)} className="te-button te-button--primary mb-4 w-full">
                  Book This Tour
                </Link>
              )}
              <PlanCard
                priceFrom={t.priceFrom}
                title={`${t.days} days, your way`}
                text="Every itinerary can change: dates, hotels and pace."
                cta={bookings ? 'Inquire About This Tour' : 'Book / Inquire This Tour'}
              />
            </div>
          </aside>
        </div>
      </section>

      {tours.length > 1 && (
        <Section name="OtherTours">
          <section className="bg-[var(--background-secondary)] py-16 sm:py-20">
            <div className="te-container">
              <SectionHead title="Other routes" />
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {tours
                  .filter((x) => x.id !== t.id)
                  .slice(0, 3)
                  .map((x) => (
                    <TourCard key={x.id} tour={x} />
                  ))}
              </div>
            </div>
          </section>
        </Section>
      )}
    </>
  );
}
