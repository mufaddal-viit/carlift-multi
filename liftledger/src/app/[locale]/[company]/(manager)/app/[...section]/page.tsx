import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Route } from '@/components/illustrations';
import { PageHeader } from '@/components/shell/manager-shell';
import { Card } from '@/components/ui/card';
import { PassengersPage } from '@/features/passengers/passengers-page';

const SECTIONS = ['fleet', 'passengers', 'payments', 'attendance', 'reminders', 'settings'] as const;
type Section = (typeof SECTIONS)[number];

export async function generateMetadata({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params;
  const key = section[0];
  const t = await getTranslations('nav');
  return { title: t(key as Section) };
}

export default async function SectionPage({ params }: { params: Promise<{ section: string[]; locale: string }> }) {
  const { section, locale } = await params;
  setRequestLocale(locale);
  const key = section[0] as Section;
  if (!SECTIONS.includes(key)) notFound();
  const t = await getTranslations();

  if (key === 'passengers') {
    // The page reads ?passenger=<id> from the URL, so it renders inside a Suspense boundary.
    return (
      <Suspense>
        <PassengersPage />
      </Suspense>
    );
  }

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
