import { DEFAULT_COMPANY_SLUG } from '@/core/tenant';
import { redirect } from '@/i18n/navigation';

// While LiftLedger serves one operator, the bare login opens that operator's sign-in.
export default async function LoginRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: `/${DEFAULT_COMPANY_SLUG}/login`, locale });
}
