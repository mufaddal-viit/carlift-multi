import { sessionFor } from '@/core/auth/server';
import { PortalPlaceholder } from '@/features/auth/portal-placeholder';
import { redirect } from '@/i18n/navigation';

// Temporary: replaced by the real portal in its own build.
export default async function Page({ params }: { params: Promise<{ locale: string; company: string }> }) {
  const { locale, company } = await params;
  const session = await sessionFor('passenger', company);
  if (!session) return redirect({ href: `/${company}/login`, locale });
  return <PortalPlaceholder role={session.role} name={session.name} loginHref={`/${company}/login`} />;
}
