import type { ReactNode } from 'react';
import { Logo } from '@/components/shell/logo';
import { LocaleToggle, ThemeToggle } from '@/components/shell/toggles';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export interface SystemPageProps {
  /** Small label above the title, such as "404". */
  eyebrow?: string;
  title: string;
  body: ReactNode;
  illustration?: ReactNode;
  /** Buttons and links. */
  actions?: ReactNode;
  /** Below the actions: a reference number, a hint. */
  footnote?: ReactNode;
  /**
   * `page` stands on its own with the logo and toggles (404, company unavailable).
   * `inline` sits inside a portal that already has its navigation (an error in one manager section).
   */
  variant?: 'page' | 'inline';
  testId?: string;
}

/** The shared layout for 404, error, unavailable and other system pages. */
export function SystemPage({ eyebrow, title, body, illustration, actions, footnote, variant = 'page', testId }: SystemPageProps) {
  const card = (
    <Card
      data-testid={testId}
      className={cn('flex flex-col items-center gap-3 text-center', variant === 'page' ? 'flex-1 justify-center py-12' : 'py-14')}
    >
      {illustration && <div className="w-full max-w-48">{illustration}</div>}
      {eyebrow && <p className="text-sm font-semibold tracking-wide text-brand-deep tabular-nums dark:text-brand">{eyebrow}</p>}
      <h1 className="max-w-md text-2xl font-semibold tracking-tight text-balance">{title}</h1>
      <div className="max-w-sm text-sm text-pretty text-ink-muted">{body}</div>
      {actions && <div className="mt-3 flex flex-wrap justify-center gap-2">{actions}</div>}
      {footnote && <div className="mt-2 text-xs text-ink-muted">{footnote}</div>}
    </Card>
  );

  if (variant === 'inline') return card;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-gutter pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-2">
          <LocaleToggle className="bg-card" />
          <ThemeToggle className="bg-card" />
        </div>
      </header>
      {card}
    </main>
  );
}
