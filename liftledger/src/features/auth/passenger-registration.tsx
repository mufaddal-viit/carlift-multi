'use client';

import { useCallback, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DROPOFF_LOCATIONS, PICKUP_LOCATIONS } from '@/core/locations';
import type { RegistrationInput } from '@/core/repo/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { useRegisterPassenger } from '@/data/hooks';

interface FormValues {
  name: string;
  employerName: string;
  phone: string;
  pickupArea: string;
  dropoffArea: string;
}

export function PassengerRegistration({ companyId, companyName }: { companyId: string; companyName: string }) {
  const t = useTranslations('register');
  const locale = useLocale();
  const register = useRegisterPassenger();
  const [success, setSuccess] = useState(false);

  const { control, register: reg, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: { name: '', employerName: '', phone: '', pickupArea: '', dropoffArea: '' },
  });
  const { errors } = formState;

  const submit = handleSubmit(async (v) => {
    const phone = v.phone.replace(/\D/g, '');
    if (!/^971\d{9}$/.test(phone)) {
      toast.error(t('errorPhone'));
      return;
    }
    try {
      await register.mutateAsync({
        companyId,
        input: {
          name: v.name,
          employerName: v.employerName,
          phone,
          pickupArea: v.pickupArea,
          dropArea: v.dropoffArea,
        } as RegistrationInput,
      });
      setSuccess(true);
    } catch (err: any) {
      if (err.message === 'duplicate-phone') {
        toast.error(t('duplicatePhone'));
      } else {
        toast.error(t('errorName'));
      }
    }
  });

  if (success) {
    return (
      <Card className="flex flex-col gap-6 py-12 px-6 text-center">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{t('successTitle')}</h2>
          <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">{t('successBody')}</p>
        </div>
        <Button onClick={() => setSuccess(false)}>{t('done')}</Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6 py-8 px-6">
      <div>
        <h2 className="text-2xl font-semibold mb-1">{t('title')}</h2>
        <p className="text-sm text-ink-muted">{t('subtitle')}</p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label={t('name')} error={errors.name && t('errorName')}>
          <Input
            placeholder={t('namePlaceholder')}
            {...reg('name', { required: true })}
          />
        </Field>

        <Field label={t('employerName')} error={errors.employerName && t('errorEmployer')}>
          <Input
            placeholder={t('employerPlaceholder')}
            {...reg('employerName', { required: true })}
          />
        </Field>

        <Field label={t('phone')} error={errors.phone && t('errorPhone')} hint={t('phoneHint')}>
          <Input
            type="tel"
            inputMode="tel"
            placeholder={t('phonePlaceholder')}
            {...reg('phone', {
              required: true,
              pattern: /^(0|971)?5\d{8}$/,
            })}
          />
        </Field>

        <Field label={t('pickup')} error={errors.pickupArea && t('errorPickup')}>
          <Select {...reg('pickupArea', { required: true })}>
            <option value="">{t('choosePrimary')}</option>
            {PICKUP_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t('dropoff')} error={errors.dropoffArea && t('errorDropoff')}>
          <Select {...reg('dropoffArea', { required: true })}>
            <option value="">{t('chooseDropoff')}</option>
            {DROPOFF_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex gap-3 justify-end mt-4">
          <Button type="submit" loading={register.isPending}>
            {register.isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
