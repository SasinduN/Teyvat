import { useState } from 'react';
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

import { Destination, CategoryType, ExperienceItem } from '@/types';

export function PublicSite() {
  const [activeModalDestination, setActiveModalDestination] = useState<Destination | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquirySubject, setInquirySubject] = useState('');

  const [activeFilterForMap, setActiveFilterForMap] = useState<CategoryType | 'All'>('All');
  const [selectedWhereForMap, setSelectedWhereForMap] = useState<string>('All');

  // Smooth Section Navigation
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Quick Search Submission Handler
  const handleQuickSearch = (where: string, experience: CategoryType | 'All', _timing: string) => {
    setSelectedWhereForMap(where);
    setActiveFilterForMap(experience);
    scrollToSection('explore-map');
  };

  // Category Selection Handler from Experiences Section
  const handleSelectCategory = (category: CategoryType) => {
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
      <Navbar
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenPlanner={() => handleOpenInquiry('Custom Travel Journey Request')}
        onNavigateSection={scrollToSection}
      />

      {/* Main Content Sections */}
      <main>
        {/* Full-screen Hero Section */}
        <HeroSection
          onExploreClick={() => scrollToSection('explore-map')}
          onPlanClick={() => scrollToSection('planner')}
        />

        {/* Floating Quick Search Discovery Bar */}
        <QuickSearch onSearchSubmit={handleQuickSearch} />

        {/* Introduction Section */}
        <IntroSection />

        {/* Signature Feature: Interactive Sri Lanka Map */}
        <InteractiveMapSection
          onSelectDestination={(dest) => setActiveModalDestination(dest)}
          activeFilterFromParent={activeFilterForMap}
          selectedWhereFromParent={selectedWhereForMap}
        />

        {/* Destination Spotlight Cards */}
        <DestinationSpotlight
          onSelectDestination={(dest) => setActiveModalDestination(dest)}
        />

        {/* Experience Types Section */}
        <ExperiencesSection onSelectCategory={handleSelectCategory} />

        {/* Featured Unforgettable Moments */}
        <FeaturedExperiences onSelectExperience={handleSelectExperience} />

        {/* Multi-Day Tours Section */}
        <ToursSection onOpenInquiry={handleOpenInquiry} />

        {/* Interactive Travel Journey Planner */}
        <TravelPlanner onSavePlan={(planName) => handleOpenInquiry(`Saved Plan: ${planName}`)} />

        {/* Why Travel Eye Pillars */}
        <WhyTravelEye />

        {/* Hidden Gems Editorial Collection */}
        <HiddenGemsSection onOpenInquiry={handleOpenInquiry} />

        {/* Photography Stories Gallery */}
        <PhotoStorySection />

        {/* Travel Eye Journal */}
        <JournalSection />

        {/* Cinematic Sunset CTA Section */}
        <CTASection
          onPlanClick={() => handleOpenInquiry('Custom Trip Inquiry')}
          onExploreClick={() => scrollToSection('explore-map')}
        />
      </main>

      {/* Dark Footer */}
      <Footer onNavigateSection={scrollToSection} />

      {/* Interactive Modals */}
      <DestinationModal
        destination={activeModalDestination}
        onClose={() => setActiveModalDestination(null)}
        onOpenInquiry={handleOpenInquiry}
      />

      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        prefilledSubject={inquirySubject}
      />

      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectDestination={(dest) => setActiveModalDestination(dest)}
      />
    </div>
  );
}

