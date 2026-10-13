import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Kit } from '@/features/kit/kit';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'kit' });
  return { title: t('title') };
}

export default async function KitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Kit />;
}
