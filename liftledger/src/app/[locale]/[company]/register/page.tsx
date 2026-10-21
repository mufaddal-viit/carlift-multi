import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { PassengerRegistration } from '@/features/auth/passenger-registration';
import { serverRepo } from '@/core/repo/server';
import { CompanyUnavailable } from '@/features/auth/company-unavailable';

type Props = { params: Promise<{ locale: string; company: string }> };

export async function generateMetadata({ params }: Props) {
  const { company: slug } = await params;
  const company = await serverRepo().companyBySlug(slug);
  return { title: company ? `Register with ${company.name}` : 'Passenger registration' };
}

export default async function RegistrationPage({ params }: Props) {
  const { locale, company: slug } = await params;
  setRequestLocale(locale);
  const company = await serverRepo().companyBySlug(slug);
  if (!company) notFound();
  if (company.status === 'suspended') return <CompanyUnavailable company={company} />;

  return (
    <div className="flex min-h-dvh items-center justify-center px-gutter pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md">
        <PassengerRegistration companyId={company.id} companyName={company.name} />
      </div>
    </div>
  );
}
