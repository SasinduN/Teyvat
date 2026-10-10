import { useParams } from 'react-router-dom';
import { CheckCircle2, MapPin } from 'lucide-react';
import { HeroChip, PageHero } from '@/components/PageHero';
import { SectionHead, TourCard } from '@/components/PageCards';
import { PlanCard } from '@/components/PlanCard';
import { RouteMap } from '@/components/RouteMap';
import { usePageSubject, usePageTitle } from '@/context/PublicSiteContext';
import { useTours } from '@/hooks/useSiteContent';
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
              <p className="text-base font-light leading-relaxed text-[var(--text-primary)]/85 sm:text-lg">{t.fullDesc}</p>
            </div>

            {t.highlights.length > 0 && (
              <div className="rounded-2xl border border-[var(--border-strong)]/40 bg-[var(--background-secondary)] p-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">Journey Highlights</h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {t.highlights.map((h, i) => (
                    <li key={i} className="flex items-start space-x-2 text-sm text-[var(--text-primary)]/90">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {t.stops.length > 0 && (
              <Section name="TourRoute">
                <div>
                  <h2 className="mb-4 font-heading text-3xl font-bold text-[var(--brand-primary)]">The Route</h2>
                  <ol className="mb-4 flex flex-wrap gap-1.5" aria-label="Stops, in order">
                    {t.route.map((place, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="flex items-center space-x-1 rounded-lg border border-[var(--border-strong)]/40 bg-[var(--background-secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-primary)]">
                          <MapPin className="h-3 w-3 text-[var(--brand-primary)]" aria-hidden="true" />
                          <span>{place}</span>
                        </span>
                        {i < t.route.length - 1 && (
                          <span className="text-xs text-[var(--text-primary)]/30" aria-hidden="true">
                            →
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                  <div className="h-[380px] overflow-hidden rounded-3xl border border-[var(--border-strong)]/60 shadow-xl sm:h-[460px]">
                    <RouteMap stops={t.stops} />
                  </div>
                </div>
              </Section>
            )}

            {t.itinerary.length > 0 && (
              <div>
                <h2 className="mb-5 font-heading text-3xl font-bold text-[var(--brand-primary)]">Day-by-Day Itinerary</h2>
                <ol className="space-y-4">
                  {t.itinerary.map((day) => (
                    <li key={day.day} className="flex items-start space-x-4 rounded-2xl border border-[var(--border-strong)]/30 bg-[var(--surface)] p-5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--inverse-surface)] text-sm font-bold text-[var(--accent-text)]">
                        D{day.day}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-heading text-lg font-bold text-[var(--brand-primary)]">{day.title}</h3>
                          {day.location && (
                            <span className="rounded-full bg-[var(--brand-secondary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]">
                              {day.location}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-light leading-relaxed text-[var(--text-primary)]/80">{day.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <PlanCard
                priceFrom={t.priceFrom}
                title={`${t.days} days, your way`}
                text="Every itinerary is a starting point: dates, hotels and pace are tailored to you."
                cta="Book / Inquire This Tour"
              />
            </div>
          </aside>
        </div>
      </section>

      {tours.length > 1 && (
        <Section name="OtherTours">
          <section className="bg-[var(--background-secondary)] py-16 sm:py-20">
            <div className="te-container">
              <SectionHead eyebrow="Signature Itineraries" title="Other Journeys" />
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
