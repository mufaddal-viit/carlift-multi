import { getTranslations } from 'next-intl/server';
import { EmptyRoad } from '@/components/illustrations';
import { SystemPage } from '@/components/shell/system-page';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { BackButton } from '@/components/shell/system-actions';

/** Unknown addresses, unknown companies and records that are not yours all end here. */
export default async function NotFound() {
  const t = await getTranslations('system');
  return (
    <SystemPage
      testId="page-not-found"
      eyebrow="404"
      title={t('notFound.title')}
      body={t('notFound.body')}
      illustration={<EmptyRoad title={t('notFound.title')} />}
      actions={
        <>
          {/* Signed-in people are sent on to their own portal by the address guard. */}
          <Link href="/login" className={buttonClasses({ variant: 'primary' })}>
            {t('home')}
          </Link>
          <BackButton label={t('back')} />
        </>
      }
    />
  );
}
