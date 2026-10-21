'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronRight, Search, Users } from 'lucide-react';
import { monthOf } from '@/core/billing';
import type { Ledger } from '@/core/billing';
import { todayInDubai } from '@/core/clock';
import type { FleetCar, Passenger } from '@/core/repo/types';
import { PageHeader } from '@/components/shell/manager-shell';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useFleet, usePassengers, useStatusBoard } from '@/data/hooks';
import { useTenantPath } from '@/data/tenant';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { AssignCarDialog } from './assign-car-dialog';
import { PassengerSheet } from './passenger-sheet';

type Filter = 'all' | 'waiting' | 'due' | 'inactive' | `employer:${string}`;

/** Employer chips are capped so the row stays short; search still finds every employer. */
const MAX_EMPLOYER_CHIPS = 8;
/** The sheet's address: /app/passengers?passenger=<id>. */
const SHEET_PARAM = 'passenger';

/** Arabic text reads right to left; anything else (names, areas in Latin script) left to right. */
const textDir = (text: string) => (/^\s*\p{Script=Arabic}/u.test(text) ? 'rtl' : 'ltr');
const isDue = (ledger?: Ledger) => !!ledger && !ledger.nothingDue && ledger.balance > 0;
const groupLetter = (name: string, locale: string) => {
  const first = name.trim().charAt(0).toLocaleUpperCase(locale);
  return /\p{L}/u.test(first) ? first : '#';
};

