import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Plane, Sparkles, Star } from 'lucide-react';
import { HeroChip, PageHero } from '@/components/PageHero';
import { DestinationCard, SectionHead, TourCard } from '@/components/PageCards';
import { PlanCard } from '@/components/PlanCard';
import { usePageSubject, usePageTitle } from '@/context/PublicSiteContext';
import { useDestinations, useTours } from '@/hooks/useSiteContent';
import { airportTravelTime, googleMapsUrl } from '@/lib/googleMaps';
import { pageTitle } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import type { Destination } from '@/types';
import { NotFoundPage } from './NotFoundPage';
import { Section } from './Section';

/** `/destinations/:slug`: what the destination modal showed, as a page. */
export function DestinationPage() {
  const { slug } = useParams();
  const destination = useDestinations().find((d) => d.id === slug);
  if (!destination) return <NotFoundPage />;
  // Keyed, so moving between destinations starts each with its own photo.
  return <DestinationView key={destination.id} d={destination} />;
}

function DestinationView({ d }: { d: Destination }) {
  usePageTitle(pageTitle(d.name));
  usePageSubject({ inquiry: d.name, whatsapp: { kind: 'destination', id: d.id, name: d.name } });
  const all = useDestinations();
  const tours = useTours();
  const [photo, setPhoto] = useState(d.image);

  const photos = [d.image, ...(d.gallery ?? [])];
  const through = tours.filter((t) => t.stops.some((s) => s.destinationId === d.id));
  // Same region first, then the rest, in the site's order.
  const more = [
    ...all.filter((x) => x.id !== d.id && x.region === d.region),
    ...all.filter((x) => x.region !== d.region)
  ].slice(0, 3);

  return (
    <>
      <PageHero
        image={photo}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Destinations', to: paths.destinations }, { label: d.name }]}
        chips={
          <>
            <HeroChip gold>
              <Star className="h-3.5 w-3.5 fill-[var(--accent)]" aria-hidden="true" /> {d.rating}
            </HeroChip>
            <HeroChip>{d.region} Region</HeroChip>
          </>
        }
        eyebrow={d.province}
        title={d.name}
        subtitle={d.shortDescription}
      />

      {photos.length > 1 && (
        <div className="border-b border-[var(--border-strong)]/40 bg-[var(--background-secondary)]">
          <div className="te-container no-scrollbar flex gap-3 overflow-x-auto py-4">
            {photos.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPhoto(img)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                aria-pressed={photo === img}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                  photo === img ? 'border-[var(--inverse-surface)]' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="py-14 sm:py-20">
        <div className="te-container grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="space-y-12 lg:col-span-8">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-bold text-[var(--brand-primary)]">About {d.name}</h2>
              <p className="text-base font-light leading-relaxed text-[var(--text-primary)]/85 sm:text-lg">{d.longDescription}</p>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-5 rounded-2xl border border-[var(--border-strong)]/40 bg-[var(--surface)] p-6 sm:grid-cols-3">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">Best Visiting Season</span>
                  <span className="text-sm font-semibold text-[var(--brand-primary)]">{d.bestTime}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">Elevation / Terrain</span>
                  <span className="text-sm font-semibold text-[var(--brand-primary)]">{d.elevation || d.region}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">Ideal Travel For</span>
                  <span className="text-sm font-semibold text-[var(--brand-primary)]">{d.idealFor.join(', ')}</span>
                </div>
              </div>

              {/* Google Maps, and the travel time from the airport when set */}
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <a
                  href={googleMapsUrl(d.latitude, d.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-primary)] underline-offset-2 hover:text-[var(--brand-primary)] hover:underline"
                  data-google-maps
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                {d.travelTimeFromAirport && (
                  <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)]/70" data-travel-time>
                    <Plane className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden="true" />
                    <span>{airportTravelTime(d.travelTimeFromAirport)}</span>
                  </span>
                )}
              </div>
            </div>

            {d.experiences.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center space-x-2 font-heading text-2xl font-bold text-[var(--brand-primary)]">
                  <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
                  <span>Must-Do Experiences in {d.name}</span>
                </h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {d.experiences.map((exp, i) => (
                    <li key={i} className="flex items-start space-x-3 rounded-xl border border-[var(--border-strong)]/40 bg-[var(--background-secondary)] p-4">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
                      <span className="text-sm font-semibold text-[var(--brand-primary)]">{exp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {d.highlights.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">Key Highlights</h2>
                <ul className="flex flex-wrap gap-2">
                  {d.highlights.map((h, i) => (
                    <li key={i} className="rounded-full bg-[var(--inverse-surface)] px-3 py-1 text-xs font-semibold text-[var(--accent-text)]">
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <PlanCard
                title={`Plan a trip to ${d.name}`}
                text={`Tailored hotels, private guides and transfers for ${d.name}, arranged by a local expert.`}
                cta={`Plan A Trip to ${d.name}`}
              />
            </div>
          </aside>
        </div>
      </section>

      {through.length > 0 && (
        <Section name="ToursThrough">
          <section className="bg-[var(--background-secondary)] py-16 sm:py-20">
            <div className="te-container">
              <SectionHead eyebrow="Signature Itineraries" title={`Tours Through ${d.name}`} />
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {through.map((t) => (
                  <TourCard key={t.id} tour={t} />
                ))}
              </div>
            </div>
          </section>
        </Section>
      )}

      {more.length > 0 && (
        <Section name="MoreDestinations">
          <section className="py-16 sm:py-20">
            <div className="te-container">
              <SectionHead eyebrow="Keep Exploring" title="More Places to Discover" />
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {more.map((x) => (
                  <DestinationCard key={x.id} dest={x} />
                ))}
              </div>
            </div>
          </section>
        </Section>
      )}
    </>
  );
}
