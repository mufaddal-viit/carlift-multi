import { notFound } from 'next/navigation';
import { serverRepo } from '@/core/repo/server';
import { isValidSlug } from '@/core/tenant';
import { TenantProvider } from '@/data/tenant';

type Props = { children: React.ReactNode; params: Promise<{ company: string }> };

/** Every page under a company address knows its company; an unknown address is a 404. */
export default async function CompanyLayout({ children, params }: Props) {
  const { company: slug } = await params;
  const company = isValidSlug(slug) ? await serverRepo().companyBySlug(slug) : null;
  if (!company) notFound();
  return <TenantProvider company={company}>{children}</TenantProvider>;
}
