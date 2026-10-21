import { getTranslations, setRequestLocale } from 'next-intl/server';
import { serverRepo } from '@/core/repo/server';
import { SignIn } from '@/features/auth/sign-in';

type Props = { params: Promise<{ locale: string; company: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, company: slug } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  const company = await serverRepo().companyBySlug(slug);
  return { title: company ? `${t('title')} · ${company.name}` : t('title') };
}

export default async function CompanyLoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SignIn />;
}
