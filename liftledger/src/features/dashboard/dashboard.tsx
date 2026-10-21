'use client';

import { useCallback, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Armchair, BarChart3, Clock, CreditCard, MessageCircle, Plus, ReceiptText, UserPlus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { addMonths, monthOf } from '@/core/billing';
import { todayInDubai } from '@/core/clock';
import { formatDay, formatMoney, formatMonth, formatMonthShort } from '@/core/format';
import type { DashboardData, Locale } from '@/core/repo/types';
import { AreaLine } from '@/components/charts/area-line';
import { SplitBars } from '@/components/charts/split-bars';
import { TrendBars } from '@/components/charts/trend-bars';
import { EmptyRoad } from '@/components/illustrations';
import { CountUp, Stagger, StaggerItem } from '@/components/motion';
import { PageHeader, useOpenPayment } from '@/components/shell/manager-shell';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { MonthPicker } from '@/components/ui/month-picker';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompany, useDashboard, useSession } from '@/data/hooks';
import { useTenantPath } from '@/data/tenant';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

const cornerLink =
  'grid size-11 shrink-0 place-items-center rounded-full bg-soft text-ink transition-colors outline-none hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&_svg]:size-4 rtl:[&_svg]:-scale-x-100';

/** A round arrow link to a manager section; href is the path inside the portal, such as '/app/payments'. */
function CornerLink({ href, label }: { href: string; label: string }) {
  const to = useTenantPath();
  return (
    <Link href={to(href)} aria-label={label} title={label} className={cornerLink}>
      <ArrowUpRight aria-hidden />
    </Link>
  );
}

function useMoney() {
  const locale = useLocale() as Locale;
  return useCallback((n: number) => formatMoney(n, locale), [locale]);
}

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

function CollectedCard({ data, companyName }: { data: DashboardData; companyName: string }) {
  const t = useTranslations();
  const money = useMoney();
  const { summary } = data;
  return (
    <Card className="flex flex-col">
      <CardHeader title={t('dashboard.collected')} subtitle={t('dashboard.collectedSub')} action={<CornerLink href="/app/payments" label={t('nav.payments')} />} />
      <div className="sheen flex flex-1 flex-col justify-between gap-6 rounded-md bg-brand p-4 text-on-brand">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold tracking-wide uppercase">{companyName}</span>
          <ReceiptText className="size-5 shrink-0 opacity-80" aria-hidden />
        </div>
        <div>
          <p className="text-xs opacity-80">{t('dashboard.collected')}</p>
          <p className="text-xl font-semibold" data-testid="collected-amount">
            <CountUp value={summary.collected} format={money} />
          </p>
        </div>
        <div className="flex items-end justify-between gap-3 text-xs">
          <span className="opacity-85">{t('dashboard.ofExpected', { amount: money(summary.expected) })}</span>
          <Badge tone="onBrand" className="tabular">{summary.collectionRate}%</Badge>
        </div>
      </div>
    </Card>
  );
}

