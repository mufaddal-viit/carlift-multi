'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Download, MessageCircle, Plus, Search } from 'lucide-react';
import { addMonths, monthOf, type Ledger } from '@/core/billing';
import { todayInDubai } from '@/core/clock';
import { formatDay, formatMoney, formatMonth, formatReceipt, waLink } from '@/core/format';
import type { Locale, PayMethod, PaymentEntry, StatusRow } from '@/core/repo/types';
import { PageHeader, useOpenPayment } from '@/components/shell/manager-shell';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { MonthPicker } from '@/components/ui/month-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentLedger, useStatusBoard } from '@/data/hooks';
import { useTenant, useTenantPath } from '@/data/tenant';
import { useRouter } from '@/i18n/navigation';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/cn';
import { PaymentSheet } from './payment-sheet';

type Tab = 'received' | 'due' | 'voided';
const METHODS: PayMethod[] = ['cash', 'transfer', 'wallet'];
/** The open payment's address: /app/payments?payment=<id>&month=<YYYY-MM>. */
const SHEET_PARAM = 'payment';
const MONTH_PARAM = 'month';
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const owes = (l: Ledger) => !l.nothingDue && l.balance > 0;
/** Overdue first, then the biggest balances. */
const dueOrder = (a: StatusRow, b: StatusRow) =>
  Number(b.ledger.status === 'overdue') - Number(a.ledger.status === 'overdue') || b.ledger.balance - a.ledger.balance;

/**
 * Everything about money for one month: what was collected against what was expected, every receipt
 * (by the month it pays for), who still owes, and what was voided. Payments are voided, never deleted.
 */
