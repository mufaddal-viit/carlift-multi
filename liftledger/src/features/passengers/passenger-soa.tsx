'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Bus } from 'lucide-react';
import { formatDay, formatMoney, formatMonth, formatPhone } from '@/core/format';
import { monthOf } from '@/core/billing';
import { todayInDubai } from '@/core/clock';
import { PageHeader } from '@/components/shell/manager-shell';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyRoad } from '@/components/illustrations';
import { SystemPage } from '@/components/shell/system-page';
import { useTenantPath } from '@/data/tenant';
import type { Locale } from '@/core/repo/types';
import { useAssignments, useFleet, usePassenger, usePassengerPayments } from '@/data/hooks';
import { Link, useRouter } from '@/i18n/navigation';
import { AssignCarDialog } from './assign-car-dialog';

interface MonthRow {
  month: string;
  expected: number;
  paid: number;
  balance: number;
}

export function PassengerSOA({ passengerId }: { passengerId: string }) {
  const t = useTranslations('soa');
  const ta = useTranslations('assign');
  const tp = useTranslations('passengers');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const passenger = usePassenger(passengerId);
  const payments = usePassengerPayments();
  const fleet = useFleet();
  const history = useAssignments(passengerId);
  const [assigning, setAssigning] = useState(false);

  const p = passenger.data;
  const car = p?.carId ? fleet.data?.find((c) => c.id === p.carId) : undefined;
  const plate = (carId: string | null) => (carId ? (fleet.data?.find((c) => c.id === carId)?.plate ?? '…') : ta('noCar'));

  const monthlyRows = useMemo(() => {
    if (!p || !payments.data) return [];
    const rows: MonthRow[] = [];
    const currentMonth = monthOf(todayInDubai());
    const startMonth = monthOf(p.joinDate);

    let month = startMonth;
    while (month <= currentMonth) {
      const expected = p.billingType === 'monthly' && month === startMonth ? p.monthlyFee : p.billingType === 'monthly' ? p.monthlyFee : 0;
      const paid = payments.data
        .filter((pm) => pm.passengerId === p.id && pm.forMonth === month)
        .reduce((sum, pm) => sum + pm.amount, 0);
      const balance = expected - paid;
      rows.push({ month, expected, paid, balance });

      const [y, m] = month.split('-').map(Number);
      const next = new Date(y, m, 1);
      month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    }
    return rows.reverse();
  }, [p, payments.data]);

  if (passenger.isLoading) {
    return (
      <>
        <PageHeader title={t('title')} />
        <Card className="h-20 animate-pulse" />
      </>
    );
  }

  if (!p) {
    return (
      <>
        <PageHeader title={t('title')} />
        <PassengerNotFound />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            {t('backToList')}
          </Button>
        }
      />

      {/* Passenger Profile Card */}
      <Card className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-ink-muted mb-1">{t('profile')}</p>
          <p className="font-semibold text-sm">{p.name}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted mb-1">{t('employer')}</p>
          <p className="font-semibold text-sm">{p.employerName}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted mb-1">{t('phone')}</p>
          <a href={`tel:+${p.phone}`} dir="ltr" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-deep underline-offset-2 hover:underline dark:text-brand">
            {formatPhone(p.phone)}
          </a>
        </div>
        <div>
          <p className="text-xs text-ink-muted mb-1">{t('joined')}</p>
          <p className="font-semibold text-sm">{formatDay(p.joinDate, locale)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted mb-1">{t('pickup')}</p>
          <p className="font-semibold text-sm">{p.pickupArea}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted mb-1">{t('dropoff')}</p>
          <p className="font-semibold text-sm">{p.dropArea}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted mb-1">{t('car')}</p>
          <p className="font-semibold text-sm" data-testid="soa-car">
            {car ? `${car.plate} · ${ta('seat', { n: p.seatNumber })}` : ta('noCar')}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted mb-1">{t('driver')}</p>
          <p className="font-semibold text-sm">{car?.driver?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted mb-1">{t('billingType')}</p>
          <p className="font-semibold text-sm">
            {p.billingType === 'monthly' ? tp('monthly') : tp('perTrip')}
          </p>
        </div>
        {p.billingType === 'monthly' && (
          <div>
            <p className="text-xs text-ink-muted mb-1">{t('monthlyFee')}</p>
            <p className="font-semibold text-sm">{formatMoney(p.monthlyFee, locale)}</p>
          </div>
        )}
        {p.billingType === 'perTrip' && (
          <div>
            <p className="text-xs text-ink-muted mb-1">{t('perTripFee')}</p>
            <p className="font-semibold text-sm">{formatMoney(p.perTripFee, locale)}</p>
          </div>
        )}
      </Card>

      {/* Car */}
      <Card className="mb-4">
        <CardHeader
          icon={<Bus />}
          title={ta('history')}
          action={
            p.status === 'active' ? (
              <Button size="sm" variant={p.carId ? 'soft' : 'primary'} onClick={() => setAssigning(true)} data-testid="soa-assign">
                {p.carId ? ta('change') : ta('assign')}
              </Button>
            ) : undefined
          }
        />
        <ol className="flex flex-col gap-2" data-testid="car-history">
          {history.data?.length === 0 && <li className="text-sm text-ink-muted">{ta('historyEmpty')}</li>}
          {history.data?.map((h) => (
            <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-inner bg-soft px-4 py-2.5 text-sm">
              <span className="font-medium">
                {h.fromCarId === null
                  ? ta('joinedCar', { to: plate(h.toCarId) })
                  : h.toCarId === null
                    ? ta('removedCar', { from: plate(h.fromCarId) })
                    : ta('movedCar', { from: plate(h.fromCarId), to: plate(h.toCarId) })}
              </span>
              <span className="text-xs text-ink-muted">
                {formatDay(h.at.slice(0, 10), locale)} · {h.byName ? ta('by', { name: h.byName }) : ta('bySystem')}
              </span>
            </li>
          ))}
        </ol>
      </Card>
      {assigning && <AssignCarDialog key={p.id + String(p.carId)} passenger={p} open onOpenChange={setAssigning} />}

      {/* Month by month: paid against expected, and what is still open. */}
      <Card>
        <CardHeader title={t('paymentHistory')} subtitle={`${t('paid')} / ${t('expected')}`} />
        {monthlyRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t('noPayments')}</p>
        ) : (
          <ul className="divide-y divide-line" aria-label={t('paymentHistory')}>
            {monthlyRows.map((r) => (
              <li key={r.month} className="flex min-h-12 items-center justify-between gap-4 py-2 text-sm">
                <span className="font-medium">{formatMonth(r.month, locale)}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular text-ink-muted">
                    {formatMoney(r.paid, locale)} / {formatMoney(r.expected, locale)}
                  </span>
                  <Badge tone={r.balance > 0 ? (r.month < monthOf(todayInDubai()) ? 'overdue' : 'partial') : 'paid'} className="tabular">
                    {r.balance > 0 ? formatMoney(r.balance, locale) : t('paid')}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

/** A passenger that does not exist, or belongs to another company: the server answers both the same way. */
function PassengerNotFound() {
  const t = useTranslations('system');
  const to = useTenantPath();
  return (
    <SystemPage
      variant="inline"
      testId="passenger-not-found"
      title={t('passengerNotFound.title')}
      body={t('passengerNotFound.body')}
      illustration={<EmptyRoad title={t('passengerNotFound.title')} />}
      actions={
        <Link href={to('/app/passengers')} className={buttonClasses({ variant: 'primary' })}>
          {t('passengerNotFound.back')}
        </Link>
      }
    />
  );
}
