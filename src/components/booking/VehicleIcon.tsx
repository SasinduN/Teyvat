import type { ReactElement } from 'react';
import { VEHICLE_ICONS, type VehicleIconName } from '@shared/booking';
import '@/styles/vehicle-icon.css';

/**
 * The vehicle icons, sketch style (the "Ride vehicles, sketch style" design canvas; our own
 * drawings): pen-and-ink outlines on a 240 × 128 grid, facing right. Wheel centres on y = 104
 * (radius 15, the SUV's 16), a ground line at y = 119 broken under the wheels. Body strokes 2.4,
 * glass 1.6, seams and handles 1.4, reflections 1.2 at 45%, and a second body stroke at 1 px, 35%,
 * offset 0.8 / 0.6. The wobble is one filter per page (VehicleSketchFilter). Colours come from the
 * --vehicle-* variables (vehicle-icon.css), so a selected card or the hero's dark slide restyles them.
 */

/** A wheel: tyre, tread, rim, five spokes and a gold hub. */
function Wheel({ x, r = 15 }: { x: number; r?: 15 | 16 }) {
  return (
    <g transform={`translate(${x} 104)`}>
      <circle className="vi-tyre" r={r} />
      <circle className="vi-tread" r={r - 2.5} />
      <circle className="vi-fine" r={r === 16 ? 9 : 8.5} />
      <path className="vi-fine" d="M3 0 L8 0 M0.9 2.9 L2.5 7.6 M-2.4 1.8 L-6.5 4.7 M-2.4 -1.8 L-6.5 -4.7 M0.9 -2.9 L2.5 -7.6" />
      <circle className="vi-gold" r="2.4" />
    </g>
  );
}

/** The body, then the same outline again, thin and offset: the sketched look. */
function Body({ d, ghost }: { d: string; ghost: string }) {
  return <>
    <path className="vi-body" d={d} />
    <path className="vi-ghost" transform="translate(0.8 0.6)" d={ghost} />
  </>;
}

const BUS_BODY = 'M6 98 L6 22 Q6 12 16 12 L222 12 Q232 12 233 22 L234 98 Q234 102 230 102 L218 102 A20 20 0 0 0 178 102 L62 102 A20 20 0 0 0 22 102 L10 102 Q6 102 6 98 Z';
const BUS_GHOST = 'M6 22 Q6 12 16 12 L222 12 Q232 12 233 22 L234 98';

