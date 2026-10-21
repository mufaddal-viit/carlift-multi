'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/shell/manager-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import type { Passenger } from '@/core/repo/types';
import { useFleet, usePassengers } from '@/data/hooks';
import { useTenantPath } from '@/data/tenant';
import { Link } from '@/i18n/navigation';
import { AssignCarDialog } from './assign-car-dialog';

type Filter = 'all' | 'waiting';

export function PassengersPage() {
  const t = useTranslations('passengers');
  const ta = useTranslations('assign');
  const passengers = usePassengers();
  const fleet = useFleet();
  const to = useTenantPath();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [assigning, setAssigning] = useState<Passenger | null>(null);

  const plates = useMemo(() => new Map((fleet.data ?? []).map((c) => [c.id, c.plate])), [fleet.data]);
  const waiting = useMemo(() => (passengers.data ?? []).filter((p) => p.status === 'active' && p.carId === null), [passengers.data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (filter === 'waiting' ? waiting : passengers.data ?? []).filter(
      (p) => p.name.toLowerCase().includes(q) || p.employerName.toLowerCase().includes(q) || p.phone.includes(q),
    );
  }, [passengers.data, waiting, filter, search]);

  if (passengers.isLoading) {
    return (
      <>
        <PageHeader title={t('title')} />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="h-12 animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (!passengers.data || passengers.data.length === 0) {
    return (
      <>
        <PageHeader title={t('title')} />
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

  return (
    <>
      <PageHeader title={t('title')} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          aria-label={t('searchPlaceholder')}
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="flex-1"
        />
        <Segmented<Filter>
          layoutId="passenger-filter"
          label={t('title')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: ta('filterAll') },
            { value: 'waiting', label: `${ta('filterWaiting')} (${waiting.length})` },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="py-8 text-center">
          <p className="text-ink-muted">{filter === 'waiting' && !search ? ta('noneWaiting') : t('noResults')}</p>
        </Card>
      ) : (
        <Card className="p-3 sm:p-5">
          <DataTable<Passenger>
            caption={t('title')}
            rows={filtered}
            rowKey={(p) => p.id}
            columns={[
              {
                key: 'name',
                header: t('name'),
                primary: true,
                cell: (p) => (
                  <Link href={to(`/app/passengers/${p.id}`)} className="font-medium text-brand-deep hover:underline dark:text-brand">
                    {p.name}
                  </Link>
                ),
              },
              { key: 'employer', header: t('employer'), cell: (p) => p.employerName },
              { key: 'phone', header: t('phone'), cell: (p) => <span dir="ltr">{p.phone}</span> },
              { key: 'route', header: t('pickup'), cell: (p) => `${p.pickupArea} → ${p.dropArea}` },
              {
                key: 'car',
                header: t('car'),
                cell: (p) =>
                  p.carId ? (
                    <span className="font-medium whitespace-nowrap" data-testid={`car-of-${p.id}`}>
                      {plates.get(p.carId) ?? '…'}
                      {p.seatNumber > 0 && <span className="text-ink-muted"> · {ta('seat', { n: p.seatNumber })}</span>}
                    </span>
                  ) : (
                    <Badge tone="partial" dot>
                      <span data-testid={`car-of-${p.id}`}>{ta('noCar')}</span>
                    </Badge>
                  ),
              },
              {
                key: 'status',
                header: t('status'),
                cell: (p) => <Badge tone={p.status === 'active' ? 'paid' : 'neutral'} dot>{t(p.status)}</Badge>,
              },
              {
                key: 'actions',
                header: '',
                align: 'end',
                cell: (p) =>
                  p.status === 'active' ? (
                    <Button size="sm" variant={p.carId ? 'soft' : 'primary'} onClick={() => setAssigning(p)} data-testid={`assign-${p.id}`}>
                      {p.carId ? ta('change') : ta('assign')}
                    </Button>
                  ) : null,
              },
            ]}
            empty={<p className="py-8 text-center text-ink-muted">{t('noResults')}</p>}
          />
        </Card>
      )}

      {assigning && (
        <AssignCarDialog key={assigning.id} passenger={assigning} open onOpenChange={(open) => !open && setAssigning(null)} />
      )}
    </>
  );
}

