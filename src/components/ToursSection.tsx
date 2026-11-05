import { TravelImage } from '@/components/TravelImage';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTours } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import { TourPackage } from '../types';

interface ToursSectionProps {
  onOpenInquiry: (tourTitle: string) => void;
  /** Shows the tour's route on the map (and scrolls there). */
  onViewRoute?: (tour: TourPackage) => void;
}

/** Each tour as a photo beside its text, swapping sides down the page. */
export const ToursSection: React.FC<ToursSectionProps> = ({ onOpenInquiry, onViewRoute }) => {
  const tours = useTours();
  return (
    <section id="tours" className="te-ed-section">
      <div className="te-container">
        <div className="te-section-header te-ed-head">
          <h2 className="te-ed-title font-heading">Routes around the island</h2>
          <p>Multi-day routes planned by local experts. Dates, hotels and pace can all change.</p>
        </div>

        <div className="te-tour-list">
          {tours.map((tour) => (
            <article key={tour.id} className="group te-card te-tour-row">
              <div className="te-ed-photo">
                <TravelImage src={tour.image} alt={tour.title} sizes="(min-width: 900px) 58vw, 100vw" />
              </div>
              <div>
                <p className="te-ed-label">{tour.category} tour</p>
                <h3 className="font-heading">{tour.title}</h3>
                <p className="te-ed-meta mt-2">{tour.days} days, {tour.days - 1} nights. From ${tour.priceFrom} USD.</p>
                <p className="te-tour-row__desc">{tour.shortDesc}</p>
                <p className="te-tour-row__route"><strong>Route:</strong> {tour.route.join(', ')}</p>
                <div className="te-ed-actions">
                  <Link to={paths.tour(tour.id)} className="te-button te-button--secondary te-button--sm">View Full Journey</Link>
                  <button type="button" onClick={() => onOpenInquiry(tour.title)} className="te-button te-button--primary te-button--sm">Inquire</button>
                  {onViewRoute && tour.stops.length > 0 && (
                    <button type="button" onClick={() => onViewRoute(tour)} className="te-ed-link">View route on map</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
