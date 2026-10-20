'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { formatDay, formatMoney, formatMonth } from '@/core/format';
import { monthOf } from '@/core/billing';
import { todayInDubai } from '@/core/clock';
import { PageHeader } from '@/components/shell/manager-shell';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { usePassenger, usePassengerPayments, useDrivers } from '@/data/hooks';
import { useRouter } from '@/i18n/navigation';

interface MonthRow {
  month: string;
  expected: number;
  paid: number;
  balance: number;
}

export function PassengerSOA({ passengerId }: { passengerId: string }) {
  const t = useTranslations('soa');
  const locale = useLocale() as any;
  const router = useRouter();
  const passenger = usePassenger(passengerId);
  const payments = usePassengerPayments();
  const drivers = useDrivers();

  const p = passenger.data;
  const driver = p && drivers.data ? drivers.data.find((d) => d.id === p.carId) : null;

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
