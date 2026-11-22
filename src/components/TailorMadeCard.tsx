import React from 'react';
import { usePublicSite } from '@/context/PublicSiteContext';
import { useSiteSettings } from '@/hooks/useSiteContent';
import { whatsappMessage, whatsappUrl } from '@shared/whatsapp';

/** The enquiry subject the card fills in: the inbox can find these by it. */
export const TAILOR_MADE_SUBJECT = 'Tailor-made trip';

/**
 * The end of every tour list (`/tours` and each category's page): for a trip that isn't
 * listed. The button opens the enquiry form with "Tailor-made trip" as its subject; the
 * WhatsApp link, only while a number is set, opens a chat saying the same. After the
 * list, not in it, so the phones' swipe row still counts tours only.
 */
export const TailorMadeCard: React.FC = () => {
  const { openInquiry } = usePublicSite();
  const number = useSiteSettings().whatsappNumber;
  const whatsappHref = number ? whatsappUrl(number, whatsappMessage({ kind: 'tailorMade' }, window.location.origin)) : null;
  return (
    <section className="te-ed-section te-tailor-section" aria-labelledby="tailor-made-title">
      <div className="te-container">
        <div className="te-tailor" data-tailor-made>
          <h2 id="tailor-made-title" className="te-tailor__title font-heading">Don&rsquo;t see the trip you want?</h2>
          <p className="te-tailor__text">Tell us what you have in mind.</p>
          <div className="te-ed-actions te-tailor__actions">
            <button
              type="button"
              className="te-button te-button--primary"
              onClick={() => openInquiry(TAILOR_MADE_SUBJECT)}
              data-tailor-made-enquiry
            >
              Plan a tailor-made trip
            </button>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="te-button te-button--secondary"
                data-tailor-made-whatsapp
              >
                <svg viewBox="0 0 24 24" className="h-[1.125rem] w-[1.125rem]" fill="currentColor" aria-hidden="true">
                  <path d="M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 12.05 0z" />
                </svg>
                <span>Ask on WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
