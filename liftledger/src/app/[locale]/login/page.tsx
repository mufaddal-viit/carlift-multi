import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DemoLogin } from '@/features/auth/demo-login';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  return { title: t('title') };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DemoLogin />;
}
