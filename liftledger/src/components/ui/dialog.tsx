'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import { Dialog as Radix } from 'radix-ui';
import { cn } from '@/lib/cn';
import { duration, spring } from '@/components/motion/tokens';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * `sheet` slides up from the bottom on phones and sits centred on larger screens.
   * `side` slides in from the end edge (right in LTR, left in RTL) and fills the height: a detail panel over a list.
   */
  variant?: 'dialog' | 'sheet' | 'side';
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, variant = 'sheet', className }: DialogProps) {
  const t = useTranslations('common');
  const reduced = useReducedMotion() ?? false;
  const rtl = useLocale() === 'ar';
  const hidden = reduced ? { opacity: 0 } : variant === 'side' ? { opacity: 0, x: rtl ? -48 : 48 } : { opacity: 0, y: 40, scale: 0.98 };

  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Radix.Portal forceMount>
            <Radix.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] dark:bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration.base }}
              />
            </Radix.Overlay>
            <div
              className={cn(
                'pointer-events-none fixed inset-0 z-50 flex',
                variant === 'side' ? 'items-stretch justify-end' : 'justify-center p-0 sm:items-center sm:p-6',
                variant === 'sheet' && 'items-end',
                variant === 'dialog' && 'items-center p-4',
              )}
            >
              <Radix.Content asChild forceMount {...(description ? {} : { 'aria-describedby': undefined })}>
                <motion.div
                  className={cn(
                    'pointer-events-auto w-full overflow-y-auto bg-card shadow-card outline-none',
                    variant === 'side'
                      ? 'h-full max-w-md px-gutter pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6'
                      : 'max-h-[92dvh] max-w-lg p-5 sm:rounded-card sm:p-7',
                    variant === 'sheet' && 'rounded-t-card pb-[max(1.25rem,env(safe-area-inset-bottom))]',
                    variant === 'dialog' && 'rounded-card',
                    className,
                  )}
                  initial={hidden}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  exit={hidden}
                  transition={reduced ? { duration: duration.fast } : spring.sheet}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Radix.Title className="text-lg font-semibold">{title}</Radix.Title>
                      {description && <Radix.Description className="mt-1 text-sm text-ink-muted">{description}</Radix.Description>}
                    </div>
                    <Radix.Close
                      aria-label={t('close')}
                      className="-me-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted transition-colors outline-none hover:bg-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <X className="size-5" aria-hidden />
                    </Radix.Close>
                  </div>
                  {children}
                </motion.div>
              </Radix.Content>
            </div>
          </Radix.Portal>
        )}
      </AnimatePresence>
    </Radix.Root>
  );
}
