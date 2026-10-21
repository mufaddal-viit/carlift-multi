'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bus, FileText, MessageCircle, Phone } from 'lucide-react';
import type { Ledger } from '@/core/billing';
import { formatDay, formatMoney, formatPhone } from '@/core/format';
import type { FleetCar, Locale, Passenger } from '@/core/repo/types';
import { useOpenPayment } from '@/components/shell/manager-shell';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useTenantPath } from '@/data/tenant';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

const digits = (phone: string) => phone.replace(/\D/g, '');

/**
 * One passenger's details in a panel over the list, so the list page stays the only passengers page.
 * Everything shown comes from the list, fleet and status-board queries the page already holds: opening it fetches nothing.
 */
export function PassengerSheet({
  passenger: p,
  car,
  ledger,
  onClose,
  onChangeCar,
}: {
  passenger: Passenger | null;
  car?: FleetCar;
  ledger?: Ledger;
  onClose: () => void;
  onChangeCar: () => void;
}) {
  const t = useTranslations('passengers');
  const ta = useTranslations('assign');
  const ts = useTranslations('soa');
  const locale = useLocale() as Locale;
  const to = useTenantPath();
  const openPayment = useOpenPayment();

  return (
    <Dialog variant="side" open={p !== null} onOpenChange={(open) => !open && onClose()} title={p?.name ?? ''} description={p?.employerName}>
      {p && (
        <div className="flex flex-col gap-6" data-testid="passenger-sheet">
          <div className="flex items-center gap-3">
            <Avatar name={p.name} size="lg" />
            <div className="flex flex-wrap gap-2">
              <Badge tone={p.status === 'active' ? 'paid' : 'neutral'} dot>
                {t(p.status)}
              </Badge>
              {p.status === 'active' && p.carId === null && <Badge tone="partial">{ta('noCarHint')}</Badge>}
              {ledger && <StatusBadge status={ledger.status} nothingDue={ledger.nothingDue} />}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ActionTile href={`tel:+${digits(p.phone)}`} icon={<Phone />} label={t('callShort')} />
            <ActionTile href={`https://wa.me/${digits(p.phone)}`} icon={<MessageCircle />} label={t('whatsapp')} external />
            {p.status === 'active' ? (
              <ActionTile onClick={onChangeCar} icon={<Bus />} label={p.carId ? ta('change') : ta('assign')} primary={p.carId === null} testId="sheet-assign" />
            ) : (
              <ActionTile icon={<Bus />} label={ta('change')} disabled />
            )}
          </div>

          <section aria-labelledby="sheet-details">
            <h3 id="sheet-details" className="mb-1 text-xs font-semibold text-ink-muted">
              {t('details')}
            </h3>
            <dl className="divide-y divide-line">
              <Row label={t('phone')}>
                <a href={`tel:+${digits(p.phone)}`} dir="ltr" className="tabular inline-flex min-h-11 items-center font-medium text-brand-deep underline-offset-2 hover:underline dark:text-brand">
                  {formatPhone(p.phone)}
                </a>
              </Row>
              <Row label={t('pickup')}>{p.pickupArea}</Row>
              <Row label={t('dropoff')}>{p.dropArea}</Row>
              <Row label={t('car')}>
                {car ? (
                  <span data-testid="sheet-car">
                    {car.plate} · {car.model}
                    {p.seatNumber > 0 && ` · ${ta('seat', { n: p.seatNumber })}`}
                  </span>
                ) : (
                  <span className="text-ink-muted" data-testid="sheet-car">
                    {ta('noCar')}
                  </span>
                )}
              </Row>
              <Row label={ts('driver')}>{car?.driver?.name ?? <span className="text-ink-muted">{ta('driverless')}</span>}</Row>
              <Row label={t('billingType')}>
                {p.billingType === 'monthly' ? `${t('monthly')} · ${formatMoney(p.monthlyFee, locale)}` : `${t('perTrip')} · ${formatMoney(p.perTripFee, locale)}`}
              </Row>
              <Row label={ts('joined')}>{formatDay(p.joinDate, locale)}</Row>
            </dl>
          </section>

          {ledger && (
            <section aria-labelledby="sheet-month">
              <h3 id="sheet-month" className="mb-1 text-xs font-semibold text-ink-muted">
                {t('thisMonth')}
              </h3>
              <dl className="divide-y divide-line">
                <Row label={ts('expected')}>{formatMoney(ledger.expected, locale)}</Row>
                <Row label={ts('paid')}>{formatMoney(ledger.paid, locale)}</Row>
                <Row label={ts('balance')}>
                  <span className={cn('font-semibold', ledger.balance > 0 && !ledger.nothingDue && 'text-overdue')}>{formatMoney(ledger.balance, locale)}</span>
                </Row>
              </dl>
            </section>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {p.status === 'active' && (
              <Button onClick={() => openPayment(p.id)} className="flex-1" data-testid="sheet-log-payment">
                {ts('logPayment')}
              </Button>
            )}
            <Link href={to(`/app/passengers/${p.id}`)} className={cn(buttonClasses({ variant: 'soft' }), 'flex-1')}>
              <FileText aria-hidden />
              {t('fullStatement')}
            </Link>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-end font-medium">{children}</dd>
    </div>
  );
}

/** A square action with an icon over its label: call, message, change car. */
function ActionTile({
  href,
  onClick,
  icon,
  label,
  external,
  primary,
  disabled,
  testId,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  external?: boolean;
  primary?: boolean;
  disabled?: boolean;
  testId?: string;
}) {
  const className = cn(
    'flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&_svg]:size-5',
    primary ? 'bg-brand text-on-brand hover:bg-brand-deep' : 'bg-soft text-ink hover:bg-line',
    disabled && 'pointer-events-none opacity-50',
  );
  if (href) {
    return (
      <a href={href} className={className} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {icon}
        <span className="truncate">{label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className} data-testid={testId}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
