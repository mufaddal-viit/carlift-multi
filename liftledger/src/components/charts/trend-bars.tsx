'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { duration, ease, spring } from '@/components/motion/tokens';

export interface TrendPoint {
  label: string;
  value: number;
  /** Shown in the bubble above the active bar, for example "82%". */
  note?: string;
}

export interface TrendBarsProps {
  data: TrendPoint[];
  /** The bar highlighted when nothing is hovered. Defaults to the last one. */
  activeIndex?: number;
  format: (n: number) => string;
  /** Plain-language description for screen readers. */
  summary: string;
  className?: string;
}

/** Rounds the axis top up to a tidy number so gridlines land on readable values. */
export function niceMax(max: number): number {
  if (max <= 4) return 4;
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].map((m) => m * pow).find((x) => x >= raw && Number.isInteger(x)) ?? Math.ceil(raw);
  return step * 4;
}

const HATCH = 'repeating-linear-gradient(135deg, transparent 0 6px, rgb(255 255 255 / 0.22) 6px 8px)';
const TICKS = [1, 0.75, 0.5, 0.25, 0];

export function TrendBars({ data, activeIndex, format, summary, className }: TrendBarsProps) {
  const reduced = useReducedMotion() ?? false;
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? activeIndex ?? data.length - 1;
  const top = niceMax(Math.max(0, ...data.map((d) => d.value)));

  return (
    <figure className={cn('m-0', className)}>
      <figcaption className="sr-only">{summary}</figcaption>
      <div className="flex gap-3" aria-hidden>
        <div className="flex h-52 flex-col justify-between pb-0 text-end text-[11px] text-ink-muted tabular">
          {TICKS.map((t) => (
            <span key={t} className="leading-none">
              {format(Math.round(top * t))}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-52">
            <div className="absolute inset-0 flex flex-col justify-between">
              {TICKS.map((t) => (
                <span key={t} className="block border-t border-dashed border-line" />
              ))}
            </div>
            <div className="absolute inset-0 flex items-end justify-around gap-2">
              {data.map((d, i) => {
                const pct = Math.max(top === 0 ? 0 : (d.value / top) * 100, d.value > 0 ? 6 : 0);
                const on = i === active;
                return (
                  <div
                    key={d.label}
                    className="relative flex h-full w-full max-w-14 items-end"
                    onPointerEnter={() => setHovered(i)}
                    onPointerLeave={() => setHovered(null)}
                  >
                    <motion.div
                      className={cn('relative w-full rounded-full transition-colors duration-300', on ? 'bg-brand-deep' : 'bg-brand/45')}
                      style={{ backgroundImage: HATCH }}
                      initial={{ height: reduced ? `${pct}%` : '0%' }}
                      animate={{ height: `${pct}%` }}
                      transition={reduced ? { duration: 0 } : { duration: 0.7, ease: ease.out, delay: i * 0.06 }}
                    >
                      {on && (
                        <>
                          <motion.span
                            layoutId="trend-dot"
                            className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-card bg-brand-deep"
                            transition={spring.sheet}
                          />
                          <motion.span
                            key={i}
                            className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-brand-deep px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-on-brand tabular"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: duration.base }}
                          >
                            {d.note ?? format(d.value)}
                          </motion.span>
                        </>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex justify-around gap-2">
            {data.map((d, i) => (
              <span
                key={d.label}
                className={cn('w-full max-w-14 text-center text-[11px] tracking-wide uppercase', i === active ? 'font-semibold text-ink' : 'text-ink-muted')}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
