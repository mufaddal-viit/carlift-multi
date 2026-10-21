import { getTranslations, setRequestLocale } from 'next-intl/server';
import { serverRepo } from '@/core/repo/server';
import { CompanyUnavailable } from '@/features/auth/company-unavailable';
import { SignIn } from '@/features/auth/sign-in';

type Props = { params: Promise<{ locale: string; company: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, company: slug } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  const company = await serverRepo().companyBySlug(slug);
  return { title: company ? `${t('title')} · ${company.name}` : t('title') };
}

export default async function CompanyLoginPage({ params }: Props) {
  const { locale, company: slug } = await params;
  setRequestLocale(locale);
  const company = await serverRepo().companyBySlug(slug);
  if (company?.status === 'suspended') return <CompanyUnavailable company={company} />;
  return <SignIn />;
}