const SHAPES: Record<VehicleIconName, ReactElement> = {
  mini: <>
    <path className="vi-ground" d="M10 119 L58 119 M66 119 L172 119 M180 119 L230 119" />
    <Body d="M30 100 L28 70 Q27 60 32 52 L40 36 Q44 30 52 30 L150 30 Q160 30 166 38 L184 62 Q206 64 214 72 Q218 78 218 88 L218 98 Q218 102 214 102 L198 102 A20 20 0 0 0 158 102 L84 102 A20 20 0 0 0 44 102 L34 102 Q30 102 30 100 Z"
      ghost="M30 100 L28 70 Q27 60 32 52 L40 36 Q44 30 52 30 L150 30 Q160 30 166 38 L184 62 Q206 64 214 72 Q218 78 218 88 L218 98" />
    <path className="vi-glass" d="M38 56 L46 38 Q48 35 52 35 L74 35 L74 58 L40 58 Z" />
    <path className="vi-glass" d="M80 35 L118 35 L118 58 L80 58 Z" />
    <path className="vi-glass" d="M124 35 L148 35 Q156 35 160 41 L174 58 L124 58 Z" />
    <path className="vi-reflect" d="M132 52 L142 40 M138 53 L146 43" />
    <path className="vi-fine" d="M121 58 L121 98 M77 58 L78 96 M86 66 L96 66 M128 66 L138 66 M44 78 Q130 73 200 75 M196 90 L218 90 M30 90 L44 90" />
    <path className="vi-ink" d="M168 52 L175 50 L177 57 L170 58 Z" />
    <path className="vi-gold" d="M204 66 Q212 68 214 74 L206 74 Q202 70 204 66 Z" />
    <path className="vi-gold-line" d="M30 64 L29 76" />
    <Wheel x={64} /><Wheel x={178} />
  </>,
  car: <>
    <path className="vi-ground" d="M8 119 L50 119 M60 119 L182 119 M194 119 L232 119" />
    <Body d="M14 98 L14 80 Q14 70 24 68 L48 64 L80 40 Q86 36 96 36 L148 36 Q158 36 166 42 L190 62 L216 66 Q226 68 228 78 L228 96 Q228 102 222 102 L208 102 A20 20 0 0 0 168 102 L76 102 A20 20 0 0 0 36 102 L20 102 Q14 102 14 98 Z"
      ghost="M14 80 Q14 70 24 68 L48 64 L80 40 Q86 36 96 36 L148 36 Q158 36 166 42 L190 62 L216 66 Q226 68 228 78 L228 96" />
    <path className="vi-glass" d="M56 65 L84 44 Q88 41 94 41 L116 41 L116 65 Z" />
    <path className="vi-glass" d="M122 41 L146 41 Q154 41 160 46 L180 65 L122 65 Z" />
    <path className="vi-reflect" d="M132 60 L144 46 M140 61 L150 49" />
    <path className="vi-fine" d="M119 65 L119 98 M78 66 L80 96 M90 74 L100 74 M130 74 L140 74 M30 84 Q120 79 214 84 M200 92 L228 92 M14 92 L30 92" />
    <path className="vi-ink" d="M176 60 L183 58 L185 64 L178 65 Z" />
    <path className="vi-gold" d="M206 70 L224 72 Q226 76 222 78 L208 76 Z" />
    <path className="vi-gold-line" d="M15 74 L27 72" />
    <Wheel x={56} /><Wheel x={188} />
  </>,
  suv: <>
    <path className="vi-ground" d="M8 119 L48 119 M62 119 L180 119 M196 119 L232 119" />
    <path className="vi-fine" d="M36 30 L140 30 M50 30 L50 34 M126 30 L126 34" />
    <Body d="M14 98 L14 52 Q14 34 30 34 L150 34 Q160 34 166 42 L184 64 L214 68 Q228 70 228 82 L228 96 Q228 102 222 102 L210 102 A22 22 0 0 0 166 102 L78 102 A22 22 0 0 0 34 102 L20 102 Q14 102 14 98 Z"
      ghost="M14 52 Q14 34 30 34 L150 34 Q160 34 166 42 L184 64 L214 68 Q228 70 228 82 L228 96" />
    <path className="vi-glass" d="M22 42 L52 42 L52 64 L22 64 Z" />
    <path className="vi-glass" d="M58 42 L110 42 L110 64 L58 64 Z" />
    <path className="vi-glass" d="M116 42 L150 42 Q156 42 160 48 L172 64 L116 64 Z" />
    <path className="vi-reflect" d="M124 60 L136 46 M132 61 L142 49" />
    <path className="vi-fine" d="M113 64 L113 98 M56 64 L58 96 M70 72 L80 72 M124 72 L134 72 M24 80 L210 82 M210 98 L228 96 M14 90 L32 90" />
    <path className="vi-ink" d="M170 58 L178 56 L180 63 L172 64 Z" />
    <path className="vi-gold" d="M206 72 L224 74 L222 80 L208 78 Z" />
    <path className="vi-gold-line" d="M15 50 L15 66" />
    <Wheel x={56} r={16} /><Wheel x={188} r={16} />
  </>,
  'mini-van': <>
    <path className="vi-ground" d="M20 119 L54 119 M70 119 L168 119 M184 119 L222 119" />
    <Body d="M26 98 L26 34 Q26 24 36 24 L176 24 Q186 24 190 32 L204 70 Q212 72 214 80 L214 98 Q214 102 210 102 L196 102 A20 20 0 0 0 156 102 L82 102 A20 20 0 0 0 42 102 L30 102 Q26 102 26 98 Z"
      ghost="M26 34 Q26 24 36 24 L176 24 Q186 24 190 32 L204 70 Q212 72 214 80 L214 98" />
    <path className="vi-glass" d="M34 32 L64 32 L64 58 L34 58 Z" />
    <path className="vi-glass" d="M72 32 L126 32 L126 58 L72 58 Z" />
    <path className="vi-glass" d="M134 32 L176 32 Q182 32 184 38 L194 62 L134 62 Z" />
    <path className="vi-reflect" d="M150 56 L162 38 M158 58 L168 42" />
    <path className="vi-fine" d="M130 32 L130 98 M68 32 L68 96 M72 62 L128 62 M74 70 L84 70 M140 74 L150 74 M198 92 L214 92 M26 92 L42 92 M32 78 L200 80" />
    <path className="vi-ink" d="M190 54 L197 52 L199 59 L192 60 Z" />
    <path className="vi-gold" d="M200 76 L212 78 L212 86 L202 84 Z" />
    <path className="vi-gold-line" d="M27 64 L27 80" />
    <Wheel x={62} /><Wheel x={176} />
  </>,
  van: <>
    <path className="vi-ground" d="M6 119 L30 119 M66 119 L174 119 M210 119 L234 119" />
    <Body d="M10 98 L10 30 Q10 18 22 18 L180 18 Q192 18 196 28 L208 60 L222 66 Q230 70 230 82 L230 96 Q230 102 224 102 L212 102 A20 20 0 0 0 172 102 L68 102 A20 20 0 0 0 28 102 L16 102 Q10 102 10 98 Z"
      ghost="M10 30 Q10 18 22 18 L180 18 Q192 18 196 28 L208 60 L222 66 Q230 70 230 82 L230 96" />
    <path className="vi-glass" d="M18 28 L52 28 L52 54 L18 54 Z" />
    <path className="vi-glass" d="M58 28 L100 28 L100 54 L58 54 Z" />
    <path className="vi-glass" d="M108 28 L148 28 L148 54 L108 54 Z" />
    <path className="vi-glass" d="M156 28 L182 28 Q188 28 190 34 L200 58 L156 58 Z" />
    <path className="vi-reflect" d="M164 54 L176 34 M172 55 L182 38" />
    <path className="vi-fine" d="M104 28 L104 98 M152 28 L152 98 M58 60 L146 60 M138 70 L146 70 M160 70 L170 70 M18 76 L210 78 M216 84 L230 84 M216 88 L230 88 M10 92 L28 92" />
    <path className="vi-ink" d="M198 50 L206 48 L208 55 L200 56 Z" />
    <path className="vi-gold" d="M214 68 L228 72 L228 80 L214 78 Z" />
    <path className="vi-gold-line" d="M11 40 L11 64" />
    <Wheel x={48} /><Wheel x={192} />
  </>,
  'ac-bus': <>
    <path className="vi-ground" d="M4 119 L24 119 M60 119 L180 119 M216 119 L236 119" />
    {/* The roof's AC unit. */}
    <path className="vi-fine" d="M80 6 L140 6 Q144 6 144 10 L144 12 L76 12 L76 10 Q76 6 80 6 Z M86 9 L134 9" />
    <Body d={BUS_BODY} ghost={BUS_GHOST} />
    {/* One long tinted window band. */}
    <path className="vi-glass" d="M14 20 L172 20 L172 56 L14 56 Z" />
    <path className="vi-fine" d="M46 20 L46 56 M78 20 L78 56 M110 20 L110 56 M142 20 L142 56" />
    <path className="vi-glass" d="M178 20 L198 20 L198 98 L178 98 Z" />
    <path className="vi-fine" d="M188 20 L188 98" />
    <path className="vi-glass" d="M204 20 L228 20 Q230 20 230 24 L230 62 L204 62 Z" />
    <path className="vi-reflect" d="M24 50 L38 26 M56 50 L70 26 M210 56 L222 30" />
    <path className="vi-gold-line" d="M6 70 Q90 60 176 68" />
    <path className="vi-fine" d="M76 76 L120 76 L120 94 L76 94 Z M126 76 L170 76 L170 94 L126 94 Z M206 14 L226 14" />
    <path className="vi-ink" d="M233 30 Q240 30 240 40 L240 48" />
    <path className="vi-gold" d="M222 76 L232 76 L232 84 L222 84 Z" />
    <Wheel x={42} /><Wheel x={198} />
  </>,
  bus: <>
    <path className="vi-ground" d="M4 119 L24 119 M60 119 L180 119 M216 119 L236 119" />
    <Body d={BUS_BODY} ghost={BUS_GHOST} />
    {[14, 46, 78, 110, 142].map((x) => <path key={x} className="vi-glass" d={`M${x} 20 L${x + 28} 20 L${x + 28} 54 L${x} 54 Z`} />)}
    <path className="vi-fine" d="M14 36 L170 36" />
    <path className="vi-glass" d="M178 20 L198 20 L198 98 L178 98 Z" />
    <path className="vi-fine" d="M188 20 L188 98" />
    <path className="vi-glass" d="M204 20 L228 20 Q230 20 230 24 L230 62 L204 62 Z" />
    <path className="vi-reflect" d="M210 56 L222 30 M216 58 L226 38" />
    <path className="vi-gold-line" d="M6 64 L176 64 M6 68 L176 68" />
    <path className="vi-fine" d="M76 76 L120 76 L120 94 L76 94 Z M126 76 L170 76 L170 94 L126 94 Z M206 14 L226 14" />
    <path className="vi-ink" d="M233 30 Q240 30 240 40 L240 48" />
    <path className="vi-gold" d="M222 76 L232 76 L232 84 L222 84 Z" />
    <Wheel x={42} /><Wheel x={198} />
  </>,
  'mini-lorry': <>
    <path className="vi-ground" d="M6 119 L40 119 M76 119 L176 119 M212 119 L234 119" />
    {/* The open bed's boxes. */}
    <path className="vi-cargo" d="M18 40 L52 40 L52 58 L18 58 Z" />
    <path className="vi-cargo" d="M58 46 L84 46 L84 58 L58 58 Z" />
    <path className="vi-cargo" d="M92 32 L122 32 L122 58 L92 58 Z" />
    <path className="vi-gold-line" d="M35 40 L35 58 M92 45 L122 45" />
    <Body d="M8 58 L150 58 L150 88 L8 88 Z" ghost="M8 58 L150 58 L150 88" />
    <path className="vi-fine" d="M56 58 L56 88 M104 58 L104 88 M8 73 L150 73" />
    <path className="vi-body" d="M8 88 L156 88 L156 95 L8 95 Z" />
    <Body d="M156 102 L156 36 Q156 26 166 26 L196 26 Q204 26 208 34 L220 62 Q230 64 232 74 L232 96 Q232 102 226 102 L214 102 A20 20 0 0 0 174 102 Z"
      ghost="M156 36 Q156 26 166 26 L196 26 Q204 26 208 34 L220 62 Q230 64 232 74 L232 96" />
    <path className="vi-glass" d="M164 34 L194 34 Q200 34 202 40 L212 62 L164 62 Z" />
    <path className="vi-reflect" d="M180 58 L190 40 M188 59 L196 45" />
    <path className="vi-fine" d="M162 66 L162 96 M166 72 L176 72 M216 86 L232 86 M216 90 L232 90" />
    <path className="vi-ink" d="M212 52 L220 50 L222 57 L214 58 Z" />
    <path className="vi-gold" d="M222 70 L232 72 L232 80 L222 78 Z" />
    <Wheel x={58} /><Wheel x={194} />
  </>
};

