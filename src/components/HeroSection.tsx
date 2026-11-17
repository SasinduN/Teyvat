import { TravelImage } from '@/components/TravelImage';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBrand, useFeatures, useHeroSlides, useSiteSettings } from '@/hooks/useSiteContent';
import { RIDE_SLIDE_COPY, RIDE_SLIDE_IMAGE_SIZE, withRideSlide } from '@shared/ride-slide';
import { heroHeadlineParts } from '@shared/brand';
import { SiteLink } from './SiteLink';
import { paths } from '@shared/site-paths';

export const HeroSection: React.FC = () => {
  const photos = useHeroSlides();
  // Bookings on: the "Book a ride" slide second, and its button among the fixed ones (shared/ride-slide.ts).
  const { bookings } = useFeatures();
  const HERO_IMAGES = useMemo(() => withRideSlide(photos, bookings), [photos, bookings]);
  const brand = useBrand();
  // Admin → Settings → Home page headline, or the tagline.
  const headline = heroHeadlineParts(useSiteSettings().heroHeadline ?? brand.tagline);
  const slideSources = HERO_IMAGES.map(slide => slide.url).join('\n');
  const [currentBg, setCurrentBg] = useState(0);
  const [seenSlides, setSeenSlides] = useState(() => new Set([0]));
  const [readySlides, setReadySlides] = useState<Set<number>>(() => new Set());
  const [requestedSlide, setRequestedSlide] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (heroRef.current) observer.observe(heroRef.current);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);

  useEffect(() => {
    // The slide count comes from the database, so restart from the first
    // slide whenever it changes, and don't cycle through zero slides.
    if (HERO_IMAGES.length < 2 || paused || hovered || focused || reducedMotion || !visible || !documentVisible) return;
    const timer = setInterval(() => {
      setCurrentBg(prev => {
        const next = (prev + 1) % HERO_IMAGES.length;
        return readySlides.has(next) ? next : prev;
      });
    }, 7000);
    return () => clearInterval(timer);
  }, [HERO_IMAGES.length, paused, hovered, focused, reducedMotion, visible, documentVisible, readySlides]);

  useEffect(() => {
    setCurrentBg(0); setSeenSlides(new Set([0])); setRequestedSlide(null);
    // A cached photo can load before this reset effect. Its load event will
    // not fire again when Previous returns to it, so retain verified readiness.
    const sources = slideSources.split('\n');
    const ready = new Set<number>();
    heroRef.current?.querySelectorAll('.te-hero-slide').forEach((slide, index) => {
      const image = slide.querySelector('img');
      if (image?.complete && image.naturalWidth > 0 && image.getAttribute('src') === sources[index]) ready.add(index);
    });
    setReadySlides(ready);
  }, [slideSources]);
  useEffect(() => { setSeenSlides(previous => new Set([...previous, currentBg])); }, [currentBg]);
  useEffect(() => {
    if (HERO_IMAGES.length < 2 || !visible || !documentVisible || reducedMotion || paused || !readySlides.has(currentBg)) return;
    // One slide ahead, only after the current photograph has finished loading.
    const next = (currentBg + 1) % HERO_IMAGES.length;
    // After a pause, so the first photograph and the page's code load first (the slide changes at 7 s).
    const timer = window.setTimeout(() => {
      setSeenSlides(previous => previous.has(next) ? previous : new Set([...previous, next]));
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [HERO_IMAGES.length, currentBg, readySlides, visible, documentVisible, reducedMotion, paused]);

  const rideActive = 'ride' in (HERO_IMAGES[currentBg] ?? {});

  const showSlide = (index: number) => {
    setSeenSlides(previous => new Set([...previous, index]));
    if (readySlides.has(index)) { setCurrentBg(index); setRequestedSlide(null); }
    else setRequestedSlide(index);
  };
  useEffect(() => {
    if (requestedSlide !== null && readySlides.has(requestedSlide)) {
      setCurrentBg(requestedSlide);
      setRequestedSlide(null);
    }
  }, [requestedSlide, readySlides]);

  return (
    <section ref={heroRef} id="hero" aria-busy={requestedSlide !== null} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} className="te-hero relative w-full flex items-center justify-center overflow-hidden bg-[var(--inverse-surface)]">
      {/* Background Image Carousel with Smooth Crossfade */}
      {HERO_IMAGES.map((bg, idx) => (
        <div
          key={bg.url} aria-hidden={idx !== currentBg} data-active={idx === currentBg}
          className={'ride' in bg ? 'te-hero-slide te-hero-slide--ride' : 'te-hero-slide'}
        >
          {seenSlides.has(idx) && 'ride' in bg && <img className="te-hero-ride-art" src={bg.url} alt="" {...RIDE_SLIDE_IMAGE_SIZE}
            onLoad={() => setReadySlides(previous => previous.has(idx) ? previous : new Set([...previous, idx]))} />}
          {seenSlides.has(idx) && !('ride' in bg) && <TravelImage fullWidth loading="eager" fetchPriority={idx === currentBg ? 'high' : 'low'} sizes="100vw"
            onLoad={() => setReadySlides(previous => previous.has(idx) ? previous : new Set([...previous, idx]))}
            src={bg.url}
            alt={bg.title}
            className="w-full h-full object-cover object-center"
          />}
        </div>
      ))}

      {/* Photo-preserving contrast overlay */}
      <div className="te-hero-overlay absolute inset-0" />

      {/* Hero Content */}
      <div className="te-hero-content te-container relative z-20 text-white">
        <div className="te-hero-copy">
          {/* Main Title */}
          <h1
            className="te-hero-title font-heading text-4xl font-bold tracking-tight text-white leading-[1.1] mb-6 drop-shadow-md"
          >
            {headline.lead && <>{headline.lead} <br className="hidden sm:inline" /></>}
            <span className="te-hero-emphasis font-heading">
              {headline.emphasis}
            </span>
          </h1>

          {/* Supporting Subtitle */}
          {bookings ? (
            // Both lines in one cell, so the copy keeps its height as the slides change.
            <p className="te-hero-subtitle te-hero-subtitle--stack text-lg text-white/90 leading-relaxed mb-10 text-shadow">
              <span data-active={!rideActive}>Tea country, ancient cities, leopards and surf, all on one island.</span>
              <span data-active={rideActive} data-hero-ride-line><strong>{RIDE_SLIDE_COPY.headline}</strong> {RIDE_SLIDE_COPY.line}</span>
            </p>
          ) : (
          <p
            className="te-hero-subtitle text-lg text-white/90 leading-relaxed mb-10 text-shadow"
          >
            Tea country, ancient cities, leopards and surf, all on one island.
          </p>
          )}

          {/* Action Buttons */}
          <div
            className="te-hero-actions te-cta-group flex flex-col sm:flex-row items-center gap-4"
          >
            {/* Bookings on: on phones (stacked buttons) "Book a ride" takes Explore's place; the
                header's Discover → Explore map still goes there (docs/plans/ride-vehicle-picker.md, part 9). */}
            <SiteLink to={paths.explore}
              className={`te-button te-button--secondary te-button--lg w-full sm:w-auto group${bookings ? ' te-hero-action--wide-only' : ''}`}
            >
              <span>Explore Sri Lanka</span>
            </SiteLink>

            <SiteLink to={paths.plan}
              className={`te-button ${rideActive ? 'te-button--secondary' : 'te-button--primary'} te-button--lg w-full sm:w-auto`}
            >
              <span>Plan Your Journey</span>
            </SiteLink>

            {bookings && <SiteLink to={paths.booking} data-hero-booking
              className={`te-button ${rideActive ? 'te-button--primary' : 'te-button--secondary'} te-button--lg w-full sm:w-auto`}
            >
              <span>{RIDE_SLIDE_COPY.button}</span>
            </SiteLink>}
          </div>

        </div>
      </div>

      {HERO_IMAGES.length > 1 && <div className="te-hero-controls" role="group" aria-label="Featured destinations" data-keep-clear>
        <button className="te-button te-button--icon" type="button" aria-label="Previous featured destination" onClick={() => showSlide(((requestedSlide ?? currentBg) - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <button className="te-button te-button--icon" type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Resume slideshow" : "Pause slideshow"} aria-pressed={paused}>
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
        <button className="te-button te-button--icon" type="button" aria-label="Next featured destination" onClick={() => showSlide(((requestedSlide ?? currentBg) + 1) % HERO_IMAGES.length)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>}

    </section>
  );
};
