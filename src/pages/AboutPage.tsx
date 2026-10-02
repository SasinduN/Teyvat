import { useState } from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { IntroSection } from '@/components/IntroSection';
import { WhyTravelEye } from '@/components/WhyTravelEye';
import { InquiryForm } from '@/components/InquiryForm';
import { usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { useHeroSlides, useSiteSettings } from '@/hooks/useSiteContent';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/**
 * `/about`: the home page's intro and "why" sections as they are, then
 * Contact (`#contact`): the details from Admin → Settings beside the enquiry
 * form, inline. The Navbar's "Contact" comes here.
 */
export function AboutPage() {
  usePageTitle(PAGE_TITLES.about);
  const settings = useSiteSettings();
  const slides = useHeroSlides();
  const { whatsappHref } = usePublicSite();
  // A new key resets the form for another request.
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <PageHero
        compact
        image={slides[1]?.url ?? slides[0]?.url}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'About' }]}
        eyebrow="Who We Are"
        title="About Us"
        subtitle={PAGE_DESCRIPTIONS.about}
      />

      <Section name="IntroSection">
        <IntroSection />
      </Section>

      <Section name="WhyTravelEye">
        <WhyTravelEye />
      </Section>

      <section id="contact" className="relative overflow-hidden bg-[#F5EFEB] py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:px-8">
          <div className="space-y-6 lg:col-span-5">
            <span className="inline-block rounded-full bg-[#1C4737]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#1C4737]">
              Get in Touch
            </span>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-[#0F2E23] sm:text-5xl">
              Contact <span className="font-serif italic text-[#1C4737]">Us</span>
            </h2>
            <p className="font-light leading-relaxed text-[#1A1A1A]/75">
              Tell us what you want to experience, and a travel designer will reply within 12 hours.
            </p>
            <ul className="space-y-4 rounded-3xl bg-[#0F2E23] p-7 text-sm text-white/85 shadow-xl">
              <li className="flex items-start space-x-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#D4AF37]" aria-hidden="true" />
                <span>{settings.postalAddress}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 shrink-0 text-[#D4AF37]" aria-hidden="true" />
                <span>{settings.phone}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 shrink-0 text-[#D4AF37]" aria-hidden="true" />
                <a href={`mailto:${settings.contactEmail}`} className="transition-colors hover:text-[#D4AF37]">
                  {settings.contactEmail}
                </a>
              </li>
              {whatsappHref && settings.whatsappNumber && (
                <li className="flex items-center space-x-3">
                  <MessageCircle className="h-5 w-5 shrink-0 text-[#D4AF37]" aria-hidden="true" />
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#D4AF37]">
                    WhatsApp: +{settings.whatsappNumber}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-[#D4C3B5]/60 bg-white p-6 shadow-xl sm:p-8" data-inline-inquiry>
              <InquiryForm
                key={formKey}
                prefilledSubject="General Sri Lanka Trip Inquiry"
                onDone={() => setFormKey((k) => k + 1)}
                doneLabel="Send Another Request"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
