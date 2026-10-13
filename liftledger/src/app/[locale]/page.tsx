import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';

// Temporary: the landing page replaces this in the Front Door build.
export default async function Index({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: '/login', locale });
}
