'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { addMonths } from '@/core/billing';
import { formatMonth } from '@/core/format';
import type { Locale } from '@/core/repo/types';
import { cn } from '@/lib/cn';

export interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
  min?: string;
  max?: string;
  className?: string;
}

export function MonthPicker({ value, onChange, min, max, className }: MonthPickerProps) {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const prev = addMonths(value, -1);
  const next = addMonths(value, 1);
  const step =
    'grid size-11 place-items-center rounded-full text-ink-muted transition-colors outline-none hover:bg-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-30 rtl:[&_svg]:-scale-x-100';

  return (
    <div className={cn('inline-flex h-12 items-center gap-0.5 rounded-full bg-soft px-0.5', className)}>
      <button type="button" className={step} aria-label={t('previousMonth')} disabled={!!min && prev < min} onClick={() => onChange(prev)}>
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <span className="flex min-w-36 items-center justify-center gap-2 px-1 text-sm font-medium" aria-live="polite">
        <CalendarDays className="size-4 text-ink-muted" aria-hidden />
        {formatMonth(value, locale)}
      </span>
      <button type="button" className={step} aria-label={t('nextMonth')} disabled={!!max && next > max} onClick={() => onChange(next)}>
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
