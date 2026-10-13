'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import type { PayStatus } from '@/core/billing';
import { cn } from '@/lib/cn';
import { spring } from '@/components/motion/tokens';

const tones = {
  paid: 'bg-paid-bg text-paid',
  partial: 'bg-partial-bg text-partial',
  overdue: 'bg-overdue-bg text-overdue',
  pending: 'bg-pending-bg text-pending',
  neutral: 'bg-soft text-ink-muted',
  brand: 'bg-brand text-on-brand',
  onBrand: 'bg-on-brand/20 text-on-brand',
};

export type BadgeTone = keyof typeof tones;

export function Badge({ tone, dot, children, className }: { tone: BadgeTone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Payment status with a dot and a label, so it never relies on colour alone. Pops when the status changes. */
export function StatusBadge({ status, nothingDue, className }: { status: PayStatus; nothingDue?: boolean; className?: string }) {
  const t = useTranslations('status');
  const key = nothingDue ? 'nothingDue' : status;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={key}
        className={cn('inline-flex', className)}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.7 }}
        transition={spring.pop}
      >
        <Badge tone={nothingDue ? 'neutral' : status} dot>
          {t(key)}
        </Badge>
      </motion.span>
    </AnimatePresence>
  );
}
