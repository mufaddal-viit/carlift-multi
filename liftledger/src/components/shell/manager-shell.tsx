'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Bus, CalendarCheck, LayoutDashboard, LogOut, MessageCircle, Plus, Search, Settings, UserPlus, Users, Wallet, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { DropdownMenu } from 'radix-ui';
import { PageTransition, spring } from '@/components/motion';
import { Avatar } from '@/components/ui/avatar';
import { useCompany, useSession } from '@/data/hooks';
import { signOut } from '@/data/session-client';
import { LogPaymentDialog } from '@/features/dashboard/log-payment-dialog';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Logo } from './logo';
import { LocaleToggle, roundButton, ThemeToggle } from './toggles';

type NavKey = 'dashboard' | 'fleet' | 'passengers' | 'payments' | 'attendance';
const NAV: { key: NavKey; href: string; icon: LucideIcon }[] = [
  { key: 'dashboard', href: '/app', icon: LayoutDashboard },
  { key: 'fleet', href: '/app/fleet', icon: Bus },
  { key: 'passengers', href: '/app/passengers', icon: Users },
  { key: 'payments', href: '/app/payments', icon: Wallet },
  { key: 'attendance', href: '/app/attendance', icon: CalendarCheck },
];

const isActive = (pathname: string, href: string) => (href === '/app' ? pathname === '/app' : pathname.startsWith(href));

const PaymentDialogContext = createContext<(passengerId?: string) => void>(() => {});
/** Opens the "log a payment" dialog from anywhere in the manager portal, optionally for one rider. */
export const useOpenPayment = () => useContext(PaymentDialogContext);

function TopBar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const company = useCompany();
  const client = useQueryClient();

  const leave = async () => {
    await signOut();
    client.clear();
    router.replace('/login');
  };

  return (
    <header className="sticky top-3 z-30 mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-3 rounded-full bg-card/90 ps-5 pe-2.5 shadow-card backdrop-blur-md">
      <Link href="/app" aria-label={t('common.appName')} className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
        <Logo wordmark={false} className="sm:hidden" />
        <Logo className="hidden sm:inline-flex" />
      </Link>

      <nav aria-label={t('nav.main')} className="hidden rounded-full bg-soft p-1 lg:flex">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative rounded-full px-4 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-brand',
                active ? 'text-ink' : 'text-ink-muted hover:text-ink',
              )}
            >
              {active && <motion.span layoutId="top-nav-pill" className="absolute inset-0 rounded-full bg-card shadow-card" transition={spring.sheet} />}
              <span className="relative">{t(`nav.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <button type="button" className={cn(roundButton, 'hidden sm:grid')} aria-label={t('common.search')}>
          <Search aria-hidden />
        </button>
        <button type="button" className={cn(roundButton, 'relative hidden sm:grid')} aria-label={t('common.notifications')}>
          <Bell aria-hidden />
          <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-overdue ring-2 ring-soft" aria-hidden />
        </button>
        <LocaleToggle />
        <ThemeToggle />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label={session.name} data-testid="account-menu">
            <Avatar name={session.name} size="md" className="size-11 text-sm" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={10} className="z-50 min-w-56 rounded-inner bg-card p-2 shadow-card ring-1 ring-line">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{session.name}</p>
                <p className="text-xs text-ink-muted">
                  {t(`login.roles.${session.role}`)}
                  {company.data && ` · ${company.data.name}`}
                </p>
              </div>
              <DropdownMenu.Item
                onSelect={leave}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-overdue outline-none data-highlighted:bg-overdue-bg"
              >
                <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
                {t('common.signOut')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

function RailLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-11 place-items-center rounded-full transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&_svg]:size-[18px]',
        active ? 'bg-brand text-on-brand' : 'text-ink-muted hover:bg-soft hover:text-ink',
      )}
    >
      <Icon aria-hidden />
    </Link>
  );
}

function IconRail({ onLogPayment }: { onLogPayment: () => void }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const capsule = 'flex flex-col gap-1.5 rounded-full bg-card p-1.5 shadow-card';
  return (
    <aside aria-label={t('quickActions')} className="fixed start-4 top-28 bottom-6 z-20 hidden flex-col justify-between lg:flex 2xl:start-[max(1rem,calc((100vw-1400px)/2-4.5rem))]">
      <div className="flex flex-col gap-3">
        <div className={capsule}>
          <button
            type="button"
            onClick={onLogPayment}
            aria-label={t('logPayment')}
            title={t('logPayment')}
            className="grid size-11 place-items-center rounded-full bg-brand text-on-brand transition-transform outline-none hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-95"
          >
            <Plus className="size-5" aria-hidden />
          </button>
          <RailLink href="/app/passengers" label={t('addRider')} icon={UserPlus} />
          <RailLink href="/app/attendance" label={t('attendance')} icon={CalendarCheck} active={isActive(pathname, '/app/attendance')} />
        </div>
        <div className={capsule}>
          <RailLink href="/app/reminders" label={t('reminders')} icon={MessageCircle} active={isActive(pathname, '/app/reminders')} />
        </div>
      </div>
      <div className={capsule}>
        <RailLink href="/app/settings" label={t('settings')} icon={Settings} active={isActive(pathname, '/app/settings')} />
      </div>
    </aside>
  );
}

function BottomTabs() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  return (
    <nav aria-label={t('main')} className="fixed inset-x-3 bottom-3 z-30 flex justify-between rounded-full bg-card/95 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-card ring-1 ring-line backdrop-blur-md lg:hidden">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-brand',
              active ? 'text-on-brand' : 'text-ink-muted',
            )}
          >
            {active && <motion.span layoutId="bottom-tab-pill" className="absolute inset-0 rounded-full bg-brand" transition={spring.sheet} />}
            <item.icon className="relative size-5" aria-hidden />
            <span className="relative max-w-full truncate px-1">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function ManagerShell({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const [payment, setPayment] = useState<{ open: boolean; passengerId?: string }>({ open: false });
  const openPayment = (passengerId?: string) => setPayment({ open: true, passengerId });

  return (
    <PaymentDialogContext.Provider value={openPayment}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand">
        {t('skipToContent')}
      </a>
      <div className="min-h-dvh px-3 pt-3 pb-28 sm:px-5 lg:pb-10">
        <TopBar />
        <IconRail onLogPayment={() => openPayment()} />
        <main id="main" className="mx-auto mt-6 w-full max-w-[1400px] lg:ps-20 2xl:ps-0">
          <PageTransition>{children}</PageTransition>
        </main>
        <BottomTabs />
      </div>
      <LogPaymentDialog
        key={payment.passengerId ?? 'any'}
        open={payment.open}
        onOpenChange={(open) => setPayment((p) => ({ ...p, open }))}
        passengerId={payment.passengerId}
      />
    </PaymentDialogContext.Provider>
  );
}

export function PageHeader({ greetingName, title, actions }: { greetingName?: string; title?: string; actions?: ReactNode }) {
  const t = useTranslations('dashboard');
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-[2rem] leading-tight font-light tracking-tight sm:text-[2.75rem]">
        {greetingName ? (
          <>
            <span className="font-medium">{t('welcome')}</span> <span className="text-ink-muted">{greetingName}</span>
          </>
        ) : (
          <span className="font-medium">{title}</span>
        )}
      </h1>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
