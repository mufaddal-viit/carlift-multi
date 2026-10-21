'use client';

import { useState } from 'react';
import { Bus, CircleSlash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { FleetCar, Passenger } from '@/core/repo/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssignCar, useFleet } from '@/data/hooks';
import { cn } from '@/lib/cn';

const NO_CAR = 'none';

/** Error codes the server can answer with when a car cannot be given. */
const KNOWN_ERRORS = ['car-full', 'car-inactive', 'passenger-inactive', 'not-found'];

/**
 * Chooses the car a passenger rides in, or takes them out of their car.
 * Each car shows its driver and seats taken; full and inactive cars are listed but cannot be chosen.
 * Mount it with `key={passenger.id}` so the choice starts from that passenger's current car.
 */
export function AssignCarDialog({ passenger, open, onOpenChange }: { passenger: Passenger; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('assign');
  const fleet = useFleet();
  const assign = useAssignCar();
  const [choice, setChoice] = useState<string>(passenger.carId ?? NO_CAR);

  const cars = [...(fleet.data ?? [])].sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || a.plate.localeCompare(b.plate));
  const unchanged = choice === (passenger.carId ?? NO_CAR);

  const save = async () => {
    const carId = choice === NO_CAR ? null : choice;
    try {
      await assign.mutateAsync({ passengerId: passenger.id, carId });
      const car = cars.find((c) => c.id === carId);
      toast.success(car ? t('saved', { name: passenger.name, plate: car.plate }) : t('removed', { name: passenger.name }));
      onOpenChange(false);
    } catch (e) {
      const code = e instanceof Error && KNOWN_ERRORS.includes(e.message) ? e.message : 'failed';
      toast.error(t(`errors.${code}`));
      void fleet.refetch(); // Seats may have changed under us.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={passenger.carId ? t('change') : t('assign')} description={t('description', { name: passenger.name })}>
      <div role="radiogroup" aria-label={t('title')} className="flex flex-col gap-2" data-testid="car-options">
        {fleet.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-[18px]" />)}
        {cars.map((car) => (
          <CarOption key={car.id} car={car} current={car.id === passenger.carId} selected={choice === car.id} onSelect={() => setChoice(car.id)} />
        ))}
        {fleet.data && (
          <Option
            id={NO_CAR}
            selected={choice === NO_CAR}
            onSelect={() => setChoice(NO_CAR)}
            icon={<CircleSlash aria-hidden />}
            title={t('noCar')}
            detail={t('noCarHint')}
            badge={passenger.carId === null ? <Badge tone="neutral">{t('current')}</Badge> : null}
          />
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t('cancel')}
        </Button>
        <Button onClick={save} loading={assign.isPending} disabled={unchanged || fleet.isPending} data-testid="assign-save">
          {t('save')}
        </Button>
      </div>
    </Dialog>
  );
}

function CarOption({ car, current, selected, onSelect }: { car: FleetCar; current: boolean; selected: boolean; onSelect: () => void }) {
  const t = useTranslations('assign');
  const full = car.passengers >= car.capacity;
  const inactive = car.status !== 'active';
  // The current car stays choosable even when full: the passenger already holds one of its seats.
  const blocked = !current && (full || inactive);
  return (
    <Option
      id={car.id}
      selected={selected}
      disabled={blocked}
      onSelect={onSelect}
      icon={<Bus aria-hidden />}
      title={`${car.plate} · ${car.model}`}
      detail={car.driver?.name ?? t('driverless')}
      meter={{ used: car.passengers, total: car.capacity }}
      badge={
        current ? <Badge tone="brand">{t('current')}</Badge>
        : inactive ? <Badge tone="neutral">{t('inactive')}</Badge>
        : full ? <Badge tone="overdue">{t('full')}</Badge>
        : null
      }
    />
  );
}

function Option({
  id, selected, disabled, onSelect, icon, title, detail, badge, meter,
}: {
  id: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  detail: string;
  badge?: React.ReactNode;
  meter?: { used: number; total: number };
}) {
  const t = useTranslations('assign');
  return (
    <label
      data-testid={`car-option-${id}`}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-[18px] p-3 ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
        selected ? 'bg-brand-tint ring-brand' : 'bg-soft ring-transparent hover:bg-line',
        disabled && 'cursor-not-allowed opacity-55 hover:bg-soft',
      )}
    >
      <input type="radio" name="car" value={id} checked={selected} disabled={disabled} onChange={onSelect} className="sr-only" />
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-5', selected ? 'bg-brand text-on-brand' : 'bg-card text-ink-muted')}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold" dir="auto">{title}</span>
          {badge}
        </span>
        <span className="block truncate text-xs text-ink-muted">{detail}</span>
        {meter && (
          <span className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
              <span
                className={cn('block h-full rounded-full', meter.used >= meter.total ? 'bg-overdue' : 'bg-brand')}
                style={{ width: `${Math.min(100, Math.round((meter.used / Math.max(meter.total, 1)) * 100))}%` }}
              />
            </span>
            <span className="text-xs font-medium whitespace-nowrap text-ink-muted tabular-nums">{t('seats', { used: meter.used, total: meter.total })}</span>
          </span>
        )}
      </span>
    </label>
  );
}
