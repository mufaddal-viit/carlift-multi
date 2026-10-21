'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, MessageCircle, Printer } from 'lucide-react';
import { formatDay, formatMoney, formatMonth, formatPhone, formatReceipt, waLink } from '@/core/format';
import type { Locale } from '@/core/repo/types';
import { EmptyRoad } from '@/components/illustrations';
import { Logo } from '@/components/shell/logo';
import { SystemPage } from '@/components/shell/system-page';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useReceipt } from '@/data/hooks';
import { useTenantPath } from '@/data/tenant';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { useReceiptText } from './payment-sheet';

/** A receipt to print or share. On paper only the receipt itself shows; the portal around it is hidden. */
export function ReceiptView({ paymentId }: { paymentId: string }) {
  const t = useTranslations('payments');
  const tm = useTranslations('methods');
  const locale = useLocale() as Locale;
  const to = useTenantPath();
  const receipt = useReceipt(paymentId);
  const receiptText = useReceiptText();
  const back = `${to('/app/payments')}${receipt.data ? `?month=${receipt.data.payment.forMonth}` : ''}`;

  if (receipt.isPending) return <Skeleton className="mx-auto h-[32rem] w-full max-w-xl rounded-card" />;

  if (!receipt.data) {
    return (
      <SystemPage
        variant="inline"
        testId="receipt-not-found"
        title={t('receipt.notFound')}
        body={t('receipt.notFoundBody')}
        illustration={<EmptyRoad title={t('receipt.notFound')} />}
        actions={
          <Link href={to('/app/payments')} className={buttonClasses({ variant: 'primary' })}>
            {t('back')}
          </Link>
        }
      />
    );
  }

  const { payment: x, company } = receipt.data;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={back} className={buttonClasses({ variant: 'ghost' })}>
          <ArrowLeft className="rtl:-scale-x-100" aria-hidden />
          {t('back')}
        </Link>
        <div className="flex gap-2">
          {!x.voided && (
            <a href={waLink(x.passengerPhone, receiptText(x))} target="_blank" rel="noreferrer" className={buttonClasses({ variant: 'whatsapp' })}>
              <MessageCircle aria-hidden />
              {t('share')}
            </a>
          )}
          <Button onClick={() => window.print()} data-testid="receipt-print">
            <Printer aria-hidden />
            {t('print')}
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden print:shadow-none print:ring-1 print:ring-line" data-testid="receipt">
        {x.voided && (
          <span
            className="pointer-events-none absolute inset-0 grid place-items-center text-7xl font-black tracking-widest text-overdue/20 select-none [transform:rotate(-18deg)]"
            aria-hidden
          >
            {t('receipt.void')}
          </span>
        )}

        <header className="flex items-start justify-between gap-4 border-b border-dashed border-line pb-5">
          <div className="min-w-0">
            <p className="text-xl font-semibold">{company.name}</p>
            <p className="text-sm text-ink-muted">
              {company.city} · <span dir="ltr">{formatPhone(company.phone)}</span>
            </p>
            {company.tradeLicense && <p className="text-xs text-ink-muted">{t('receipt.licence', { no: company.tradeLicense })}</p>}
          </div>
          <Logo wordmark={false} />
        </header>

        <div className="flex flex-wrap items-end justify-between gap-2 py-5">
          <div>
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('receipt.title')}</p>
            <p className="tabular text-lg font-semibold" data-testid="receipt-number">
              {formatReceipt(x.receiptNo)}
            </p>
          </div>
          <p className="text-sm text-ink-muted">{formatDay(x.date, locale)}</p>
        </div>

        {x.voided && (
          <p className="mb-4 rounded-md bg-overdue-bg px-4 py-3 text-sm text-overdue" data-testid="receipt-void">
            <span className="font-semibold">{t('voidedBanner', { date: x.voidedAt ? formatDay(x.voidedAt.slice(0, 10), locale) : '—', name: x.voidedByName ?? '—' })}</span>
            {' · '}
            {x.voidReason}
          </p>
        )}

        <dl className="divide-y divide-line">
          <Line label={t('receipt.receivedFrom')}>
            {x.passengerName}
            <span className="block text-sm font-normal text-ink-muted">
              {x.employerName} · <span dir="ltr">{formatPhone(x.passengerPhone)}</span>
            </span>
          </Line>
          <Line label={t('details.forMonth')}>{formatMonth(x.forMonth, locale)}</Line>
          <Line label={t('details.method')}>{tm(x.method)}</Line>
          {x.note && <Line label={t('details.note')}>{x.note}</Line>}
          <Line label={t('receipt.receivedBy')}>{x.loggedByName ?? '—'}</Line>
        </dl>

        <div className="mt-5 flex items-baseline justify-between rounded-md bg-soft px-4 py-4">
          <span className="text-sm font-medium text-ink-muted">{t('receipt.amount')}</span>
          <span className={cn('tabular text-3xl font-semibold tracking-tight', x.voided && 'line-through')} data-testid="receipt-amount">
            {formatMoney(x.amount, locale)}
          </span>
        </div>

        <p className="mt-5 text-center text-sm text-ink-muted">{t('receipt.thanks', { company: company.name })}</p>
      </Card>
    </div>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-end font-medium">{children}</dd>
    </div>
  );
}