function ExpectedCard({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard');
  const money = useMoney();
  const last = data.summary.trend.at(-2);
  const delta = last && last.expected > 0 ? Math.round(((data.summary.expected - last.expected) / last.expected) * 1000) / 10 : null;
  return (
    <Card>
      <p className="text-sm text-ink-muted">{t('expected')}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xl font-semibold">
          <CountUp value={data.summary.expected} format={money} />
        </p>
        {delta !== null && (
          <Badge tone={delta >= 0 ? 'brand' : 'neutral'} className="tabular">
            {delta > 0 ? '+' : ''}
            {delta}%
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-muted">{t('passengers', { count: data.rows.length })}</p>
    </Card>
  );
}

function TrendCard({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard');
  const locale = useLocale() as Locale;
  const money = useMoney();
  const [mode, setMode] = useState<'amount' | 'rate'>('amount');
  const rate = (p: { expected: number; collected: number }) => (p.expected === 0 ? 0 : Math.min(100, Math.round((p.collected / p.expected) * 100)));
  const points = data.summary.trend.map((p) => ({
    label: formatMonthShort(p.month, locale),
    value: mode === 'amount' ? p.collected : rate(p),
    note: mode === 'amount' ? `${rate(p)}%` : money(p.collected),
  }));
  const now = data.summary.trend.at(-1)!;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        icon={<BarChart3 />}
        title={t('trend')}
        subtitle={t('trendSub')}
        action={
          <Segmented
            label={t('trend')}
            layoutId="trend-mode"
            value={mode}
            onChange={setMode}
            options={[{ value: 'amount', label: t('trendAmount') }, { value: 'rate', label: t('trendRate') }]}
          />
        }
        className="flex-wrap"
      />
      <TrendBars
        key={mode}
        data={points}
        format={mode === 'amount' ? compact : (n) => `${n}%`}
        summary={t('trendSummary', { amount: money(now.collected), month: formatMonth(now.month, locale), rate: rate(now) })}
        className="mt-auto pt-8"
      />
    </Card>
  );
}

function OutstandingCard({ data }: { data: DashboardData }) {
  const t = useTranslations();
  const to = useTenantPath();
  const money = useMoney();
  const openPayment = useOpenPayment();
  const series = data.summary.trend.map((p) => Math.max(p.expected - p.collected, 0));
  return (
    <Card className="flex h-full flex-col overflow-hidden" padded={false}>
      <div className="p-4 pb-0 sm:p-6 sm:pb-0">
        <CardHeader title={t('dashboard.outstanding')} subtitle={t('dashboard.outstandingSub')} action={<CornerLink href="/app/payments" label={t('nav.payments')} />} />
        <p className="text-center text-xl font-semibold">
          <CountUp value={data.summary.outstanding} format={money} />
        </p>
      </div>
      <AreaLine data={series} summary={t('dashboard.outstandingSub')} className="mt-2 h-28 flex-1" />
      <div className="-mt-6 flex flex-wrap justify-center gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
        <Button size="sm" onClick={() => openPayment()}>
          <Plus aria-hidden />
          {t('nav.logPayment')}
        </Button>
        <Link
          href={to('/app/reminders')}
          className={cn(buttonClasses({ variant: 'soft' }))}
        >
          <MessageCircle aria-hidden />
          {t('dashboard.remindAll')}
        </Link>
      </div>
    </Card>
  );
}

function OverdueCard({ data }: { data: DashboardData }) {
  const t = useTranslations();
  const money = useMoney();
  const overdue = data.rows.filter((r) => r.ledger.status === 'overdue');
  const attention = data.rows.filter((r) => r.ledger.status === 'overdue' || r.ledger.status === 'partial');
  const amount = overdue.reduce((s, r) => s + r.ledger.balance, 0);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader icon={<AlertTriangle />} title={t('dashboard.overdue')} subtitle={t('dashboard.overdueSub')} />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xl font-semibold">
          <CountUp value={amount} format={money} />
        </p>
        <Badge tone={overdue.length ? 'overdue' : 'paid'} dot>
          {overdue.length ? t('dashboard.overduePassengers', { count: overdue.length }) : t('dashboard.allClear')}
        </Badge>
      </div>
      <div className="mt-4 flex-1 rounded-md bg-soft p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{t('dashboard.needsAttention')}</h3>
            <p className="text-xs text-ink-muted">{t('dashboard.needsAttentionSub')}</p>
          </div>
          <CornerLink href="/app/reminders" label={t('nav.reminders')} />
        </div>
        {attention.length > 0 ? (
          <>
            <AvatarStack names={attention.map((r) => r.passenger.name)} moreLabel={(count) => t('common.more', { count })} />
            <ul className="mt-4 flex flex-col gap-2.5">
              {[...attention].sort((a, b) => b.ledger.balance - a.ledger.balance).slice(0, 3).map((r) => (
                <li key={r.passenger.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.passenger.name}</span>
                    <span className="block text-xs text-ink-muted tabular">{t('dashboard.due', { amount: money(r.ledger.balance) })}</span>
                  </span>
                  <StatusBadge status={r.ledger.status} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-ink-muted">{t('dashboard.allClear')}</p>
        )}
      </div>
    </Card>
  );
}

type PaymentRow = DashboardData['recentPayments'][number];

function RecentPaymentsCard({ data }: { data: DashboardData }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const money = useMoney();
  const columns: Column<PaymentRow>[] = [
    {
      key: 'passenger', header: t('dashboard.passenger'), primary: true,
      cell: (p) => (
        <span className="flex items-center gap-3">
          <Avatar name={p.passengerName} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.passengerName}</span>
            {p.note && <span className="block truncate text-xs text-ink-muted">{p.note}</span>}
          </span>
        </span>
      ),
    },
    { key: 'date', header: t('dashboard.date'), cell: (p) => <span className="tabular">{formatDay(p.date, locale)}</span> },
    { key: 'for', header: t('dashboard.forMonth'), cell: (p) => formatMonth(p.forMonth, locale) },
    { key: 'method', header: t('dashboard.method'), cell: (p) => <Badge tone="neutral" dot>{t(`methods.${p.method}`)}</Badge> },
    { key: 'amount', header: t('dashboard.amount'), align: 'end', cell: (p) => <span className="font-semibold tabular">{money(p.amount)}</span> },
  ];
  return (
    <Card className="h-full">
      <CardHeader icon={<Clock />} title={t('dashboard.recentPayments')} subtitle={t('dashboard.recentPaymentsSub')} action={<CornerLink href="/app/payments" label={t('common.viewAll')} />} />
      <DataTable columns={columns} rows={data.recentPayments.slice(0, 6)} rowKey={(p) => p.id} empty={t('dashboard.noPayments')} caption={t('dashboard.recentPayments')} />
    </Card>
  );
}

function OccupancyCard({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard');
  return (
    <Card className="h-full">
      <CardHeader icon={<Armchair />} title={t('occupancy')} subtitle={t('occupancySub')} />
      <SplitBars
        items={data.cars.map((c) => ({
          label: `${c.plate} · ${c.driver?.name ?? c.model}`,
          value: c.passengers,
          of: c.capacity,
          detail: t('seats', { filled: c.passengers, total: c.capacity }),
        }))}
      />
    </Card>
  );
}

function MethodSplitCard({ data }: { data: DashboardData }) {
  const t = useTranslations();
  const total = data.summary.byMethod.reduce((s, m) => s + m.amount, 0);
  const tones = { cash: 'brand', transfer: 'deep', wallet: 'muted' } as const;
  return (
    <Card className="h-full">
      <CardHeader icon={<CreditCard />} title={t('dashboard.howPassengersPay')} subtitle={t('dashboard.howPassengersPaySub')} />
      <SplitBars
        items={data.summary.byMethod.map((m) => ({
          label: t(`methods.${m.method}`),
          value: m.amount,
          tone: tones[m.method],
          detail: `${total === 0 ? 0 : Math.round((m.amount / total) * 100)}%`,
        }))}
      />
    </Card>
  );
}

const GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12';

function DashboardSkeleton() {
  return (
    <div className={GRID} aria-busy="true">
      {['xl:col-span-3 h-80', 'xl:col-span-6 h-80', 'xl:col-span-3 h-80', 'md:col-span-2 xl:col-span-9 h-72', 'xl:col-span-3 h-72', 'xl:col-span-6 h-52', 'xl:col-span-6 h-52'].map((c, i) => (
        <Skeleton key={i} className={`rounded-card ${c}`} />
      ))}
    </div>
  );
}

export function Dashboard() {
  const t = useTranslations();
  const to = useTenantPath();
  const session = useSession();
  const openPayment = useOpenPayment();
  const thisMonth = monthOf(todayInDubai());
  const [month, setMonth] = useState(thisMonth);
  const company = useCompany();
  const { data, isPending, isError, refetch, isFetching } = useDashboard(month);

  return (
    <>
      <PageHeader
        greetingName={session.name.split(' ')[0]}
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} min={addMonths(thisMonth, -5)} max={addMonths(thisMonth, 1)} />
            <Button variant="outline" onClick={() => openPayment()}>
              <Plus aria-hidden />
              {t('nav.logPayment')}
            </Button>
          </>
        }
      />

      {isPending && <DashboardSkeleton />}

      {isError && (
        <Card className="flex flex-col items-center gap-3 py-14 text-center" role="alert">
          <h2 className="text-lg font-semibold">{t('common.errorTitle')}</h2>
          <p className="max-w-sm text-sm text-ink-muted">{t('common.errorBody')}</p>
          <Button onClick={() => refetch()} loading={isFetching}>{t('common.retry')}</Button>
        </Card>
      )}

      {data && data.rows.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <EmptyRoad title={t('illustrations.emptyRoad')} />
          <h2 className="text-xl font-semibold">{t('dashboard.emptyTitle')}</h2>
          <p className="max-w-sm text-sm text-ink-muted">{t('dashboard.emptyBody')}</p>
          <Link href={to('/app/passengers')} className={cn(buttonClasses(), 'mt-2')}>
            <UserPlus aria-hidden />
            {t('nav.addPassenger')}
          </Link>
        </Card>
      )}

      {data && data.rows.length > 0 && (
        <Stagger key={month} className={GRID}>
          <StaggerItem className="flex flex-col gap-4 xl:col-span-3">
            <CollectedCard data={data} companyName={company.data?.name ?? t('common.appName')} />
            <ExpectedCard data={data} />
          </StaggerItem>
          <StaggerItem className="xl:col-span-6"><TrendCard data={data} /></StaggerItem>
          <StaggerItem className="xl:col-span-3"><OutstandingCard data={data} /></StaggerItem>
          <StaggerItem className="md:col-span-2 xl:col-span-9"><RecentPaymentsCard data={data} /></StaggerItem>
          <StaggerItem className="md:col-span-2 xl:col-span-3"><OverdueCard data={data} /></StaggerItem>
          <StaggerItem className="xl:col-span-6"><OccupancyCard data={data} /></StaggerItem>
          <StaggerItem className="xl:col-span-6"><MethodSplitCard data={data} /></StaggerItem>
        </Stagger>
      )}
    </>
  );
}
