import React from 'react';
import { Compass, AlertTriangle, RefreshCw } from 'lucide-react';
import { Logo } from '@/components/Logo';

/**
 * Boot states for the public site while content loads from Supabase.
 * Uses the approved brand palette so there is no visual jolt when the real
 * page paints.
 */

export const SiteLoading: React.FC = () => (
  <div className="min-h-screen bg-[#FBF9F6] flex flex-col items-center justify-center px-6">
    <div className="flex flex-col items-center space-y-6">
      <Logo />
      <div className="flex items-center space-x-2 text-[#1C4737]">
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
  <div className="min-h-screen bg-[#FBF9F6] flex flex-col items-center justify-center px-6 text-center">
    <div className="max-w-md space-y-5">
      <div className="w-14 h-14 bg-[#1C4737] text-[#D4AF37] rounded-full flex items-center justify-center mx-auto shadow-lg">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h1 className="font-heading text-2xl font-bold text-[#0F2E23]">
        We couldn’t load the island right now
      </h1>
      <p className="text-sm text-[#1A1A1A]/70 font-light leading-relaxed">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center space-x-2 px-8 py-3 bg-[#0F2E23] text-white font-bold rounded-2xl text-xs shadow-md hover:bg-[#1C4737] transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    </div>
  </div>
);
