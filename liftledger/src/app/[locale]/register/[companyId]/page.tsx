import { setRequestLocale } from 'next-intl/server';
import { PassengerRegistration } from '@/features/auth/passenger-registration';
import { createMockRepository } from '@/core/repo/mock';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; companyId: string }> }) {
  const { locale, companyId } = await params;
  const repo = createMockRepository({ latency: [0, 0] });
  const company = await repo.companyById(companyId);
  const title = company ? `Register with ${company.name}` : 'Passenger Registration';
  return { title };
}

export default async function RegistrationPage({ params }: { params: Promise<{ locale: string; companyId: string }> }) {
  const { locale, companyId } = await params;
  setRequestLocale(locale);

  const repo = createMockRepository({ latency: [0, 0] });
  const company = await repo.companyById(companyId);

  if (!company) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Registration Not Found</h1>
          <p className="text-ink-muted">This registration link is not valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <PassengerRegistration companyId={companyId} companyName={company.name} />
      </div>
    </div>
  );
}
