import { notFound } from 'next/navigation';
import { serverRepo } from '@/core/repo/server';
import { redirect } from '@/i18n/navigation';

// Registration links shared before company addresses (/register/co-majra) keep working.
export default async function LegacyRegistration({ params }: { params: Promise<{ locale: string; companyId: string }> }) {
  const { locale, companyId } = await params;
  const company = await serverRepo().companyById(companyId);
  if (!company) notFound();
  redirect({ href: `/${company.slug}/register`, locale });
}
