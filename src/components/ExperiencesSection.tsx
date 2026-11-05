import { TravelImage } from '@/components/TravelImage';
import React from 'react';
import { Link } from 'react-router-dom';
import { useExperienceCategories } from '@/hooks/useSiteContent';
import { CategoryType } from '../types';
import { SectionHead } from './PageCards';

interface ExperiencesSectionProps {
  /** On the home page: a card filters the map. */
  onSelectCategory?: (category: CategoryType) => void;
  /** On /experiences: a card links here instead (the filtered destinations list). */
  categoryHref?: (category: CategoryType) => string;
}

/** The kinds of trip, as an asymmetric grid of photos with captions under them. */
export const ExperiencesSection: React.FC<ExperiencesSectionProps> = ({ onSelectCategory, categoryHref }) => {
  const categories = useExperienceCategories();
  return (
    <section id="experiences" className="te-ed-section te-ed-section--tint">
      <div className="te-container">
        <SectionHead title="Choose by kind of trip" text="Pick one to see the places that suit it." />
        <div className="te-mosaic">
          {categories.map((exp) => {
            const caption = (
              <>
                <span className="te-ed-photo block">
                  <TravelImage src={exp.image} alt={exp.title} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                </span>
                <span className="te-ed-card__body block">
                  <h3 className="te-ed-card__title font-heading">{exp.title}</h3>
                  <span className="te-ed-card__text block">{exp.subtitle}</span>
                </span>
              </>
            );
            return categoryHref ? (
              <Link key={exp.id} to={categoryHref(exp.category)} className="te-card te-ed-card">{caption}</Link>
            ) : (
              <button key={exp.id} type="button" onClick={() => onSelectCategory?.(exp.category)} className="te-card te-ed-card">{caption}</button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
