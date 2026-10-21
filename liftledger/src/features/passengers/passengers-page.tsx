'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/shell/manager-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePassengers } from '@/data/hooks';
import { useTenantPath } from '@/data/tenant';
import { Link } from '@/i18n/navigation';
import type { Passenger } from '@/core/repo/types';

export function PassengersPage() {
  const t = useTranslations('passengers');
  const locale = useLocale();
  const passengers = usePassengers();
  const to = useTenantPath();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!passengers.data) return [];
    const q = search.toLowerCase().trim();
    return passengers.data.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.employerName.toLowerCase().includes(q) ||
        p.phone.includes(q),
    );
  }, [passengers.data, search]);

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
      <PageHeader
        title={t('title')}
        actions={
          <Button variant="primary">
            {t('addPassenger')}
          </Button>
        }
      />
      <div className="flex gap-3 mb-6">
        <Input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="flex-1"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-ink-muted">{t('noResults')}</p>
        </Card>
      ) : (
        <DataTable<Passenger>
          caption={t('title')}
          rows={filtered}
          rowKey={(p) => p.id}
          columns={[
            {
              key: 'name',
              header: t('name'),
              cell: (p) => (
                <Link href={to(`/app/passengers/${p.id}`)} className="text-brand hover:underline font-medium">
                  {p.name}
                </Link>
              ),
            },
            { key: 'employer', header: t('employer'), cell: (p) => p.employerName },
            { key: 'phone', header: t('phone'), cell: (p) => p.phone },
            { key: 'pickup', header: t('pickup'), cell: (p) => p.pickupArea },
            { key: 'dropoff', header: t('dropoff'), cell: (p) => p.dropArea },
            {
              key: 'status',
              header: t('status'),
              cell: (p) => (
                <StatusBadge status={p.status === 'active' ? 'paid' : 'overdue'} />
              ),
            },
          ]}
          empty={<p className="text-ink-muted text-center py-8">{t('noResults')}</p>}
        />
      )}
    </>
  );
}
