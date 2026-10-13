import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The LiftLedger illustration set. One visual language: 2.5px rounded ink strokes, brand fills,
 * soft tints. Colours come from the theme tokens, so every drawing works in light and dark.
 * Movement is defined in globals.css and only runs when the device allows motion.
 */
export interface IllustrationProps {
  title: string;
  className?: string;
  animated?: boolean;
}

const INK = 'var(--ink)';
const BRAND = 'var(--brand)';
const TINT = 'var(--brand-tint)';
const SOFT = 'var(--line)';
const CARD = 'var(--card)';

function Frame({ title, className, animated = true, children }: IllustrationProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 240 180"
      role="img"
      aria-label={title}
      className={cn('ill h-auto w-full max-w-60', animated && 'ill-on', className)}
      fill="none"
      stroke={INK}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function Van(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <ellipse cx="120" cy="150" rx="86" ry="6" fill={SOFT} stroke="none" />
      <g className="ill-road" stroke={SOFT}>
        <path d="M10 158h24M54 158h24M98 158h24M142 158h24M186 158h24" />
      </g>
      <g className="ill-bob">
        <path d="M44 132V78a14 14 0 0 1 14-14h92c8 0 15 4 20 11l20 30c3 4 4 8 4 13v14a6 6 0 0 1-6 6H50a6 6 0 0 1-6-6Z" fill={BRAND} />
        <path d="M62 78h30v26H56V84a6 6 0 0 1 6-6ZM102 78h30v26h-30ZM142 78h10c4 0 8 2 10 6l12 20h-32Z" fill={TINT} />
        <path d="M44 118h150" stroke={CARD} strokeOpacity="0.6" />
        <rect x="182" y="118" width="12" height="7" rx="3.5" fill={CARD} />
        <g className="ill-wheel" style={{ transformOrigin: '80px 138px' }}>
          <circle cx="80" cy="138" r="13" fill={INK} />
          <circle cx="80" cy="138" r="4.5" fill={CARD} stroke="none" />
          <path d="M80 127v5M80 144v5" stroke={CARD} strokeWidth="1.5" />
        </g>
        <g className="ill-wheel" style={{ transformOrigin: '160px 138px' }}>
          <circle cx="160" cy="138" r="13" fill={INK} />
          <circle cx="160" cy="138" r="4.5" fill={CARD} stroke="none" />
          <path d="M160 127v5M160 144v5" stroke={CARD} strokeWidth="1.5" />
        </g>
      </g>
      <g className="ill-speed" stroke={BRAND}>
        <path d="M8 88h22M14 104h16M4 120h26" />
      </g>
    </Frame>
  );
}

export function Route(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path d="M52 132c40 10 34-52 70-48s28 44 66-26" stroke={SOFT} strokeWidth="10" />
      <path className="ill-dash" d="M52 132c40 10 34-52 70-48s28 44 66-26" stroke={BRAND} strokeDasharray="2 10" />
      <g className="ill-pop">
        <path d="M52 132c-12-14-18-24-18-33a18 18 0 0 1 36 0c0 9-6 19-18 33Z" fill={CARD} />
        <circle cx="52" cy="99" r="6" fill={INK} />
      </g>
      <g className="ill-pop ill-late">
        <path d="M188 58c-14-16-21-28-21-38a21 21 0 0 1 42 0c0 10-7 22-21 38Z" fill={BRAND} />
        <circle cx="188" cy="20" r="7" fill={CARD} />
      </g>
      <circle className="ill-pulse" cx="122" cy="84" r="7" fill={TINT} />
      <circle cx="122" cy="84" r="3" fill={BRAND} stroke="none" />
    </Frame>
  );
}

export function Wallet(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <g className="ill-drop">
        <circle cx="120" cy="40" r="17" fill={TINT} />
        <path d="M120 31v18M114 36h9a4 4 0 0 1 0 8h-9" stroke={BRAND} />
      </g>
      <path d="M48 84a12 12 0 0 1 12-12h112a12 12 0 0 1 12 12v60a12 12 0 0 1-12 12H60a12 12 0 0 1-12-12Z" fill={BRAND} />
      <path d="M48 96h136" stroke={CARD} strokeOpacity="0.5" />
      <path d="M150 104h42a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6h-42a14 14 0 0 1 0-28Z" fill={CARD} />
      <circle cx="152" cy="118" r="4" fill={INK} />
      <path d="M66 72 148 46a8 8 0 0 1 10 5l7 21" fill={TINT} />
    </Frame>
  );
}

