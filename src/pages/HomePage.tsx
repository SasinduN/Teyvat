import { useEffect, useState } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { QuickSearch } from '@/components/QuickSearch';
import { IntroSection } from '@/components/IntroSection';
import { InteractiveMapSection } from '@/components/InteractiveMapSection';
import { DestinationSpotlight } from '@/components/DestinationSpotlight';
import { ExperiencesSection } from '@/components/ExperiencesSection';
import { FeaturedExperiences } from '@/components/FeaturedExperiences';
import { ToursSection } from '@/components/ToursSection';
import { TravelPlanner } from '@/components/TravelPlanner';
import { WhyTravelEye } from '@/components/WhyTravelEye';
import { HiddenGemsSection } from '@/components/HiddenGemsSection';
import { PhotoStorySection } from '@/components/PhotoStorySection';
import { JournalSection } from '@/components/JournalSection';
import { CTASection } from '@/components/CTASection';
import { usePageSubject, usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { goToSection } from '@/lib/routeFocus';
import { HOME_TITLE } from '@shared/page-meta';
import { CategoryType, TourPackage } from '@/types';
import { Section } from './Section';

/** The home page: the approved one-page design, section by section. */
export function HomePage() {
  usePageTitle(HOME_TITLE);
  const { openInquiry } = usePublicSite();

  const [activeFilterForMap, setActiveFilterForMap] = useState<CategoryType | 'All'>('All');
  const [selectedWhereForMap, setSelectedWhereForMap] = useState<string>('All');
  // The tour whose route the map is showing ("View route on map"), if any.
  const [routeTour, setRouteTour] = useState<TourPackage | null>(null);
  const mapOnScreen = useMapOnScreen();

  // While a route is on the map in view, the WhatsApp message names that tour.
  usePageSubject(
    routeTour && mapOnScreen
      ? { whatsapp: { kind: 'tour', id: routeTour.id, title: routeTour.title } }
      : null
  );

  const scrollToSection = (sectionId: string) => {
    goToSection(sectionId);
  };

  // Quick Search Submission Handler
  const handleQuickSearch = (where: string, experience: CategoryType | 'All', _timing: string) => {
    // Choosing a filter leaves route mode.
    setRouteTour(null);
    setSelectedWhereForMap(where);
    setActiveFilterForMap(experience);
    scrollToSection('explore-map');
  };

  // Category Selection Handler from Experiences Section
  const handleSelectCategory = (category: CategoryType) => {
    setRouteTour(null);
    setActiveFilterForMap(category);
    scrollToSection('explore-map');
  };

  return (
    <>
      {/* Full-screen Hero Section */}
      <Section name="HeroSection">
        <HeroSection
          onExploreClick={() => scrollToSection('explore-map')}
          onPlanClick={() => scrollToSection('planner')}
        />
      </Section>

      {/* Floating Quick Search Discovery Bar */}
      <Section name="QuickSearch">
        <QuickSearch onSearchSubmit={handleQuickSearch} />
      </Section>

      {/* Introduction Section */}
      <Section name="IntroSection">
        <IntroSection />
      </Section>

      {/* Signature Feature: Interactive Sri Lanka Map */}
      <Section name="InteractiveMapSection">
        <InteractiveMapSection
          activeFilterFromParent={activeFilterForMap}
          selectedWhereFromParent={selectedWhereForMap}
          routeTour={routeTour}
          onClearRoute={() => setRouteTour(null)}
        />
      </Section>

      {/* Destination Spotlight Cards */}
      <Section name="DestinationSpotlight">
        <DestinationSpotlight />
      </Section>

      {/* Experience Types Section */}
      <Section name="ExperiencesSection">
        <ExperiencesSection onSelectCategory={handleSelectCategory} />
      </Section>

      {/* Featured Unforgettable Moments */}
      <Section name="FeaturedExperiences">
        <FeaturedExperiences />
      </Section>

      {/* Multi-Day Tours Section */}
      <Section name="ToursSection">
        <ToursSection
          onOpenInquiry={openInquiry}
          onViewRoute={(tour) => {
            setRouteTour(tour);
            scrollToSection('explore-map');
          }}
        />
      </Section>

      {/* Interactive Travel Journey Planner */}
      <Section name="TravelPlanner">
        <TravelPlanner onSavePlan={(planName) => openInquiry(`Saved Plan: ${planName}`)} />
      </Section>

      {/* Why Travel Eye Pillars */}
      <Section name="WhyTravelEye">
        <WhyTravelEye />
      </Section>

      {/* Hidden Gems Editorial Collection */}
      <Section name="HiddenGemsSection">
        <HiddenGemsSection onOpenInquiry={openInquiry} />
      </Section>

      {/* Photography Stories Gallery */}
      <Section name="PhotoStorySection">
        <PhotoStorySection />
      </Section>

      {/* Travel Eye Journal */}
      <Section name="JournalSection">
        <JournalSection />
      </Section>

      {/* Cinematic Sunset CTA Section */}
      <Section name="CTASection">
        <CTASection
          onPlanClick={() => openInquiry('Custom Trip Inquiry')}
          onExploreClick={() => scrollToSection('explore-map')}
        />
      </Section>
    </>
  );
}

/** Whether any of the map section (`#explore-map`) is in the viewport. */
function useMapOnScreen(): boolean {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const map = document.getElementById('explore-map');
    if (!map) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(map);
    return () => observer.disconnect();
  }, []);
  return onScreen;
}
