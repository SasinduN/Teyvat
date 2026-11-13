import { useParams } from 'react-router-dom';
import { categoryLabel } from '@/lib/categories';
import { HeroChip, PageHero } from '@/components/PageHero';
import { DestinationCard, ExperienceCard, SectionHead } from '@/components/PageCards';
import { PlanCard } from '@/components/PlanCard';
import { SaveButton } from '@/components/SaveButton';
import { usePageSubject, usePageTitle } from '@/context/PublicSiteContext';
import { useDestinations, useFeaturedExperiences } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import type { Destination, ExperienceItem } from '@/types';
import { NotFoundPage } from './NotFoundPage';
import { Section } from './Section';

/** `/experiences/:slug`: one featured experience. */
export function ExperiencePage() {
  const { slug } = useParams();
  const experience = useFeaturedExperiences().find((e) => e.id === slug);
  if (!experience) return <NotFoundPage />;
  return <ExperienceView key={experience.id} e={experience} />;
}

/**
 * The destination an experience happens at, when its location names one
 * ("Ella, Uva Province" names Ella). The longest name wins, so "Galle Fort"
 * beats "Galle".
 */
function whereItHappens(e: ExperienceItem, destinations: Destination[]): Destination | undefined {
  const location = e.location.toLowerCase();
  return destinations
    .filter((d) => location.includes(d.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0];
}

function ExperienceView({ e }: { e: ExperienceItem }) {
  usePageTitle(e.title);
  usePageSubject({
    // The subject the home page's experience cards have always used.
    inquiry: `Experience: ${e.title} (${e.location})`,
    whatsapp: { kind: 'experience', id: e.id, title: e.title }
  });
  const all = useFeaturedExperiences();
  const where = whereItHappens(e, useDestinations());

  const facts: [string, string][] = [
    ['Duration', e.duration],
    ['Best time', e.recommendedTime ?? 'Year-round'],
    ['Location', e.location],
    ['Category', categoryLabel(e.category)]
  ];

  return (
    <>
      <PageHero
        image={e.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Experiences', to: paths.experiences }, { label: e.title }]}
        chips={
          <>
            <HeroChip>{categoryLabel(e.category)}</HeroChip>
          </>
        }
        eyebrow={e.location}
        title={e.title}
        subtitle={e.subtitle}
        actions={<SaveButton kind="experience" id={e.id} name={e.title} />}
      />

      <section className="py-14 sm:py-20">
        <div className="te-container grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="space-y-12 lg:col-span-8">
            <dl className="te-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-bold text-[var(--brand-primary)]">The Experience</h2>
              <p className="te-prose text-[var(--text-primary)]/85">{e.description}</p>
            </div>

            {e.highlights.length > 0 && (
              <div>
                <h2 className="mb-4 font-heading text-2xl font-bold text-[var(--brand-primary)]">Highlights</h2>
                <ul className="te-plain-list te-plain-list--2">
                  {e.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {where && (
              <div>
                <h2 className="mb-4 font-heading text-2xl font-bold text-[var(--brand-primary)]">Where It Happens</h2>
                <div className="max-w-md">
                  <DestinationCard dest={where} />
                </div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <PlanCard
                title="Add this to your trip"
                text="We'll fit it into a journey around the rest of your plans, with the right guide and the right time of day."
                cta="Enquire About This Experience"
              />
            </div>
          </aside>
        </div>
      </section>

      {all.length > 1 && (
        <Section name="MoreExperiences">
          <section className="bg-[var(--background-secondary)] py-16 sm:py-20">
            <div className="te-container">
              <SectionHead title="More to do" />
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {all
                  .filter((x) => x.id !== e.id)
                  .slice(0, 3)
                  .map((x) => (
                    <ExperienceCard key={x.id} item={x} />
                  ))}
              </div>
            </div>
          </section>
        </Section>
      )}
    </>
  );
}