export function Calendar(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="52" y="40" width="136" height="116" rx="16" fill={CARD} />
      <path d="M52 56a16 16 0 0 1 16-16h104a16 16 0 0 1 16 16v16H52Z" fill={BRAND} />
      <path d="M84 30v20M156 30v20" />
      <g fill={SOFT} stroke="none">
        {[76, 104, 132, 160].map((x) => [92, 116, 140].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" />))}
      </g>
      <g className="ill-pop ill-late">
        <circle cx="132" cy="116" r="14" fill={BRAND} />
        <path d="m126 116 4.5 4.500L139 111" stroke={CARD} />
      </g>
    </Frame>
  );
}

export function Chat(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path d="M36 62a18 18 0 0 1 18-18h94a18 18 0 0 1 18 18v38a18 18 0 0 1-18 18H82l-26 20v-20h-2a18 18 0 0 1-18-18Z" fill={BRAND} />
      <g fill={CARD} stroke="none">
        <circle className="ill-blink" cx="78" cy="81" r="6" />
        <circle className="ill-blink ill-b2" cx="101" cy="81" r="6" />
        <circle className="ill-blink ill-b3" cx="124" cy="81" r="6" />
      </g>
      <g className="ill-pop ill-late">
        <path d="M126 122a14 14 0 0 1 14-14h50a14 14 0 0 1 14 14v18a14 14 0 0 1-14 14h-4v14l-18-14h-28a14 14 0 0 1-14-14Z" fill={CARD} />
        <path d="m146 131 6 6 11-12M162 137l11-12" stroke={BRAND} />
      </g>
    </Frame>
  );
}

export function Receipt(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="58" y="18" width="124" height="14" rx="7" fill={INK} />
      <g className="ill-unroll" style={{ transformOrigin: '120px 26px' }}>
        <path d="M70 26h100v118l-12.500 10-12.500-10-12.500 10-12.500-10-12.500 10-12.500-10-12.500 10-12.500-10Z" fill={CARD} />
        <path d="M86 50h44M86 68h68M86 84h54" stroke={SOFT} strokeWidth="5" />
        <path d="M86 108h68" strokeDasharray="1 7" />
        <path d="M86 126h26" stroke={SOFT} strokeWidth="5" />
        <rect x="124" y="118" width="30" height="16" rx="8" fill={BRAND} stroke="none" />
      </g>
    </Frame>
  );
}

export function Shield(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <circle className="ill-pulse" cx="120" cy="90" r="62" fill={TINT} stroke="none" />
      <path d="M120 28c18 12 34 16 50 16v44c0 30-20 52-50 64-30-12-50-34-50-64V44c16 0 32-4 50-16Z" fill={BRAND} />
      <path d="M120 44c12 7 24 11 36 12v32c0 22-14 38-36 48Z" fill={CARD} fillOpacity="0.14" stroke="none" />
      <path className="ill-draw" d="m100 90 14 14 28-30" stroke={CARD} strokeWidth="5" pathLength={1} />
    </Frame>
  );
}

export function EmptyRoad(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <circle cx="176" cy="52" r="20" fill={TINT} stroke="none" />
      <circle className="ill-pulse" cx="176" cy="52" r="12" fill={BRAND} stroke="none" />
      <path d="M8 104c26-22 46-22 66-6 18-26 44-30 64-4 22-16 52-14 94 10" stroke={SOFT} strokeWidth="4" />
      <path d="M100 104 44 170h152l-56-66Z" fill={SOFT} stroke="none" />
      <path d="M100 104 44 170M140 104l56 66" />
      <g className="ill-lane" stroke={CARD} strokeWidth="4">
        <path d="M120 110v10M120 130v12M120 152v16" />
      </g>
      <path d="M8 104h224" />
    </Frame>
  );
}

export const illustrations = { van: Van, route: Route, wallet: Wallet, calendar: Calendar, chat: Chat, receipt: Receipt, shield: Shield, emptyRoad: EmptyRoad };
