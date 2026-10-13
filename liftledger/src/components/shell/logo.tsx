import { cn } from '@/lib/cn';

/** The LiftLedger mark: a route bending from pickup to drop-off inside a brand disc. */
export function Logo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 36 36" className="size-9 shrink-0" aria-hidden>
        <circle cx="18" cy="18" r="18" fill="var(--brand)" />
        <path d="M11 25V15a5 5 0 0 1 5-5h4a5 5 0 0 1 0 10h-3" fill="none" stroke="var(--on-brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="11" cy="25" r="2.6" fill="var(--on-brand)" />
        <circle cx="24.500" cy="25" r="2.6" fill="var(--on-brand)" fillOpacity="0.55" />
      </svg>
      {wordmark && <span className="text-xl font-bold tracking-tight text-brand-deep dark:text-brand">LiftLedger</span>}
    </span>
  );
}
