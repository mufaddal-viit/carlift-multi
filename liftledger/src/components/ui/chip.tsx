'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  /** How many items the filter would show. */
  count?: number;
  className?: string;
  'data-testid'?: string;
}

/** A filter toggle for a horizontal row. 44px tall so it is easy to hit; the count sits after the label. */
export function Chip({ selected, onClick, children, count, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        selected ? 'bg-ink text-canvas' : 'bg-soft text-ink hover:bg-line',
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
      {count !== undefined && <span className={cn('tabular', selected ? 'text-canvas/70' : 'text-ink-muted')}>{count}</span>}
    </button>
  );
}

/** Scrolls its chips sideways on narrow screens, bleeding into the page gutter so the first chip lines up with the content. */
export function ChipRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter', className)}>
      {children}
    </div>
  );
}
