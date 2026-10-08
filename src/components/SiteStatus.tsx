import React from 'react';
import { Compass, AlertTriangle, RefreshCw } from 'lucide-react';
import { Logo } from '@/components/Logo';

/**
 * Boot states for the public site while content loads from `/api/content`.
 * Uses the approved brand palette so there is no visual jolt when the real
 * page paints.
 */

export const SiteLoading: React.FC = () => (
  <div role="status" className="te-site-status min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-6">
    <div className="flex flex-col items-center space-y-6">
      <Logo />
      <div className="flex items-center space-x-2 text-[var(--brand-primary)]">
        <Compass className="w-4 h-4 animate-spin" />
        <span className="text-xs uppercase tracking-[0.2em] font-bold">
          Charting your journey
        </span>
      </div>
    </div>
  </div>
);

export const SiteError: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry
}) => (
  <div role="alert" className="te-site-status min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-6 text-center">
    <div className="max-w-md space-y-5">
      <div className="w-14 h-14 bg-[var(--brand-secondary)] text-[var(--accent-text)] rounded-full flex items-center justify-center mx-auto shadow-lg">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h1 className="font-heading text-2xl font-bold text-[var(--brand-primary)]">
        We couldn’t load the island right now
      </h1>
      <p className="text-sm text-[var(--text-primary)]/70 font-light leading-relaxed">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center space-x-2 px-8 py-3 bg-[var(--inverse-surface)] text-white font-bold rounded-2xl text-xs shadow-md hover:bg-[var(--brand-secondary)] transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    </div>
  </div>
);
