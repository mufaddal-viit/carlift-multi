'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { ease } from '@/components/motion/tokens';

const tones = { brand: 'bg-brand', deep: 'bg-brand-deep', muted: 'bg-ink-muted', warn: 'bg-partial' };

export interface SplitItem {
  label: string;
  value: number;
  /** Text at the end of the row, for example "48%" or "4 of 14 seats". */
  detail: string;
  tone?: keyof typeof tones;
}

/** Labelled horizontal bars. `max` defaults to the sum, which makes each bar a share of the whole. */
export function SplitBars({ items, max, className }: { items: SplitItem[]; max?: number; className?: string }) {
  const reduced = useReducedMotion() ?? false;
  const total = max ?? items.reduce((s, i) => s + i.value, 0);

  return (
    <ul className={cn('flex flex-col gap-4', className)}>
      {items.map((item, i) => {
        const pct = total === 0 ? 0 : Math.min(100, (item.value / total) * 100);
        return (
          <li key={item.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-medium">{item.label}</span>
              <span className="shrink-0 text-ink-muted tabular">{item.detail}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-soft">
              <motion.div
                className={cn('h-full rounded-full', tones[item.tone ?? 'brand'])}
                initial={{ width: reduced ? `${pct}%` : '0%' }}
                animate={{ width: `${pct}%` }}
                transition={reduced ? { duration: 0 } : { duration: 0.8, ease: ease.out, delay: 0.1 + i * 0.08 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
