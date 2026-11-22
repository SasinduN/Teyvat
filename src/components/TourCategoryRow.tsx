import React from 'react';
import { Link } from 'react-router-dom';
import { TravelImage } from '@/components/TravelImage';
import { useTourCategories } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';

/**
 * `/tours`: the tour categories, each a link to its page (0030). From 768 px a grid of
 * photo tiles with the short intro under each photo; on phones a row to scroll sideways,
 * photo and name only. The text sits under the photo on the page's own colours, so it
 * holds AA over any photo. On phones the row stops short of the floating buttons' column
 * (editorial.css), so they never cover a tile. Nothing here is in `AVOID`.
 */
export const TourCategoryRow: React.FC = () => {
  const categories = useTourCategories();
  if (categories.length === 0) return null;
  return (
    <section className="te-ed-section te-cat-section" aria-labelledby="tour-categories-title">
      <div className="te-container">
        <div className="te-section-header te-ed-head">
          <h2 id="tour-categories-title" className="te-ed-title font-heading">Tours by travel style</h2>
          <p>Pick a style to see its tours, or scroll down for all of them.</p>
        </div>
        <ul className="te-cat-list" aria-label="Tour categories" data-tour-categories>
          {categories.map((category) => (
            <li key={category.id} className="te-cat-item">
              <Link to={paths.tourCategory(category.id)} className="te-cat-tile" data-category={category.id}>
                <span className="te-ed-photo te-cat-tile__photo">
                  {category.image && (
                    <TravelImage
                      src={category.image}
                      alt=""
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 9.5rem"
                    />
                  )}
                </span>
                <span className="te-cat-tile__name font-heading">{category.name}</span>
                <span className="te-cat-tile__intro">{category.shortIntro}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
