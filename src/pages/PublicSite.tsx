import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
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
import { Footer } from '@/components/Footer';

import { DestinationModal } from '@/components/DestinationModal';
import { InquiryModal } from '@/components/InquiryModal';
import { SearchModal } from '@/components/SearchModal';

import { Destination, CategoryType, ExperienceItem, TourPackage } from '@/types';
import { ErrorBoundary } from '@/lib/ErrorBoundary';

/**
 * One section of the page. If it throws while rendering it shows nothing and
 * the rest of the page carries on: the approved design has no error states,
 * and a missing section is closer to it than an invented message. Adds no
 * markup of its own.
 */
const Section: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <ErrorBoundary name={name} fallback={null}>
    {children}
  </ErrorBoundary>
);

export function PublicSite() {
  const [activeModalDestination, setActiveModalDestination] = useState<Destination | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquirySubject, setInquirySubject] = useState('');

  const [activeFilterForMap, setActiveFilterForMap] = useState<CategoryType | 'All'>('All');
  const [selectedWhereForMap, setSelectedWhereForMap] = useState<string>('All');
  // The tour whose route the map is showing ("View route on map"), if any.
  const [routeTour, setRouteTour] = useState<TourPackage | null>(null);

  // Smooth Section Navigation
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
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

  // Featured Experience Detail Handler
  const handleSelectExperience = (exp: ExperienceItem) => {
    setInquirySubject(`Experience: ${exp.title} (${exp.location})`);
    setInquiryModalOpen(true);
  };

  // Open Inquiry with Custom Subject
  const handleOpenInquiry = (subject: string) => {
    setInquirySubject(subject);
    setInquiryModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F6] text-[#1A1A1A] font-sans selection:bg-[#1C4737] selection:text-[#F5EFEB]">
      {/* Sticky Header Navigation */}
      <Section name="Navbar">
        <Navbar
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenPlanner={() => handleOpenInquiry('Custom Travel Journey Request')}
          onNavigateSection={scrollToSection}
        />
      </Section>

      {/* Main Content Sections */}
      <main>
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
            onSelectDestination={(dest) => setActiveModalDestination(dest)}
            activeFilterFromParent={activeFilterForMap}
            selectedWhereFromParent={selectedWhereForMap}
            routeTour={routeTour}
            onClearRoute={() => setRouteTour(null)}
          />
        </Section>

        {/* Destination Spotlight Cards */}
        <Section name="DestinationSpotlight">
          <DestinationSpotlight
            onSelectDestination={(dest) => setActiveModalDestination(dest)}
          />
        </Section>

        {/* Experience Types Section */}
        <Section name="ExperiencesSection">
          <ExperiencesSection onSelectCategory={handleSelectCategory} />
        </Section>

        {/* Featured Unforgettable Moments */}
        <Section name="FeaturedExperiences">
          <FeaturedExperiences onSelectExperience={handleSelectExperience} />
        </Section>

        {/* Multi-Day Tours Section */}
        <Section name="ToursSection">
          <ToursSection
            onOpenInquiry={handleOpenInquiry}
            onViewRoute={(tour) => {
              setRouteTour(tour);
              scrollToSection('explore-map');
            }}
          />
        </Section>

        {/* Interactive Travel Journey Planner */}
        <Section name="TravelPlanner">
          <TravelPlanner onSavePlan={(planName) => handleOpenInquiry(`Saved Plan: ${planName}`)} />
        </Section>

        {/* Why Travel Eye Pillars */}
        <Section name="WhyTravelEye">
          <WhyTravelEye />
        </Section>

        {/* Hidden Gems Editorial Collection */}
        <Section name="HiddenGemsSection">
          <HiddenGemsSection onOpenInquiry={handleOpenInquiry} />
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
            onPlanClick={() => handleOpenInquiry('Custom Trip Inquiry')}
            onExploreClick={() => scrollToSection('explore-map')}
          />
        </Section>
      </main>

      {/* Dark Footer */}
      <Section name="Footer">
        <Footer onNavigateSection={scrollToSection} />
      </Section>

      {/* Interactive Modals */}
      <Section name="DestinationModal">
        <DestinationModal
          destination={activeModalDestination}
          onClose={() => setActiveModalDestination(null)}
          onOpenInquiry={handleOpenInquiry}
        />
      </Section>

      <Section name="InquiryModal">
        <InquiryModal
          isOpen={inquiryModalOpen}
          onClose={() => setInquiryModalOpen(false)}
          prefilledSubject={inquirySubject}
        />
      </Section>

      <Section name="SearchModal">
        <SearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onSelectDestination={(dest) => setActiveModalDestination(dest)}
        />
      </Section>
    </div>
  );
}

