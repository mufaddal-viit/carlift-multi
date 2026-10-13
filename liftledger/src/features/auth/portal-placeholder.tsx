'use client';

import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Role } from '@/core/repo/types';
import { Shield } from '@/components/illustrations';
import { Logo } from '@/components/shell/logo';
import { LocaleToggle, ThemeToggle } from '@/components/shell/toggles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { signOut } from '@/data/session-client';
import { useRouter } from '@/i18n/navigation';

/** Temporary home for the portals that are built in later plans (driver, rider, platform admin). */
export function PortalPlaceholder({ role, name }: { role: Role; name: string }) {
  const t = useTranslations();
  const router = useRouter();
  const client = useQueryClient();

  const leave = () => {
    signOut();
    client.clear();
    router.replace('/login');
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
      <Card className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
        <Shield title={t('illustrations.shield')} className="max-w-48" />
        <p className="text-sm font-semibold text-brand-deep dark:text-brand">{t(`login.roles.${role}`)}</p>
        <h1 className="text-3xl font-medium tracking-tight">{name}</h1>
        <p className="max-w-sm text-sm text-ink-muted">{t('nav.comingSoon')}</p>
        <Button variant="soft" onClick={leave} className="mt-3">
          <LogOut className="rtl:-scale-x-100" aria-hidden />
          {t('common.signOut')}
        </Button>
      </Card>
    </main>
  );
}
