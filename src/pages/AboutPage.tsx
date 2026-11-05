import { useState } from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { IntroSection } from '@/components/IntroSection';
import { StatStrip } from '@/components/StatStrip';
import { WhyTravelEye } from '@/components/WhyTravelEye';
import { InquiryForm } from '@/components/InquiryForm';
import { usePageTitle, usePublicSite } from '@/context/PublicSiteContext';
import { useHeroSlides, useSiteSettings } from '@/hooks/useSiteContent';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import { Section } from './Section';

/**
 * `/about`: who we are, the numbers and how we plan, then Contact
 * (`#contact`): the details from Admin → Settings beside the enquiry
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
        title="About Us"
        subtitle={PAGE_DESCRIPTIONS.about}
      />

      <Section name="IntroSection">
        <IntroSection />
      </Section>

      <Section name="StatStrip">
        <StatStrip />
      </Section>

      <Section name="WhyTravelEye">
        <WhyTravelEye />
      </Section>

      <section id="contact" className="te-ed-section">
        <div className="te-container grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="space-y-6 lg:col-span-5">
            <h2 className="te-ed-title font-heading">Contact us</h2>
            <p className="te-ed-lead">Tell us what you want to see. A travel designer will reply within 12 hours.</p>
            <ul data-keep-clear className="te-contact-list">
              <li>
                <MapPin aria-hidden="true" />
                <span>{settings.postalAddress}</span>
              </li>
              <li>
                <Phone aria-hidden="true" />
                <span>{settings.phone}</span>
              </li>
              <li>
                <Mail aria-hidden="true" />
                <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
              </li>
              {whatsappHref && settings.whatsappNumber && (
                <li>
                  <MessageCircle aria-hidden="true" />
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp: +{settings.whatsappNumber}</a>
                </li>
              )}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="te-form-panel" data-inline-inquiry>
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
