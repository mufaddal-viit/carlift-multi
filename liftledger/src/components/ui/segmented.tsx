'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { spring } from '@/components/motion/tokens';

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** Must be unique on the page; it ties the sliding thumb to this control. */
  layoutId: string;
  label: string;
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, layoutId, label, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-full bg-soft p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative h-11 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              active ? 'text-on-brand' : 'text-ink-muted hover:text-ink',
            )}
          >
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-brand" transition={spring.sheet} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
