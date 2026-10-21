import { initials } from '@/core/format';
import { cn } from '@/lib/cn';

// Soft, distinct tints so neighbouring avatars are easy to tell apart. Chosen by name, so a passenger keeps their colour.
const TINTS = ['bg-paid-bg text-paid', 'bg-partial-bg text-partial', 'bg-pending-bg text-pending', 'bg-overdue-bg text-overdue', 'bg-brand-tint text-brand-deep'];
const tintFor = (name: string) => TINTS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TINTS.length];

const sizes = { sm: 'size-8 text-[11px]', md: 'size-10 text-xs', lg: 'size-12 text-sm' };

export function Avatar({ name, size = 'md', className }: { name: string; size?: keyof typeof sizes; className?: string }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold', sizes[size], tintFor(name), className)}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 4, moreLabel }: { names: string[]; max?: number; moreLabel: (count: number) => string }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex items-center" role="img" aria-label={names.join(', ')}>
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size="lg" className={cn('ring-4 ring-soft', i > 0 && '-ms-3')} />
      ))}
      {rest > 0 && (
        <span className="-ms-3 grid size-12 place-items-center rounded-full bg-brand text-sm font-semibold text-on-brand ring-4 ring-soft" title={moreLabel(rest)}>
          +{rest}
        </span>
      )}
    </div>
  );
}
