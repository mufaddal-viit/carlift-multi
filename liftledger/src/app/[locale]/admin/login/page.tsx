import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SignIn } from '@/features/auth/sign-in';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  return { title: `${t('title')} · ${t('platform')}` };
}

/** The platform console's own sign-in. Company staff sign in at their company address instead. */
export default async function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SignIn platform />;
}
