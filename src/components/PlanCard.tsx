import React from 'react';
import { usePublicSite } from '@/context/PublicSiteContext';

interface PlanCardProps {
  title: string;
  text: string;
  /** The main button's label; it opens the enquiry form with the page's subject. */
  cta: string;
  /** A tour's starting price. */
  priceFrom?: number;
}

/**
 * The "plan this" panel in a detail page's sidebar: sticky beside the content on
 * large screens, after it on phones. The WhatsApp button shows only when a number
 * is set, and opens the same pre-filled chat as the floating button.
 */
export const PlanCard: React.FC<PlanCardProps> = ({ title, text, cta, priceFrom }) => {
  const { openInquiry, whatsappHref } = usePublicSite();
  return (
    <div className="te-plan-card">
      {priceFrom !== undefined && (
        <p className="te-plan-card__price">From ${priceFrom} <span>per person</span></p>
      )}
      <h2 className="font-heading">{title}</h2>
      <p>{text}</p>
      <div className="te-plan-card__actions">
        <button type="button" onClick={() => openInquiry()} data-keep-clear className="te-button te-button--primary w-full">
          {cta}
        </button>
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" data-keep-clear data-plan-whatsapp className="te-button te-button--outline w-full">
            <svg viewBox="0 0 24 24" className="h-[1.125rem] w-[1.125rem]" fill="currentColor" aria-hidden="true">
              <path d="M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 12.05 0z" />
            </svg>
            <span>Ask on WhatsApp</span>
          </a>
        )}
      </div>
    </div>
  );
};
