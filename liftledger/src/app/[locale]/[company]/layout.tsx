import { notFound } from 'next/navigation';
import { serverRepo } from '@/core/repo/server';
import { isValidSlug } from '@/core/tenant';
import { TenantProvider } from '@/data/tenant';
import { redirect } from '@/i18n/navigation';

type Props = { children: React.ReactNode; params: Promise<{ locale: string; company: string }> };

/**
 * Every page under a company address knows its company. A company's old address forwards to its sign-in page
 * at the new one; an unknown address is a 404.
 */
export default async function CompanyLayout({ children, params }: Props) {
  const { locale, company: slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const company = await serverRepo().companyBySlug(slug);
  if (!company) {
    const moved = await serverRepo().currentSlugFor(slug);
    if (moved) redirect({ href: `/${moved}/login`, locale });
    notFound();
  }
  return <TenantProvider company={company}>{children}</TenantProvider>;
}
