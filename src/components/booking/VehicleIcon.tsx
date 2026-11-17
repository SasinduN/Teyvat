import type { ReactElement } from 'react';
import { VEHICLE_ICONS, type VehicleIconName } from '@shared/booking';
import '@/styles/vehicle-icon.css';

/**
 * The vehicle icon set (the "Ride vehicle icon set" design canvas; our own drawings): flat,
 * facing right, on one 120 × 64 grid. Wheel centres on y = 50 (radius 7, the SUV's 8) and the
 * shadow at y = 58. Inline, so their fills follow the CSS variables in vehicle-icon.css: a
 * selected card restyles them, which an <img> couldn't.
 */
const SHAPES: Record<VehicleIconName, ReactElement> = {
  mini: <>
    <ellipse className="vi-shadow" cx="60" cy="58" rx="50" ry="2.5" />
    <path className="vi-body" d="M14 50 V24 Q14 16 22 16 H70 Q76 16 80 22 L88 32 Q104 33 106 40 V50 Z" />
    <rect className="vi-glass" x="20" y="21" width="24" height="11" rx="2" />
    <path className="vi-glass" d="M48 21 H70 Q73 21 75 24 L81 32 H48 Z" />
    <rect className="vi-accent" x="100" y="38" width="6" height="3" rx="1" />
    <Wheels at={[32, 90]} />
  </>,
  car: <>
    <ellipse className="vi-shadow" cx="60" cy="58" rx="54" ry="2.5" />
    <path className="vi-body" d="M8 50 V40 Q8 34 16 33 L30 32 L42 20 Q45 17 50 17 H74 Q79 17 83 21 L94 32 L108 34 Q114 35 114 42 V50 Z" />
    <path className="vi-glass" d="M46 22 H60 V31 H36 Z" />
    <path className="vi-glass" d="M64 22 H74 Q77 22 79 25 L85 31 H64 Z" />
    <rect className="vi-accent" x="108" y="38" width="6" height="3" rx="1" />
    <Wheels at={[28, 94]} />
  </>,
  suv: <>
    <ellipse className="vi-shadow" cx="60" cy="58" rx="54" ry="2.5" />
    <rect className="vi-body" x="24" y="11" width="50" height="3" rx="1.5" />
    <path className="vi-body" d="M8 50 V24 Q8 15 17 15 H76 Q82 15 86 20 L94 30 L108 32 Q114 33 114 40 V50 Z" />
    <rect className="vi-glass" x="15" y="20" width="22" height="10" rx="2" />
    <rect className="vi-glass" x="41" y="20" width="22" height="10" rx="2" />
    <path className="vi-glass" d="M67 20 H76 Q79 20 81 23 L87 30 H67 Z" />
    <rect className="vi-accent" x="108" y="36" width="6" height="3" rx="1" />
    <Wheels at={[28, 94]} r={8} />
  </>,
  'mini-van': <>
    <ellipse className="vi-shadow" cx="60" cy="58" rx="48" ry="2.5" />
    <path className="vi-body" d="M14 50 V16 Q14 10 20 10 H90 Q96 10 98 16 L104 34 Q106 36 106 40 V50 Z" />
    <rect className="vi-glass" x="20" y="15" width="18" height="13" rx="2" />
    <rect className="vi-glass" x="42" y="15" width="24" height="13" rx="2" />
    <path className="vi-glass" d="M70 15 H90 Q93 15 94 18 L99 32 H70 Z" />
    <line className="vi-seam" x1="68" y1="15" x2="68" y2="46" />
    <rect className="vi-accent" x="100" y="40" width="6" height="3" rx="1" />
    <Wheels at={[30, 88]} />
  </>,
  van: <>
    <ellipse className="vi-shadow" cx="60" cy="58" rx="54" ry="2.5" />
    <path className="vi-body" d="M6 50 V14 Q6 8 12 8 H92 Q98 8 101 14 L108 30 Q114 32 114 40 V50 Z" />
    <rect className="vi-glass" x="12" y="13" width="20" height="13" rx="2" />
    <rect className="vi-glass" x="36" y="13" width="20" height="13" rx="2" />
    <rect className="vi-glass" x="60" y="13" width="18" height="13" rx="2" />
    <path className="vi-glass" d="M82 13 H92 Q95 13 96 16 L102 30 H82 Z" />
    <line className="vi-seam" x1="58" y1="13" x2="58" y2="46" />
    <rect className="vi-accent" x="108" y="37" width="6" height="3" rx="1" />
    <Wheels at={[24, 96]} />
  </>,
  bus: <>
    <ellipse className="vi-shadow" cx="60" cy="58" rx="56" ry="2.5" />
    <path className="vi-body" d="M4 50 V12 Q4 6 10 6 H108 Q114 6 115 12 V50 Z" />
    {[9, 24, 39, 54, 69].map((x) => <rect key={x} className="vi-glass" x={x} y="11" width="12" height="14" rx="2" />)}
    <rect className="vi-glass" x="85" y="11" width="8" height="34" rx="1.5" />
    <rect className="vi-glass" x="96" y="11" width="15" height="20" rx="2" />
    <rect className="vi-accent" x="4" y="32" width="78" height="2.5" rx="1" />
    <rect className="vi-accent" x="109" y="38" width="6" height="3" rx="1" />
    <Wheels at={[22, 100]} />
  </>,
  'mini-lorry': <>
    <ellipse className="vi-shadow" cx="60" cy="58" rx="56" ry="2.5" />
    <rect className="vi-accent" x="14" y="21" width="20" height="11" rx="1.5" />
    <rect className="vi-accent" x="38" y="24" width="16" height="8" rx="1.5" />
    <rect className="vi-body" x="6" y="31" width="70" height="13" rx="2" />
    <line className="vi-seam" x1="30" y1="31" x2="30" y2="44" />
    <line className="vi-seam" x1="54" y1="31" x2="54" y2="44" />
    <path className="vi-body" d="M78 50 V18 Q78 12 84 12 H100 Q105 12 107 18 L112 32 Q114 34 114 40 V50 Z" />
    <rect className="vi-body" x="6" y="43" width="74" height="7" />
    <path className="vi-glass" d="M84 17 H100 Q103 17 104 20 L108 30 H84 Z" />
    <rect className="vi-accent" x="108" y="38" width="6" height="3" rx="1" />
    <Wheels at={[26, 96]} />
  </>
};

function Wheels({ at, r = 7 }: { at: [number, number]; r?: number }) {
  return <>{at.map((cx) => <g key={cx}>
    <circle className="vi-tyre" cx={cx} cy="50" r={r} />
    <circle className="vi-accent" cx={cx} cy="50" r={r * (r === 8 ? 0.375 : 0.37)} />
  </g>)}</>;
}

/** One icon at a fixed size (so nothing shifts), decorative: the card or caption names the vehicle. */
export function VehicleIcon({ name, width, height, className }: { name: VehicleIconName; width: number; height: number; className?: string }) {
  const shape = SHAPES[name] ?? SHAPES.car;
  return (
    <svg className={['vehicle-icon', className].filter(Boolean).join(' ')} viewBox="0 0 120 64" width={width} height={height}
      aria-hidden="true" focusable="false" data-vehicle-icon={name}>
      {shape}
    </svg>
  );
}

export { VEHICLE_ICONS };
