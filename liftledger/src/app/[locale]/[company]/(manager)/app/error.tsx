'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Route } from '@/components/illustrations';
import { SystemPage } from '@/components/shell/system-page';
import { buttonClasses } from '@/components/ui/button';
import { useTenantPath } from '@/data/tenant';
import { Link } from '@/i18n/navigation';
import { RetryButton } from '@/components/shell/system-actions';

/** One manager section failed; the navigation around it keeps working. */
export default function SectionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('system');
  const to = useTenantPath();
  useEffect(() => console.error(error), [error]);
  return (
    <SystemPage
      variant="inline"
      testId="section-error"
      title={t('error.title')}
      body={t('error.body')}
      illustration={<Route title={t('error.title')} />}
      actions={
        <>
          <RetryButton label={t('error.retry')} onRetry={reset} />
          <Link href={to('/app')} className={buttonClasses({ variant: 'soft' })}>
            {t('dashboard')}
          </Link>
        </>
      }
      footnote={error.digest ? t('error.reference', { digest: error.digest }) : null}
    />
  );
}
