import { TravelImage } from '@/components/TravelImage';
import { useDestinations, usePillars } from '@/hooks/useSiteContent';

/**
 * How we plan: the pillars as a numbered list, beside a photo. `pillars.icon` stays in
 * the database and the admin; the public site no longer shows it.
 */
export function WhyUs() {
  const pillars = usePillars();
  const destinations = useDestinations();
  const photo = destinations.find((destination) => destination.id === 'sigiriya')?.image ?? destinations[0]?.image;
  if (pillars.length === 0) return null;
  return (
    <section className="te-ed-section te-ed-section--tint">
      <div className="te-container te-split te-split--flip">
        {photo && (
          <div className="te-ed-photo te-ed-photo--tall">
            <TravelImage src={photo} alt="Sigiriya" sizes="(min-width: 900px) 42vw, 100vw" />
          </div>
        )}
        <div>
          <h2 className="te-ed-title font-heading">How we plan</h2>
          <ol className="te-numbered mt-6">
            {pillars.map((pillar) => (
              <li key={pillar.title}>
                <div>
                  <h3 className="font-heading">{pillar.title}</h3>
                  <p>{pillar.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
