'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { ease } from '@/components/motion/tokens';

const W = 100;
const H = 40;

/** A smooth curve through the points, as an SVG path. */
export function smoothPath(values: number[]): string {
  if (values.length === 0) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    values.length === 1 ? W / 2 : (i / (values.length - 1)) * W,
    H - 4 - ((v - min) / span) * (H - 10),
  ]);
  if (pts.length === 1) return `M0,${pts[0][1]} L${W},${pts[0][1]}`;
  return pts.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const mid = (px + x) / 2;
    return `${d} C${mid},${py} ${mid},${y} ${x},${y}`;
  }, '');
}

export function AreaLine({ data, summary, className }: { data: number[]; summary: string; className?: string }) {
  const id = useId();
  const reduced = useReducedMotion() ?? false;
  const line = smoothPath(data);
  if (!line) return null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn('h-24 w-full text-brand rtl:-scale-x-100', className)} role="img" aria-label={summary}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${line} L${W},${H} L0,${H} Z`}
        fill={`url(#${id})`}
        initial={{ opacity: reduced ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: reduced ? 0 : 0.4 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: reduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduced ? 0 : 1.1, ease: ease.out }}
      />
    </svg>
  );
}
