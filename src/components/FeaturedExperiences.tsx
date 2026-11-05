import { TravelImage } from '@/components/TravelImage';
import React from 'react';
import { Link } from 'react-router-dom';
import { useFeaturedExperiences } from '@/hooks/useSiteContent';
import { categoryLabel } from '@/lib/categories';
import { paths } from '@shared/site-paths';
import { SectionHead } from './PageCards';

/** One lead experience beside its photo, then the rest as simple rows. */
export const FeaturedExperiences: React.FC = () => {
  const [lead, ...rest] = useFeaturedExperiences();
  if (!lead) return null;
  return (
    <section className="te-ed-section">
      <div className="te-container">
        <SectionHead title="What to do here" text="Hikes, safaris and evenings on the coast. Each one links to the details." />

        <Link to={paths.experience(lead.id)} className="te-card te-ed-row te-split">
          <div className="te-ed-photo">
            <TravelImage src={lead.image} alt={lead.title} sizes="(min-width: 900px) 58vw, 100vw" />
          </div>
          <div>
            <p className="te-ed-label">{lead.location}</p>
            <h3 className="te-ed-card__title font-heading">{lead.title}</h3>
            <p className="te-ed-card__text">{lead.subtitle}</p>
            <p className="te-ed-card__text">{lead.description}</p>
            <p className="te-ed-meta mt-3">{lead.duration}. {categoryLabel(lead.category)}.</p>
          </div>
        </Link>

        {rest.length > 0 && (
          <ul className="te-ed-rows">
            {rest.map((item) => (
              <li key={item.id}>
                <Link to={paths.experience(item.id)} className="te-card te-ed-row">
                  <div className="te-ed-photo">
                    <TravelImage src={item.image} alt={item.title} sizes="(min-width: 768px) 20vw, 40vw" />
                  </div>
                  <div>
                    <p className="te-ed-label">{item.location}</p>
                    <h3 className="te-ed-card__title font-heading">{item.title}</h3>
                    <p className="te-ed-card__text">{item.subtitle}</p>
                    <p className="te-ed-meta mt-2">{item.duration}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
