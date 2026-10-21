'use client';

import { useSyncExternalStore } from 'react';
import { Languages, Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export const roundButton =
  'grid size-11 shrink-0 place-items-center rounded-full bg-soft text-ink transition-colors outline-none hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&_svg]:size-[18px]';

const subscribe = () => () => {};
/** False on the server and during hydration, true afterwards. Avoids a theme-icon mismatch. */
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('common');
  const { resolvedTheme, setTheme } = useTheme();
  const dark = useMounted() && resolvedTheme === 'dark';
  return (
    <button type="button" className={cn(roundButton, className)} aria-label={t('theme')} aria-pressed={dark} onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </button>
  );
}

export function LocaleToggle({ className }: { className?: string }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      className={cn(roundButton, 'flex w-auto items-center gap-1.5 px-3.5 text-sm font-semibold', className)}
      aria-label={t('language')}
      onClick={() => router.replace(pathname, { locale: next })}
    >
      <Languages aria-hidden />
      <span lang={next}>{next === 'ar' ? 'ع' : 'EN'}</span>
    </button>
  );
}