export const VEHICLE_SKETCH_FILTER_ID = 'vehicle-sketch';

/**
 * The hand-drawn wobble, defined once on a page that shows icons (the ride page, the home hero,
 * Admin → Bookings). vehicle-icon.css applies it from 640 px up; phones keep the double stroke.
 */
export function VehicleSketchFilter() {
  return (
    <svg className="vehicle-sketch-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id={VEHICLE_SKETCH_FILTER_ID} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} />
          <feDisplacementMap in="SourceGraphic" scale="1.8" />
        </filter>
      </defs>
    </svg>
  );
}

/** One icon at a fixed size (so nothing shifts), decorative: the card or caption names the vehicle. */
export function VehicleIcon({ name, width, height, className }: { name: VehicleIconName; width: number; height: number; className?: string }) {
  const shape = SHAPES[name] ?? SHAPES.car;
  return (
    <svg className={['vehicle-icon', className].filter(Boolean).join(' ')} viewBox="0 0 240 128" width={width} height={height}
      aria-hidden="true" focusable="false" data-vehicle-icon={name}>
      <g className="vi-sketch">{shape}</g>
    </svg>
  );
}

/** The snowflake for the AC badge (the canvas's own), sized with the badge's text. */
export function SnowflakeMark() {
  return (
    <svg className="vehicle-snowflake" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 3 3-3M9 20l3-3 3 3" />
    </svg>
  );
}

export { VEHICLE_ICONS };
