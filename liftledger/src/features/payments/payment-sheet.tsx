'use client';

import { useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Ban, MessageCircle, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { formatDay, formatMoney, formatMonth, formatReceipt, waLink } from '@/core/format';
import type { Locale, PaymentEntry } from '@/core/repo/types';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useSession, useVoidPayment } from '@/data/hooks';
import { useTenant, useTenantPath } from '@/data/tenant';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

const VOID_ERRORS = ['already-voided', 'forbidden', 'not-found'];

/** The receipt text a passenger gets on WhatsApp. */
export function useReceiptText() {
  const t = useTranslations('payments');
  const tm = useTranslations('methods');
  const locale = useLocale() as Locale;
  const company = useTenant();
  return (x: PaymentEntry) =>
    t('receipt.shareText', {
      company: company.name, no: formatReceipt(x.receiptNo), name: x.passengerName, amount: formatMoney(x.amount, locale),
      method: tm(x.method), month: formatMonth(x.forMonth, locale), date: formatDay(x.date, locale),
    });
}

/** One payment in a side panel: its details, the receipt, sharing, and voiding with a reason. */
export function PaymentSheet({ payment: x, onClose }: { payment: PaymentEntry | null; onClose: () => void }) {
  const t = useTranslations('payments');
  const tm = useTranslations('methods');
  const locale = useLocale() as Locale;
  const to = useTenantPath();
  const session = useSession();
  const receiptText = useReceiptText();
  const [voiding, setVoiding] = useState(false);

  const close = () => {
    setVoiding(false);
    onClose();
  };

  return (
    <Dialog
      variant="side"
      open={x !== null}
      onOpenChange={(open) => !open && close()}
      title={x ? t('receiptNo', { no: formatReceipt(x.receiptNo) }) : ''}
      description={x?.passengerName}
    >
      {x && (
        <div className="flex flex-col gap-6" data-testid="payment-sheet">
          <div>
            <p className={cn('tabular text-3xl font-semibold tracking-tight', x.voided && 'text-ink-muted line-through')}>{formatMoney(x.amount, locale)}</p>
            {x.voided && (
              <div className="mt-3 rounded-md bg-overdue-bg px-4 py-3 text-sm text-overdue" role="status" data-testid="void-banner">
                <p className="font-semibold">{t('voidedBanner', { date: x.voidedAt ? formatDay(x.voidedAt.slice(0, 10), locale) : '—', name: x.voidedByName ?? '—' })}</p>
                <p>{x.voidReason}</p>
              </div>
            )}
          </div>

          <dl className="divide-y divide-line">
            <Row label={t('details.passenger')}>
              {x.passengerName}
              <span className="block text-sm text-ink-muted">{x.employerName}</span>
            </Row>
            <Row label={t('details.receivedOn')}>{formatDay(x.date, locale)}</Row>
            <Row label={t('details.forMonth')}>{formatMonth(x.forMonth, locale)}</Row>
            <Row label={t('details.method')}>
              <Badge tone="neutral">{tm(x.method)}</Badge>
            </Row>
            {x.note && <Row label={t('details.note')}>{x.note}</Row>}
            <Row label={t('details.loggedBy')}>{x.loggedByName ?? '—'}</Row>
          </dl>

          <div className="grid grid-cols-2 gap-2">
            <Link href={to(`/app/payments/${x.id}`)} className={buttonClasses({ variant: 'soft' })} data-testid="sheet-receipt">
              <ReceiptText aria-hidden />
              {t('viewReceipt')}
            </Link>
            <a
              href={waLink(x.passengerPhone, receiptText(x))}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonClasses({ variant: 'whatsapp' }), x.voided && 'pointer-events-none opacity-50')}
              aria-disabled={x.voided}
            >
              <MessageCircle aria-hidden />
              {t('share')}
            </a>
          </div>

          {session.role === 'manager' && !x.voided && (
            voiding ? <VoidForm payment={x} onDone={() => setVoiding(false)} /> : (
              <Button variant="danger" onClick={() => setVoiding(true)} data-testid="sheet-void" className="self-start">
                <Ban aria-hidden />
                {t('void')}
              </Button>
            )
          )}
        </div>
      )}
    </Dialog>
  );
}

function VoidForm({ payment, onDone }: { payment: PaymentEntry; onDone: () => void }) {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const voidPayment = useVoidPayment();
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setInvalid(true);
      return;
    }
    try {
      await voidPayment.mutateAsync({ id: payment.id, reason: reason.trim() });
      toast.success(t('voidDone', { no: formatReceipt(payment.receiptNo) }));
      onDone();
    } catch (error) {
      const code = error instanceof Error && VOID_ERRORS.includes(error.message) ? error.message : 'failed';
      toast.error(t(`voidErrors.${code}`));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-md bg-overdue-bg/60 p-4" data-testid="void-form">
      <div>
        <p className="font-semibold">{t('voidTitle')}</p>
        <p className="text-sm text-ink-muted">{t('voidBody')}</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t('voidReason')}
        <textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setInvalid(false);
          }}
          maxLength={200}
          rows={2}
          placeholder={t('voidReasonPlaceholder')}
          aria-invalid={invalid}
          className="rounded-md bg-card px-3 py-2 text-base font-normal outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-brand aria-invalid:ring-2 aria-invalid:ring-overdue"
          data-testid="void-reason"
        />
      </label>
      {invalid && <p className="text-xs text-overdue">{t('voidReasonError')}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          {tc('cancel')}
        </Button>
        <Button type="submit" variant="danger" loading={voidPayment.isPending} data-testid="void-confirm">
          {t('voidConfirm')}
        </Button>
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-end font-medium">{children}</dd>
    </div>
  );
}
