import React from 'react';
import { ArrowRight } from 'lucide-react';
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
 * The "plan this" card in a detail page's sidebar: sticky beside the content
 * on large screens, after it on phones. The WhatsApp button shows only when a
 * number is set, and opens the same pre-filled chat as the floating button.
 */
export const PlanCard: React.FC<PlanCardProps> = ({ title, text, cta, priceFrom }) => {
  const { openInquiry, whatsappHref } = usePublicSite();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0F2E23] p-7 text-white shadow-xl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#368E6B]/25 blur-3xl" />
      <div className="relative space-y-4">
        <span className="inline-block rounded-full border border-[#D4AF37]/30 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
          Plan with a local expert
        </span>
        {priceFrom !== undefined && (
          <div>
            <span className="block text-xs text-white/60">Price starting from</span>
            <span className="font-heading text-3xl font-bold">
              ${priceFrom} <span className="font-sans text-xs font-normal text-white/70">/ per person</span>
            </span>
          </div>
        )}
        <h2 className="font-heading text-2xl font-bold">{title}</h2>
        <p className="text-sm font-light leading-relaxed text-white/75">{text}</p>
        <button
          type="button"
          onClick={() => openInquiry()}
          data-keep-clear
          className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] px-6 py-3.5 font-bold text-[#0F2E23] shadow-lg transition-all hover:from-[#C5A059] hover:to-[#B89248]"
        >
          <span>{cta}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            data-keep-clear
            data-plan-whatsapp
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 12.05 0z" />
            </svg>
            <span>Ask on WhatsApp</span>
          </a>
        )}
      </div>
    </div>
  );
};
