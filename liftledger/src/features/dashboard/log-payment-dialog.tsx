'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { addMonths, monthOf } from '@/core/billing';
import { todayInDubai } from '@/core/clock';
import { formatMoney, formatMonth } from '@/core/format';
import type { Locale, PayMethod } from '@/core/repo/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { useLogPayment, useStatusBoard } from '@/data/hooks';

interface FormValues {
  passengerId: string;
  search: string;
  amount: string;
  date: string;
  method: PayMethod;
  forMonth: string;
  note: string;
}

const METHODS: PayMethod[] = ['cash', 'transfer', 'wallet'];

export function LogPaymentDialog({
  open,
  onOpenChange,
  passengerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passengerId?: string;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const today = todayInDubai();
  const thisMonth = monthOf(today);
  const board = useStatusBoard(thisMonth);
  const save = useLogPayment();

  // Passengers who owe the most come first: they are the likeliest to be paying.
  const allPassengers = useMemo(() => [...(board.data ?? [])].sort((a, b) => b.ledger.balance - a.ledger.balance), [board.data]);

  const { register, handleSubmit, control, setValue, reset, formState, watch } = useForm<FormValues>({
    defaultValues: { passengerId: passengerId ?? '', search: '', amount: '', date: today, method: 'cash', forMonth: thisMonth, note: '' },
  });
  const { errors } = formState;
  const [chosenId, forMonth, searchQuery] = useWatch({ control, name: ['passengerId', 'forMonth', 'search'] });

  // Filter passengers by search query (name or employer name)
  const passengers = useMemo(() => {
    const query = (searchQuery ?? '').toLowerCase().trim();
    const filtered = query
      ? allPassengers.filter((r) => r.passenger.name.toLowerCase().includes(query) || r.passenger.employerName.toLowerCase().includes(query))
      : allPassengers;
    return filtered;
  }, [allPassengers, searchQuery]);

  const chosen = passengers.find((r) => r.passenger.id === chosenId);
  const owes = chosen && forMonth === thisMonth && chosen.ledger.balance > 0 ? chosen.ledger.balance : 0;

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = handleSubmit(async (v) => {
    const name = passengers.find((r) => r.passenger.id === v.passengerId)?.passenger.name ?? '';
    const amount = Number(v.amount);
    try {
      await save.mutateAsync({
        passengerId: v.passengerId, amount, date: v.date, method: v.method, forMonth: v.forMonth,
        ...(v.note.trim() ? { note: v.note.trim() } : {}),
      });
      toast.success(t('payment.saved', { amount: formatMoney(amount, locale), name }));
      close(false);
    } catch {
      toast.error(t('payment.failed'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={close} title={t('payment.title')} description={t('payment.subtitle')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="payment-passenger" className="text-[13px] font-medium text-ink-muted">{t('payment.passenger')}</label>
          <Input
            type="search"
            placeholder={t('common.search')}
            aria-label={t('common.search')}
            {...register('search')}
          />
          <Select
            id="payment-passenger"
            {...register('passengerId', {
              required: true,
              onChange: (e) => {
                const r = passengers.find((x) => x.passenger.id === e.target.value);
                if (r && r.ledger.balance > 0) setValue('amount', String(r.ledger.balance), { shouldValidate: formState.isSubmitted });
              },
            })}
            aria-invalid={!!errors.passengerId}
          >
            <option value="">{t('payment.choosePassenger')}</option>
            {passengers.map((r) => (
              <option key={r.passenger.id} value={r.passenger.id}>
                {r.passenger.name} ({r.passenger.employerName})
                {r.ledger.balance > 0 ? ` · ${t('dashboard.due', { amount: formatMoney(r.ledger.balance, locale) })}` : ''}
              </option>
            ))}
          </Select>
          {errors.passengerId && <p className="text-xs text-overdue">{t('payment.errorPassenger')}</p>}
          {owes ? (
            <p className="text-xs text-ink-muted mt-1">{t('payment.balanceHint', { name: chosen!.passenger.name, amount: formatMoney(owes, locale) })}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('payment.amount')} error={errors.amount && t('payment.errorAmount')}>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="350"
              className="tabular"
              {...register('amount', { validate: (v) => /^[1-9]\d{0,6}$/.test(v.trim()) })}
            />
          </Field>
          <Field label={t('payment.date')} error={errors.date && t('payment.errorDate')}>
            <Input type="date" max={today} {...register('date', { validate: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today })} />
          </Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-muted">{t('payment.method')}</span>
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <Segmented
                label={t('payment.method')}
                layoutId="payment-method"
                value={field.value}
                onChange={field.onChange}
                options={METHODS.map((m) => ({ value: m, label: t(`methods.${m}`) }))}
                className="self-start"
              />
            )}
          />
        </div>

        <Field label={t('payment.forMonth')}>
          <Select {...register('forMonth')}>
            {[-1, 0, 1].map((n) => {
              const m = addMonths(thisMonth, n);
              return (
                <option key={m} value={m}>
                  {formatMonth(m, locale)}
                </option>
              );
            })}
          </Select>
        </Field>

        <Field label={t('payment.note')}>
          <Input maxLength={120} placeholder={t('payment.notePlaceholder')} {...register('note')} />
        </Field>

        <div className="mt-2 flex justify-end gap-2.5">
          <Button variant="soft" onClick={() => close(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {t('payment.submit')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
