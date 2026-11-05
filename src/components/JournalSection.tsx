import { TravelImage } from '@/components/TravelImage';
import React from 'react';
import { Link } from 'react-router-dom';
import { useArticles } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import { SectionHead } from './PageCards';

/** One lead story beside its photo, then the rest as simple rows. */
export const JournalSection: React.FC = () => {
  const [lead, ...rest] = useArticles();
  if (!lead) return null;
  return (
    <section id="journal" className="te-ed-section">
      <div className="te-container">
        <SectionHead title="Latest stories" text="Guides, food and places, written from here." />

        <Link to={paths.article(lead.id)} className="te-card te-ed-row te-split">
          <div className="te-ed-photo">
            <TravelImage src={lead.image} alt={lead.title} sizes="(min-width: 900px) 58vw, 100vw" />
          </div>
          <div>
            <p className="te-ed-label">{lead.category}</p>
            <h3 className="te-ed-card__title font-heading">{lead.title}</h3>
            <p className="te-ed-card__text">{lead.snippet}</p>
            <p className="te-ed-meta mt-3">{lead.author.name}. {lead.date}. {lead.readTime}.</p>
          </div>
        </Link>

        {rest.length > 0 && (
          <ul className="te-ed-rows">
            {rest.map((art) => (
              <li key={art.id}>
                <Link to={paths.article(art.id)} className="te-card te-ed-row">
                  <div className="te-ed-photo">
                    <TravelImage src={art.image} alt={art.title} sizes="(min-width: 768px) 20vw, 40vw" />
                  </div>
                  <div>
                    <p className="te-ed-label">{art.category}</p>
                    <h3 className="te-ed-card__title font-heading">{art.title}</h3>
                    <p className="te-ed-meta mt-2">{art.date}. {art.readTime}.</p>
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
