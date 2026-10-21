'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Bus } from 'lucide-react';
import { formatDay, formatMoney, formatMonth } from '@/core/format';
import { monthOf } from '@/core/billing';
import { todayInDubai } from '@/core/clock';
import { PageHeader } from '@/components/shell/manager-shell';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import type { Locale } from '@/core/repo/types';
import { useAssignments, useFleet, usePassenger, usePassengerPayments } from '@/data/hooks';
import { useRouter } from '@/i18n/navigation';
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
        <Card className="text-center py-8">
          <p className="text-ink-muted">{t('profile')}: Not found</p>
        </Card>
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
      <Card className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 mb-6">
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
          <p className="font-semibold text-sm">{p.phone}</p>
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
            {p.billingType === 'monthly' ? t('monthly') : t('perTrip')}
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
      <Card className="mb-6">
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
        <ol className="flex flex-col gap-2 px-5 pb-5" data-testid="car-history">
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

      {/* Monthly Summary */}
      <Card>
        <CardHeader title={t('paymentHistory')} />
        <div className="overflow-x-auto">
          <DataTable<MonthRow>
            caption={t('paymentHistory')}
            rows={monthlyRows}
            rowKey={(r) => r.month}
            columns={[
              {
                key: 'month',
                header: t('month'),
                cell: (r) => formatMonth(r.month, locale),
              },
              {
                key: 'expected',
                header: t('expected'),
                cell: (r) => formatMoney(r.expected, locale),
                align: 'end',
              },
              {
                key: 'paid',
                header: t('paid'),
                cell: (r) => formatMoney(r.paid, locale),
                align: 'end',
              },
              {
                key: 'balance',
                header: t('balance'),
                cell: (r) => formatMoney(r.balance, locale),
                align: 'end',
              },
            ]}
            empty={<p className="text-ink-muted text-center py-8">{t('noPayments')}</p>}
          />
        </div>
      </Card>
    </>
  );
}
