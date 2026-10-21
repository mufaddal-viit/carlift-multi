'use client';

import { useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, Briefcase, Bus, Eye, EyeOff, ShieldCheck, User, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DEMO_PASSWORD } from '@/core/repo/seed';
import type { DemoUser, Role } from '@/core/repo/types';
import { Van } from '@/components/illustrations';
import { Logo } from '@/components/shell/logo';
import { LocaleToggle, ThemeToggle } from '@/components/shell/toggles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemoUsers } from '@/data/hooks';
import { signIn, type SignInError } from '@/data/session-client';
import { useTenant } from '@/data/tenant';
import { Link, useRouter } from '@/i18n/navigation';

const ICONS: Record<Role, LucideIcon> = { admin: ShieldCheck, manager: Briefcase, driver: Bus, passenger: User };
const ORDER: Role[] = ['manager', 'driver', 'passenger', 'admin'];

/** One demo account per role, in the order people usually try them. */
function demoAccounts(users: DemoUser[]) {
  const firsts = users.filter((u, i) => users.findIndex((x) => x.role === u.role) === i);
  return firsts.sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));
}

/** Signs in to the company whose address the page is under, or to the platform console. */
export function SignIn({ platform = false }: { platform?: boolean }) {
  return platform ? <SignInForm slug={null} /> : <CompanySignIn />;
}

function CompanySignIn() {
  const company = useTenant();
  return <SignInForm slug={company.slug} companyName={company.name} />;
}

function SignInForm({ slug, companyName }: { slug: string | null; companyName?: string }) {
  const t = useTranslations('login');
  const router = useRouter();
  const users = useDemoUsers(slug);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);
  const [busy, setBusy] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError('invalid-input');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signIn(identifier, password, slug);
    if ('home' in result) {
      router.replace(result.home);
      router.refresh();
      return;
    }
    setError(result.error);
    setBusy(false);
  };

  const fill = (u: DemoUser) => {
    setIdentifier(u.email ?? '');
    setPassword(DEMO_PASSWORD);
    setError(null);
    submitRef.current?.focus();
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

      <Card className="flex flex-col items-center gap-2 py-8 text-center">
        <Van title={t('title')} className="max-w-40" />
        <p className="mt-2 text-sm font-semibold text-brand-deep dark:text-brand">{t('title')}</p>
        <h1 className="text-3xl font-medium tracking-tight" data-testid="login-company">
          {companyName ?? t('platform')}
        </h1>
        <p className="max-w-sm text-sm text-ink-muted">{companyName ? t('subtitle') : t('platformSubtitle')}</p>

        <form onSubmit={submit} noValidate className="mt-6 flex w-full max-w-sm flex-col gap-4 text-start">
          <Field label={t('identifier')}>
            <Input
              name="identifier"
              autoComplete="username"
              inputMode="email"
              dir="auto"
              placeholder={t('identifierPlaceholder')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              data-testid="login-identifier"
            />
          </Field>
          <div className="relative">
            <Field label={t('password')}>
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pe-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password"
              />
            </Field>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              aria-pressed={showPassword}
              className="absolute end-1 bottom-1 grid size-10 place-items-center rounded-full text-ink-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          </div>

          {error && (
            <p role="alert" data-testid="login-error" className="flex items-start gap-2 rounded-inner bg-overdue-bg px-4 py-3 text-sm text-overdue">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t(`errors.${error}`)}
            </p>
          )}

          <Button ref={submitRef} type="submit" size="lg" loading={busy} data-testid="login-submit" className="mt-1 w-full">
            {t('submit')}
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-medium">{t('demoTitle')}</h2>
          <p className="text-sm text-ink-muted">{t('demoHint', { password: DEMO_PASSWORD })}</p>
        </div>
        {users.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-[18px]" />)}
        <div className="flex flex-col gap-2">
            {demoAccounts(users.data ?? []).map((u) => {
              const Icon = ICONS[u.role];
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => fill(u)}
                  data-testid={`demo-${u.id}`}
                  aria-label={t('fillAs', { name: u.name })}
                  className="group flex w-full items-center gap-3 rounded-[18px] bg-soft p-2.5 text-start transition-colors outline-none hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {t(`roles.${u.role}`)} · {u.name}
                    </span>
                    <span className="block truncate text-xs text-ink-muted" dir="ltr">
                      {u.email}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden />
                </button>
              );
            })}
        </div>
        <Link href="/dev/kit" className="text-sm font-medium text-brand-deep underline-offset-4 hover:underline dark:text-brand">
          {t('kit')}
        </Link>
      </Card>
    </main>
  );
}
