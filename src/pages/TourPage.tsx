import { hasTourPrice, PRICE_ON_REQUEST } from '@shared/tour-price';
import { Link, useParams } from 'react-router-dom';
import { HeroChip, PageHero } from '@/components/PageHero';
import { SectionHead, TourCard } from '@/components/PageCards';
import { PlanCard } from '@/components/PlanCard';
import { RouteMap } from '@/components/RouteMap';
import { SaveButton } from '@/components/SaveButton';
import { usePageSubject, useContentTitle } from '@/context/PublicSiteContext';
import { useFeatures, useTourCategories, useTours } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import type { TourPackage } from '@/types';
import { NotFoundPage } from './NotFoundPage';
import { Section } from './Section';
import { CRUMB_NAMES } from '@shared/page-meta';

/** `/tours/:slug`: what the tour modal showed, plus its route on a map. */
export function TourPage() {
  const { slug } = useParams();
  const tour = useTours().find((t) => t.id === slug);
  if (!tour) return <NotFoundPage />;
  return <TourView key={tour.id} t={tour} />;
}

function TourView({ t }: { t: TourPackage }) {
  useContentTitle('tour', t.title);
  usePageSubject({ inquiry: t.title, whatsapp: { kind: 'tour', id: t.id, title: t.title } });
  const tours = useTours();
  const { bookings } = useFeatures();
  // Its published categories, in its own order (the first is its card's label).
  const allCategories = useTourCategories();
  const categories = t.categoryIds
    .map((id) => allCategories.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <>
      <PageHero
        image={t.image}
        crumbs={[{ label: CRUMB_NAMES.home, to: paths.home }, { label: CRUMB_NAMES.tours, to: paths.tours }, { label: t.title }]}
        chips={
          <>
            <HeroChip gold>
              {t.days} Days / {t.days - 1} Nights
            </HeroChip>
            <HeroChip>{hasTourPrice(t.priceFrom) ? `From $${t.priceFrom} USD` : PRICE_ON_REQUEST}</HeroChip>
          </>
        }
        eyebrow={`${t.category} Tour`}
        title={t.title}
        subtitle={t.subtitle}
        actions={<SaveButton kind="tour" id={t.id} name={t.title} />}
      />

      <section className="py-14 sm:py-20">
        <div className="te-container grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="space-y-14 lg:col-span-8">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-bold text-[var(--brand-primary)]">Tour Overview</h2>
              <p className="te-prose text-[var(--text-primary)]/85">{t.fullDesc}</p>
              {categories.length > 0 && (
                <p className="te-tour-styles" data-tour-categories-links>
                  <span className="te-ed-label">{categories.length === 1 ? 'Travel style' : 'Travel styles'}</span>
                  {categories.map((c) => (
                    <Link key={c.id} to={paths.tourCategory(c.id)} className="te-ed-link">
                      {c.name}
                    </Link>
                  ))}
                </p>
              )}
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
                  {/* A stop whose destination is published links to its page; any other is its name. */}
                  <ol className="te-route-stops mb-4 text-[var(--text-primary)]" aria-label="Stops, in order" data-route-stops>
                    {t.stops.map((stop, i) => (
                      <li key={i}>
                        {stop.destinationId ? (
                          <Link to={paths.destination(stop.destinationId)} className="te-ed-link">
                            {stop.name}
                          </Link>
                        ) : (
                          <span>{stop.name}</span>
                        )}
                        {i < t.stops.length - 1 ? ',' : ''}
                      </li>
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
