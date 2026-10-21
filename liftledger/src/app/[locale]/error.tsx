'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Route } from '@/components/illustrations';
import { SystemPage } from '@/components/shell/system-page';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { RetryButton } from '@/components/shell/system-actions';

/** A page that failed to load or render. The digest lets support find the matching server log. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('system');
  useEffect(() => console.error(error), [error]);
  return (
    <SystemPage
      testId="page-error"
      title={t('error.title')}
      body={t('error.body')}
      illustration={<Route title={t('error.title')} />}
      actions={
        <>
          <RetryButton label={t('error.retry')} onRetry={reset} />
          <Link href="/login" className={buttonClasses({ variant: 'soft' })}>
            {t('home')}
          </Link>
        </>
      }
      footnote={error.digest ? t('error.reference', { digest: error.digest }) : null}
    />
  );
}
