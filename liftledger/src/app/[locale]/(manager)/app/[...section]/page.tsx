import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Route } from '@/components/illustrations';
import { PageHeader } from '@/components/shell/manager-shell';
import { Card } from '@/components/ui/card';

// Temporary: each of these sections gets its real screens in the Manager Portal build.
const SECTIONS = ['fleet', 'passengers', 'payments', 'attendance', 'reminders', 'settings'] as const;
type Section = (typeof SECTIONS)[number];

export default async function ComingSoon({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params;
  const key = section[0] as Section;
  if (!SECTIONS.includes(key)) notFound();
  const t = await getTranslations();

  return (
    <>
      <PageHeader title={t(`nav.${key}`)} />
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <Route title={t('illustrations.route')} />
        <p className="max-w-sm text-ink-muted">{t('nav.comingSoon')}</p>
      </Card>
    </>
  );
}
