import { ManagerShell } from '@/components/shell/manager-shell';
import { sessionFor } from '@/core/auth/server';
import { SessionProvider } from '@/data/hooks';
import { redirect } from '@/i18n/navigation';

export default async function ManagerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await sessionFor('manager');
  if (!session) return redirect({ href: '/login', locale });

  return (
    <SessionProvider session={session}>
      <ManagerShell>{children}</ManagerShell>
    </SessionProvider>
  );
}
