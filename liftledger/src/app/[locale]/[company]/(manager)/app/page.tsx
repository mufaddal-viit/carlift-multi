import { getTranslations } from 'next-intl/server';
import { Dashboard } from '@/features/dashboard/dashboard';

export async function generateMetadata() {
  const t = await getTranslations('nav');
  return { title: t('dashboard') };
}

export default function DashboardPage() {
  return <Dashboard />;
}
