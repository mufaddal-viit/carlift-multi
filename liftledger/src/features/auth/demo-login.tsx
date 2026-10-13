'use client';

import { useState } from 'react';
import { ArrowRight, Briefcase, Bus, ShieldCheck, User, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { homeFor } from '@/core/auth/guards';
import type { DemoUser, Role } from '@/core/repo/types';
import { Van } from '@/components/illustrations';
import { Stagger, StaggerItem } from '@/components/motion';
import { Logo } from '@/components/shell/logo';
import { LocaleToggle, ThemeToggle } from '@/components/shell/toggles';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemoUsers, useRepo } from '@/data/hooks';
import { signIn } from '@/data/session-client';
import { Link, useRouter } from '@/i18n/navigation';

const ICONS: Record<Role, LucideIcon> = { admin: ShieldCheck, manager: Briefcase, driver: Bus, rider: User };
const ORDER: Role[] = ['manager', 'driver', 'rider', 'admin'];

/** Temporary front door: one tap into any role. Replaced by the full sign-in page in the Front Door build. */
export function DemoLogin() {
  const t = useTranslations('login');
  const repo = useRepo();
  const router = useRouter();
  const users = useDemoUsers();
  const [busy, setBusy] = useState<string | null>(null);

  // One account per role keeps the choice simple.
  const accounts = ORDER.map((role) => users.data?.find((u) => u.role === role)).filter((u): u is DemoUser => !!u);

  const enter = async (user: DemoUser) => {
    setBusy(user.id);
    try {
      const session = await repo.loginAs(user.id);
      signIn(session);
      router.replace(homeFor(session.role));
    } catch {
      toast.error(t('failed'));
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-2">
          <LocaleToggle className="bg-card shadow-card" />
          <ThemeToggle className="bg-card shadow-card" />
        </div>
      </header>

      <Card className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
        <Van title={t('title')} className="max-w-52" />
        <h1 className="mt-2 text-3xl font-medium tracking-tight">{t('title')}</h1>
        <p className="max-w-sm text-sm text-ink-muted">{t('subtitle')}</p>

        <Stagger className="mt-6 flex w-full max-w-sm flex-col gap-2.5">
          {users.isPending && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[68px] rounded-[22px]" />)}
          {accounts.map((u) => {
            const Icon = ICONS[u.role];
            return (
              <StaggerItem key={u.id}>
                <button
                  type="button"
                  disabled={busy !== null}
                  aria-busy={busy === u.id || undefined}
                  aria-label={t('continueAs', { name: u.name })}
                  data-testid={`demo-${u.role}`}
                  onClick={() => enter(u)}
                  className="group flex w-full items-center gap-3.5 rounded-[22px] bg-soft p-3 text-start transition-[background-color,transform] outline-none hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] disabled:opacity-60"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t(`roles.${u.role}`)}</span>
                    <span className="block truncate text-xs text-ink-muted">{u.name}</span>
                  </span>
                  <ArrowRight className="size-5 text-ink-muted transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden />
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Link href="/dev/kit" className="mt-5 text-sm font-medium text-brand-deep underline-offset-4 hover:underline dark:text-brand">
          {t('kit')}
        </Link>
      </Card>
    </main>
  );
}