export function PassengersPage() {
  const t = useTranslations('passengers');
  const ta = useTranslations('assign');
  const locale = useLocale();
  const passengers = usePassengers();
  const fleet = useFleet();
  const board = useStatusBoard(monthOf(todayInDubai()));
  const to = useTenantPath();
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [assigning, setAssigning] = useState<Passenger | null>(null);

  const cars = useMemo(() => new Map<string, FleetCar>((fleet.data ?? []).map((c) => [c.id, c])), [fleet.data]);
  const ledgers = useMemo(() => new Map<string, Ledger>((board.data ?? []).map((r) => [r.passenger.id, r.ledger])), [board.data]);

  const all = useMemo(() => passengers.data ?? [], [passengers.data]);
  const sets = useMemo(
    () => ({
      all,
      waiting: all.filter((p) => p.status === 'active' && p.carId === null),
      due: all.filter((p) => isDue(ledgers.get(p.id))),
      inactive: all.filter((p) => p.status === 'inactive'),
    }),
    [all, ledgers],
  );
  const employers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of all) counts.set(p.employerName, (counts.get(p.employerName) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale)).slice(0, MAX_EMPLOYER_CHIPS);
  }, [all, locale]);

  const groups = useMemo(() => {
    const base = filter.startsWith('employer:') ? all.filter((p) => p.employerName === filter.slice('employer:'.length)) : sets[filter as keyof typeof sets];
    const q = search.toLowerCase().trim();
    const matches = (p: Passenger) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.employerName.toLowerCase().includes(q) ||
      p.phone.includes(q.replace(/\D/g, '') || q) ||
      (p.carId ? (cars.get(p.carId)?.plate.toLowerCase().includes(q) ?? false) : false);
    const sorted = base.filter(matches).sort((a, b) => a.name.localeCompare(b.name, locale));
    const out: { letter: string; rows: Passenger[] }[] = [];
    for (const p of sorted) {
      const letter = groupLetter(p.name, locale);
      const last = out.at(-1);
      if (last && last.letter === letter) last.rows.push(p);
      else out.push({ letter, rows: [p] });
    }
    return out;
  }, [all, sets, filter, search, cars, locale]);
  const shown = groups.reduce((n, g) => n + g.rows.length, 0);

  const openId = params.get(SHEET_PARAM);
  const open = openId ? all.find((p) => p.id === openId) ?? null : null;
  const closeSheet = () => router.replace(to('/app/passengers'), { scroll: false });

  if (passengers.isLoading) {
    return (
      <>
        <PageHeader title={t('title')} />
        <Skeleton className="h-11" />
        <div className="mt-3 flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-11 w-24 rounded-full" />
          ))}
        </div>
        <ul className="mt-4" aria-busy>
          {[...Array(6)].map((_, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-2 h-3 w-3/4" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (all.length === 0) {
    return (
      <>
        <PageHeader title={t('title')} count={0} />
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <Users className="size-12 text-ink-muted" />
          <div>
            <p className="font-semibold">{t('emptyTitle')}</p>
            <p className="text-sm text-ink-muted">{t('emptyBody')}</p>
          </div>
        </Card>
      </>
    );
  }

  const emptyMessage =
    search ? t('noResults')
    : filter === 'waiting' ? ta('noneWaiting')
    : filter === 'due' ? t('noneDue')
    : filter === 'inactive' ? t('noneInactive')
    : t('noneInGroup');

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title={t('title')} count={all.length} />

      <label className="relative block">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          type="search"
          aria-label={t('searchPlaceholder')}
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          enterKeyHint="search"
          autoComplete="off"
          className="h-11 w-full rounded-md bg-soft ps-11 pe-4 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-brand"
        />
      </label>

      <ChipRow label={t('filters')} className="mt-3">
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')} count={sets.all.length} data-testid="filter-all">
          {ta('filterAll')}
        </Chip>
        <Chip selected={filter === 'waiting'} onClick={() => setFilter('waiting')} count={sets.waiting.length} data-testid="filter-waiting">
          {ta('filterWaiting')}
        </Chip>
        <Chip selected={filter === 'due'} onClick={() => setFilter('due')} count={sets.due.length} data-testid="filter-due">
          {t('filterDue')}
        </Chip>
        <Chip selected={filter === 'inactive'} onClick={() => setFilter('inactive')} count={sets.inactive.length} data-testid="filter-inactive">
          {t('filterInactive')}
        </Chip>
        {employers.map(([name, count]) => (
          <Chip key={name} selected={filter === `employer:${name}`} onClick={() => setFilter(`employer:${name}`)} count={count}>
            {name}
          </Chip>
        ))}
      </ChipRow>

      {shown === 0 ? (
        <p className="py-12 text-center text-sm text-ink-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-2" data-testid="passenger-list">
          {groups.map((g) => (
            <section key={g.letter} aria-label={g.letter}>
              <h2 className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 -mx-gutter bg-canvas px-gutter pt-3 pb-1 text-xs font-semibold text-ink-muted">
                {g.letter}
              </h2>
              <ul className="divide-y divide-line">
                {g.rows.map((p) => (
                  <PassengerRow key={p.id} passenger={p} car={p.carId ? cars.get(p.carId) : undefined} ledger={ledgers.get(p.id)} onAssign={() => setAssigning(p)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <PassengerSheet
        passenger={open}
        car={open?.carId ? cars.get(open.carId) : undefined}
        ledger={open ? ledgers.get(open.id) : undefined}
        onClose={closeSheet}
        onChangeCar={() => open && setAssigning(open)}
      />
      {assigning && <AssignCarDialog key={assigning.id} passenger={assigning} open onOpenChange={(isOpen) => !isOpen && setAssigning(null)} />}
    </div>
  );
}

function PassengerRow({ passenger: p, car, ledger, onAssign }: { passenger: Passenger; car?: FleetCar; ledger?: Ledger; onAssign: () => void }) {
  const t = useTranslations('passengers');
  const ta = useTranslations('assign');
  const to = useTenantPath();
  const due = isDue(ledger);
  const active = p.status === 'active';

  return (
    <li className="relative flex min-h-16 items-center gap-3 py-2">
      <span className="relative shrink-0">
        <Avatar name={p.name} size="md" />
        {due && (
          <span className={cn('absolute -end-0.5 -top-0.5 size-3 rounded-full ring-2 ring-canvas', ledger?.status === 'overdue' ? 'bg-overdue' : 'bg-partial')} role="img" aria-label={t('dueMarker')} />
        )}
      </span>
      {/* The link stretches over the whole row; the buttons after it sit above it so they keep their own taps. */}
      <Link
        href={`${to('/app/passengers')}?${SHEET_PARAM}=${p.id}`}
        scroll={false}
        className="min-w-0 flex-1 outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:outline-2 focus-visible:after:outline-brand"
      >
        <span className={cn('block truncate text-base font-semibold', !active && 'text-ink-muted')}>{p.name}</span>
        {/* One run of text with its own direction, so it ends in a single ellipsis and Latin names read left to right on the Arabic page. */}
        <span dir={textDir(p.employerName)} className="block truncate text-sm text-ink-muted ltr:text-left rtl:text-right">
          {p.employerName} · {p.pickupArea} <ArrowRight className="inline size-3 align-[-1px] [[dir=rtl]>&]:-scale-x-100" aria-hidden /> {p.dropArea}
        </span>
      </Link>
      <div className="relative z-10 flex shrink-0 items-center">
        {active ? (
          <button
            type="button"
            onClick={onAssign}
            aria-label={`${p.carId ? ta('change') : ta('assign')}: ${p.name}`}
            data-testid={`assign-${p.id}`}
            className="flex h-11 items-center rounded-md px-1 outline-none focus-visible:outline-2 focus-visible:outline-brand"
          >
            {car ? (
              <Badge tone="paid" className="tabular">
                <span data-testid={`car-of-${p.id}`}>
                  {car.plate}
                  {p.seatNumber > 0 && ` · ${t('seatShort', { n: p.seatNumber })}`}
                </span>
              </Badge>
            ) : (
              <Badge tone="partial" dot>
                <span data-testid={`car-of-${p.id}`}>{ta('noCar')}</span>
              </Badge>
            )}
          </button>
        ) : (
          <Badge tone="neutral" className="mx-1">
            <span data-testid={`car-of-${p.id}`}>{t('inactive')}</span>
          </Badge>
        )}
      </div>
      {/* The row itself opens the sheet; the chevron only says so. */}
      <ChevronRight className="me-1 size-5 shrink-0 text-ink-muted rtl:-scale-x-100" aria-hidden />
    </li>
  );
}
