import { TravelImage } from '@/components/TravelImage';
import { useDestinations } from '@/hooks/useSiteContent';

/** `/about`: who we are, beside one photo. The numbers sit below it, in `StatStrip`. */
export function IntroSection() {
  const destinations = useDestinations();
  const photo = destinations.find((destination) => destination.id === 'ella')?.image ?? destinations[0]?.image;
  return (
    <section id="about" className="te-ed-section">
      <div className="te-container te-split">
        {photo && (
          <div className="te-ed-photo">
            <TravelImage src={photo} alt="Ella" sizes="(min-width: 900px) 58vw, 100vw" />
          </div>
        )}
        <div className="te-reading-column">
          <h2 className="te-ed-title font-heading">A small island that changes fast</h2>
          <p className="te-ed-lead">
            Tea country, ancient cities and surf beaches can all fit in one trip. The hard part is the order: which road,
            which season, how long to stay.
          </p>
          <p className="te-ed-lead">
            That is what we plan. Tell us what you want to see, and we will draft a route with hotels, drivers and guides.
          </p>
        </div>
      </div>
    </section>
  );
}
