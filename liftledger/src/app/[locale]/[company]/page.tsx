import { redirect } from '@/i18n/navigation';

// The proxy already sends the company root to its login; this covers requests that skip it.
export default async function CompanyRoot({ params }: { params: Promise<{ locale: string; company: string }> }) {
  const { locale, company } = await params;
  redirect({ href: `/${company}/login`, locale });
}
