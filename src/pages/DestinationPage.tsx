import { TravelImage } from '@/components/TravelImage';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Plane } from 'lucide-react';
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
            <HeroChip>Rated {d.rating}</HeroChip>
            <HeroChip>{d.region} region</HeroChip>
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
                <TravelImage src={img} alt={d.name} className="h-full w-full object-cover" />
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
              <p className="te-prose text-[var(--text-primary)]/85">{d.longDescription}</p>
            </div>

            <div>
              <dl className="te-facts">
                <div><dt>Best season</dt><dd>{d.bestTime}</dd></div>
                <div><dt>Elevation or terrain</dt><dd>{d.elevation || d.region}</dd></div>
                <div><dt>Good for</dt><dd>{d.idealFor.join(', ')}</dd></div>
              </dl>

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
                <h2 className="mb-4 font-heading text-2xl font-bold text-[var(--brand-primary)]">What to do in {d.name}</h2>
                <ul className="te-plain-list te-plain-list--2">
                  {d.experiences.map((exp, i) => (
                    <li key={i}>{exp}</li>
                  ))}
                </ul>
              </div>
            )}

            {d.highlights.length > 0 && (
              <div>
                <h2 className="mb-4 font-heading text-2xl font-bold text-[var(--brand-primary)]">Worth seeing</h2>
                <ul className="te-plain-list te-plain-list--2">
                  {d.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <PlanCard
                title={`Plan a trip to ${d.name}`}
                text={`Hotels, a private guide and transfers for ${d.name}, arranged by someone local.`}
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
              <SectionHead title={`Tours through ${d.name}`} />
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
              <SectionHead title="Nearby and similar places" />
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
