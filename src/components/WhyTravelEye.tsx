import React from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Binoculars,
  Camera,
  Clock,
  Compass,
  Globe,
  Handshake,
  Heart,
  Leaf,
  MapPin,
  Mountain,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  Users,
  Utensils,
  Waves,
  type LucideIcon
} from 'lucide-react';
import { usePillars } from '@/hooks/useSiteContent';
import { PillarIcon } from '../types';

/**
 * The database stores an icon's name; this turns it back into the component.
 * Same list as the CHECK on `pillars.icon` and `PillarIconName` in
 * `shared/database.types.ts`: add an icon to all three together.
 */
const PILLAR_ICONS: Record<PillarIcon, LucideIcon> = {
  Users,
  Compass,
  Sliders,
  Leaf,
  Heart,
  ShieldCheck,
  Star,
  MapPin,
  Camera,
  Globe,
  Sparkles,
  Award,
  Clock,
  Handshake,
  Mountain,
  Waves,
  Utensils,
  Binoculars
};

export const WhyTravelEye: React.FC = () => {
  const pillars = usePillars();

  return (
    <section className="py-24 bg-[#FBF9F6] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1C4737] bg-[#1C4737]/10 px-4 py-1.5 rounded-full inline-block mb-3">
            The Travel Eye Difference
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[#0F2E23] tracking-tight">
            Travel With A Clearer View.
          </h2>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((p, i) => {
            // The fallback only matters if the lists above ever drift apart:
            // a missing icon would otherwise crash the section.
            const IconComponent = PILLAR_ICONS[p.icon] ?? Compass;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-[#D4C3B5]/40 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#0F2E23] text-[#D4AF37] flex items-center justify-center mb-6 group-hover:bg-[#1C4737] transition-colors shadow-md">
                  <IconComponent className="w-7 h-7" />
                </div>

                <h3 className="font-heading text-xl font-bold text-[#0F2E23] mb-3 group-hover:text-[#1C4737] transition-colors">
                  {p.title}
                </h3>

                <p className="text-xs text-[#1A1A1A]/80 font-light leading-relaxed">
                  {p.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
