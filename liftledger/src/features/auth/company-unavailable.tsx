import { Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Shield } from '@/components/illustrations';
import { SystemPage } from '@/components/shell/system-page';
import { buttonClasses } from '@/components/ui/button';
import type { PublicCompany } from '@/core/repo/types';

/** Shown on a suspended company's sign-in and registration addresses instead of a form that cannot work. */
export async function CompanyUnavailable({ company }: { company: PublicCompany }) {
  const t = await getTranslations('system');
  return (
    <SystemPage
      testId="company-unavailable"
      title={t('unavailable.title', { company: company.name })}
      body={t('unavailable.body', { company: company.name })}
      illustration={<Shield title={t('unavailable.title', { company: company.name })} />}
      actions={
        <a href={`tel:+${company.phone}`} className={buttonClasses({ variant: 'primary' })}>
          <Phone aria-hidden />
          {t('unavailable.call', { company: company.name })}
        </a>
      }
    />
  );
}
