import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { DestinationCard, ExperienceCard, TourCard } from '@/components/PageCards';
import { PageHero } from '@/components/PageHero';
import { usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { useDestinations, useFeaturedExperiences, useHeroSlides, useTours } from '@/hooks/useSiteContent';
import { focusPageHeading } from '@/lib/routeFocus';
import { useWishlist } from '@/lib/wishlist';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { wishlistMessage, wishlistSubject, type WishlistItem } from '@shared/wishlist';

const PRIVACY = 'Your list stays in this browser. We only see it if you send it to us.';

/**
 * `/wishlist`: what the visitor saved, by type. Never indexed (the server's noindex).
 * Items the site no longer publishes aren't in `useWishlist().items`, so they just
 * don't appear. Sending the list uses the same enquiry form as everywhere else.
 */
export function WishlistPage() {
  usePageTitle(PAGE_TITLES.wishlist);
  const { available, items, remove, clear } = useWishlist();
  const { openInquiry } = usePublicSite();
  const slides = useHeroSlides();
  const destinations = useDestinations();
  const experiences = useFeaturedExperiences();
  const tours = useTours();

  const listRef = useRef<HTMLDivElement>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const has = (kind: WishlistItem['kind'], id: string) => items.some((item) => item.kind === kind && item.id === id);
  const savedDestinations = destinations.filter((row) => has('destination', row.id));
  const savedExperiences = experiences.filter((row) => has('experience', row.id));
  const savedTours = tours.filter((row) => has('tour', row.id));

  const removeItem = (item: WishlistItem, name: string) => {
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-wishlist-remove]') ?? [])];
    const at = buttons.findIndex((button) => button.dataset.wishlistRemove === `${item.kind}:${item.id}`);
    remove(item);
    setAnnouncement(`${name} removed. ${items.length - 1} saved.`);
    // Focus was on the button that just went: the next one along, or the heading.
    requestAnimationFrame(() => {
      const rest = listRef.current?.querySelectorAll<HTMLButtonElement>('[data-wishlist-remove]');
      const next = rest?.[Math.min(at, rest.length - 1)];
      if (next) next.focus();
      else focusPageHeading();
    });
  };

  const clearAll = () => {
    clear();
    setConfirmingClear(false);
    setAnnouncement('Your wishlist is empty.');
    requestAnimationFrame(focusPageHeading);
  };

  const keepAll = () => {
    setConfirmingClear(false);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>('[data-wishlist-clear]')?.focus());
  };

  const sendEnquiry = () =>
    openInquiry(
      wishlistSubject(items.length),
      wishlistMessage([
        { heading: 'Destinations', names: savedDestinations.map((row) => row.name) },
        { heading: 'Experiences', names: savedExperiences.map((row) => row.title) },
        { heading: 'Tours', names: savedTours.map((row) => row.title) }
      ])
    );

  const removeButton = (item: WishlistItem, name: string) => (
    <button
      type="button"
      className="te-ed-link"
      aria-label={`Remove ${name}`}
      data-wishlist-remove={`${item.kind}:${item.id}`}
      onClick={() => removeItem(item, name)}
    >
      Remove
    </button>
  );

  return (
    <>
      <PageHero
        compact
        image={slides[0]?.url}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Wishlist' }]}
        title="Your wishlist"
        subtitle={PAGE_DESCRIPTIONS.wishlist}
      />
      <p role="status" className="sr-only">{announcement}</p>

      {!available ? (
        <section className="te-ed-section" data-wishlist-blocked>
          <div className="te-container">
            <div className="te-reading-column">
              <h2 className="te-ed-title font-heading">Saving isn't available here</h2>
              <p className="te-ed-lead">
                This browser is blocking site storage, and that's where a wishlist is kept. You can still see everything and send us an enquiry.
              </p>
              <div className="te-ed-actions">
                <Link to={paths.destinations} className="te-button te-button--primary">Browse destinations</Link>
                <Link to={paths.tours} className="te-ed-link">See tours</Link>
              </div>
            </div>
          </div>
        </section>
      ) : items.length === 0 ? (
        <section className="te-ed-section" data-wishlist-empty>
          <div className="te-container">
            <div className="te-reading-column">
              <h2 className="te-ed-title font-heading">Nothing saved yet</h2>
              <p className="te-ed-lead">
                Press Save on any place, experience or tour and it will wait for you here.
              </p>
              <p className="te-ed-lead">{PRIVACY}</p>
              <div className="te-ed-actions">
                <Link to={paths.destinations} className="te-button te-button--primary">Browse destinations</Link>
                <Link to={paths.tours} className="te-ed-link">See tours</Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div ref={listRef}>
          <section className="te-ed-section te-ed-section--tint" aria-label="Your saved items, and what to do with them">
            <div className="te-container">
              <p className="te-wishlist-count">{items.length} saved</p>
              <p className="te-ed-meta mt-1">{PRIVACY}</p>
              <div className="te-ed-actions">
                <button type="button" className="te-button te-button--primary" data-keep-clear data-wishlist-send onClick={sendEnquiry}>
                  Send my wishlist as an enquiry
                </button>
                {confirmingClear ? (
                  <span className="te-wishlist-confirm">
                    <span>Remove all {items.length}?</span>
                    <button type="button" className="te-ed-link" data-wishlist-clear-yes onClick={clearAll}>Yes, clear all</button>
                    <button type="button" className="te-ed-link" data-wishlist-clear-no autoFocus onClick={keepAll}>Keep them</button>
                  </span>
                ) : (
                  <button type="button" className="te-ed-link" data-wishlist-clear onClick={() => setConfirmingClear(true)}>Clear all</button>
                )}
              </div>
            </div>
          </section>

          {savedDestinations.length > 0 && (
            <section className="te-ed-section" data-wishlist-group="destination">
              <div className="te-container">
                <h2 className="te-ed-title font-heading mb-6">Destinations</h2>
                <ul className="te-wishlist-grid">
                  {savedDestinations.map((row) => (
                    <li key={row.id}>
                      <DestinationCard dest={row} saveable={false} />
                      {removeButton({ kind: 'destination', id: row.id }, row.name)}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {savedExperiences.length > 0 && (
            <section className="te-ed-section" data-wishlist-group="experience">
              <div className="te-container">
                <h2 className="te-ed-title font-heading mb-6">Experiences</h2>
                <ul className="te-wishlist-grid">
                  {savedExperiences.map((row) => (
                    <li key={row.id}>
                      <ExperienceCard item={row} saveable={false} />
                      {removeButton({ kind: 'experience', id: row.id }, row.title)}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {savedTours.length > 0 && (
            <section className="te-ed-section" data-wishlist-group="tour">
              <div className="te-container">
                <h2 className="te-ed-title font-heading mb-6">Tours</h2>
                <ul className="te-wishlist-grid">
                  {savedTours.map((row) => (
                    <li key={row.id}>
                      <TourCard tour={row} saveable={false} />
                      {removeButton({ kind: 'tour', id: row.id }, row.title)}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
