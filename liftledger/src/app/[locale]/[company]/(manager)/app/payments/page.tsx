import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PaymentsPage } from '@/features/payments/payments-page';

export async function generateMetadata() {
  const t = await getTranslations('nav');
  return { title: t('payments') };
}

export default async function Payments({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // The page reads ?month= and ?payment= from the address, so it renders inside a Suspense boundary.
  return (
    <Suspense>
      <PaymentsPage />
    </Suspense>
  );
}