export function PaymentsPage() {
  const t = useTranslations('payments');
  const tm = useTranslations('methods');
  const locale = useLocale() as Locale;
  const company = useTenant();
  const to = useTenantPath();
  const router = useRouter();
  const params = useSearchParams();
  const openPayment = useOpenPayment();

  const thisMonth = monthOf(todayInDubai());
  const asked = params.get(MONTH_PARAM);
  const month = asked && MONTH_RE.test(asked) ? asked : thisMonth;
  const ledger = usePaymentLedger(month);
  const board = useStatusBoard(month);

  const [tab, setTab] = useState<Tab>('received');
  const [method, setMethod] = useState<PayMethod | 'all'>('all');
  const [search, setSearch] = useState('');

  const setMonth = (m: string) => router.replace(`${to('/app/payments')}?${MONTH_PARAM}=${m}`, { scroll: false });

  const entries = useMemo(() => ledger.data ?? [], [ledger.data]);
  const valid = useMemo(() => entries.filter((x) => !x.voided), [entries]);
  const voided = useMemo(() => entries.filter((x) => x.voided), [entries]);
  const due = useMemo(() => (board.data ?? []).filter((r) => owes(r.ledger)).sort(dueOrder), [board.data]);

  // Totals come from the status board, the same numbers as the dashboard: active passengers, voided payments left out.
  const totals = useMemo(() => {
    const rows = board.data ?? [];
    const expected = rows.reduce((s, r) => s + r.ledger.expected, 0);
    const collected = rows.reduce((s, r) => s + r.ledger.paid, 0);
    const outstanding = rows.reduce((s, r) => s + Math.max(r.ledger.balance, 0), 0);
    const byMethod = METHODS.map((m) => ({ method: m, amount: valid.reduce((s, x) => (x.method === m ? s + x.amount : s), 0) }));
    return { expected, collected, outstanding, rate: expected ? Math.min(100, Math.round((collected / expected) * 100)) : 0, byMethod };
  }, [board.data, valid]);

  const q = search.trim().toLowerCase();
  const receiptQuery = q.replace(/^r-?0*/, '');
  const matchesEntry = (x: PaymentEntry) =>
    !q ||
    x.passengerName.toLowerCase().includes(q) ||
    x.employerName.toLowerCase().includes(q) ||
    (receiptQuery !== '' && /^\d+$/.test(receiptQuery) && String(x.receiptNo).startsWith(receiptQuery));
  const matchesRow = (r: StatusRow) => !q || r.passenger.name.toLowerCase().includes(q) || r.passenger.employerName.toLowerCase().includes(q);

  const shownReceived = valid.filter((x) => (method === 'all' || x.method === method) && matchesEntry(x));
  const shownVoided = voided.filter(matchesEntry);
  const shownDue = due.filter(matchesRow);

  const openId = params.get(SHEET_PARAM);
  const open = openId ? (entries.find((x) => x.id === openId) ?? null) : null;
  const sheetHref = (id: string) => `${to('/app/payments')}?${MONTH_PARAM}=${month}&${SHEET_PARAM}=${id}`;
  const closeSheet = () => router.replace(`${to('/app/payments')}?${MONTH_PARAM}=${month}`, { scroll: false });

  const exportCsv = () => {
    const c = (k: string) => t(`csv.${k}`);
    const rows = [...entries].sort((a, b) => a.receiptNo - b.receiptNo);
    downloadCsv(
      `${company.slug}-payments-${month}.csv`,
      toCsv([
        ['receipt', 'date', 'passenger', 'employer', 'phone', 'amount', 'method', 'forMonth', 'note', 'loggedBy', 'status', 'voidReason'].map(c),
        ...rows.map((x) => [
          formatReceipt(x.receiptNo), x.date, x.passengerName, x.employerName, x.passengerPhone, x.amount, tm(x.method), x.forMonth,
          x.note, x.loggedByName, x.voided ? t('voided') : c('valid'), x.voidReason,
        ]),
      ]),
    );
  };

  const loading = ledger.isPending || board.isPending;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={t('title')}
        actions={
          <div className="flex gap-2">
            <Button variant="soft" onClick={exportCsv} disabled={loading || entries.length === 0} data-testid="payments-export">
              <Download aria-hidden />
              <span className="max-sm:sr-only">{t('export')}</span>
            </Button>
            <Button onClick={() => openPayment(undefined, month)} data-testid="payments-log">
              <Plus aria-hidden />
              {t('logPayment')}
            </Button>
          </div>
        }
      />

      <MonthPicker value={month} onChange={setMonth} max={addMonths(thisMonth, 3)} className="mb-4" />

      {loading ? (
        <Skeleton className="h-44 rounded-card" />
      ) : (
        <Card className="flex flex-col gap-5" data-testid="payments-summary">
          <div>
            <p className="text-sm text-ink-muted">{t('collected')}</p>
            <p className="tabular text-3xl font-semibold tracking-tight" data-testid="payments-collected">
              {formatMoney(totals.collected, locale)}
            </p>
            <p className="text-sm text-ink-muted">
              {t('ofExpected', { amount: formatMoney(totals.expected, locale) })} · {t('rate', { rate: totals.rate })}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
              <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${totals.rate}%` }} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <Stat label={t('outstanding')} value={formatMoney(totals.outstanding, locale)} detail={t('owing', { count: due.length })} tone={due.length ? 'overdue' : undefined} />
            <Stat label={t('receipts')} value={String(valid.length)} detail={t('receiptsSub', { count: voided.length })} />
          </dl>
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-muted">{t('byMethod')}</p>
            <ul className="flex flex-col gap-2">
              {totals.byMethod.map(({ method: m, amount }) => {
                const total = totals.byMethod.reduce((s, x) => s + x.amount, 0);
                return (
                  <li key={m} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="truncate">{tm(m)}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                      <span className="block h-full rounded-full bg-ink/70" style={{ width: `${total ? (amount / total) * 100 : 0}%` }} />
                    </span>
                    <span className="tabular font-medium">{formatMoney(amount, locale)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      )}

      <label className="relative mt-5 block">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          type="search"
          aria-label={t('search')}
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          enterKeyHint="search"
          autoComplete="off"
          className="h-11 w-full rounded-md bg-soft ps-11 pe-4 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-brand"
        />
      </label>

      <ChipRow label={t('show')} className="mt-3">
        {(['received', 'due', 'voided'] as const).map((k) => (
          <Chip key={k} selected={tab === k} onClick={() => setTab(k)} count={{ received: valid.length, due: due.length, voided: voided.length }[k]} data-testid={`tab-${k}`}>
            {t(`tabs.${k}`)}
          </Chip>
        ))}
        {tab === 'received' && (
          <>
            <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden />
            {(['all', ...METHODS] as const).map((m) => (
              <Chip key={m} selected={method === m} onClick={() => setMethod(m)} data-testid={`method-${m}`}>
                {m === 'all' ? t('allMethods') : tm(m)}
              </Chip>
            ))}
          </>
        )}
      </ChipRow>

      <div className="mt-2 pb-6">
        {loading ? (
          <ListSkeleton />
        ) : tab === 'received' ? (
          <ReceivedList entries={shownReceived} empty={q || method !== 'all' ? t('noResults') : t('emptyReceived', { month: formatMonth(month, locale) })} href={sheetHref} />
        ) : tab === 'due' ? (
          <DueList rows={shownDue} month={month} empty={q ? t('noResults') : t('emptyDue', { month: formatMonth(month, locale) })} />
        ) : (
          <ReceivedList entries={shownVoided} empty={q ? t('noResults') : t('emptyVoided', { month: formatMonth(month, locale) })} href={sheetHref} />
        )}
      </div>

      <PaymentSheet payment={open} onClose={closeSheet} />
    </div>
  );
}

function Stat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: 'overdue' }) {
  return (
    <div className="rounded-md bg-soft p-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={cn('tabular mt-0.5 text-lg font-semibold', tone === 'overdue' && 'text-overdue')}>{value}</dd>
      <dd className="text-xs text-ink-muted">{detail}</dd>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul aria-busy>
      {[...Array(5)].map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-20" />
        </li>
      ))}
    </ul>
  );
}

/** Payments grouped under the day the money came in, newest first. Each row opens its detail panel. */
function ReceivedList({ entries, empty, href }: { entries: PaymentEntry[]; empty: string; href: (id: string) => string }) {
  const t = useTranslations('payments');
  const tm = useTranslations('methods');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const days = useMemo(() => {
    const out: { day: string; rows: PaymentEntry[] }[] = [];
    for (const x of entries) {
      const last = out.at(-1);
      if (last && last.day === x.date) last.rows.push(x);
      else out.push({ day: x.date, rows: [x] });
    }
    return out;
  }, [entries]);

  if (entries.length === 0) return <p className="py-12 text-center text-sm text-ink-muted">{empty}</p>;

  return (
    <div data-testid="payment-list">
      {days.map((d) => (
        <section key={d.day} aria-label={formatDay(d.day, locale)}>
          <h2 className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 -mx-gutter flex justify-between bg-canvas px-gutter pt-3 pb-1 text-xs font-semibold text-ink-muted">
            <span>{formatDay(d.day, locale)}</span>
            <span className="tabular">{formatMoney(d.rows.filter((x) => !x.voided).reduce((s, x) => s + x.amount, 0), locale)}</span>
          </h2>
          <ul className="divide-y divide-line">
            {d.rows.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => router.replace(href(x.id), { scroll: false })}
                  data-testid={`payment-${x.receiptNo}`}
                  className="flex min-h-16 w-full items-center gap-3 rounded-md py-2 text-start outline-none focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <Avatar name={x.passengerName} size="md" className={cn(x.voided && 'opacity-50')} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-base font-semibold', x.voided && 'text-ink-muted')}>{x.passengerName}</span>
                    <span className="block truncate text-sm text-ink-muted">
                      <span className="tabular">{formatReceipt(x.receiptNo)}</span> · {tm(x.method)}
                      {x.voided ? ` · ${t('voidedLine', { name: x.voidedByName ?? '—', reason: x.voidReason ?? '' })}` : x.note ? ` · ${x.note}` : ''}
                    </span>
                  </span>
                  <span className={cn('tabular shrink-0 text-base font-semibold', x.voided && 'text-ink-muted line-through')}>
                    {formatMoney(x.amount, locale)}
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-ink-muted rtl:-scale-x-100" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Who still owes for the month, overdue first: record their payment or send a WhatsApp reminder. */
function DueList({ rows, month, empty }: { rows: StatusRow[]; month: string; empty: string }) {
  const t = useTranslations('payments');
  const locale = useLocale() as Locale;
  const company = useTenant();
  const openPayment = useOpenPayment();

  if (rows.length === 0) return <p className="py-12 text-center text-sm text-ink-muted">{empty}</p>;

  return (
    <ul className="divide-y divide-line" data-testid="due-list">
      {rows.map(({ passenger: p, ledger }) => {
        const amount = formatMoney(ledger.balance, locale);
        const message = t('reminderText', { name: p.name, company: company.name, month: formatMonth(month, locale), amount });
        return (
          <li key={p.id} className="flex min-h-16 items-center gap-3 py-2" data-testid={`due-${p.id}`}>
            <Avatar name={p.name} size="md" />
            {/* The amount sits under the name, so on a phone the name keeps the width it needs. */}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{p.name}</span>
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className="tabular shrink-0 font-semibold text-overdue" data-testid="due-amount">{amount}</span>
                <StatusBadge status={ledger.status} />
                <span className="hidden truncate text-ink-muted sm:inline">{p.employerName}</span>
              </span>
            </span>
            <a
              href={waLink(p.phone, message)}
              target="_blank"
              rel="noreferrer"
              aria-label={t('remindLabel', { name: p.name })}
              title={t('remind')}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-paid-bg text-paid outline-none hover:brightness-95 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <MessageCircle className="size-5" aria-hidden />
            </a>
            <Button size="sm" onClick={() => openPayment(p.id, month)} aria-label={t('recordLabel', { name: p.name })} data-testid={`record-${p.id}`}>
              {t('record')}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
