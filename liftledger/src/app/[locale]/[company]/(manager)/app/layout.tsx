import { ManagerShell } from '@/components/shell/manager-shell';
import { sessionFor } from '@/core/auth/server';
import { SessionProvider } from '@/data/hooks';
import { redirect } from '@/i18n/navigation';

type Props = { children: React.ReactNode; params: Promise<{ locale: string; company: string }> };

export default async function ManagerLayout({ children, params }: Props) {
  const { locale, company } = await params;
  const session = await sessionFor('manager', company);
  if (!session) return redirect({ href: `/${company}/login`, locale });

  return (
    <SessionProvider session={session}>
      <ManagerShell>{children}</ManagerShell>
    </SessionProvider>
  );
}
