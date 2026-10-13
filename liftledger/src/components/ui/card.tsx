import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const tones = {
  default: 'bg-card text-ink shadow-card',
  brand: 'bg-brand text-on-brand',
  soft: 'bg-soft text-ink',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: keyof typeof tones;
  padded?: boolean;
}

export function Card({ tone = 'default', padded = true, className, ...props }: CardProps) {
  return <div className={cn('rounded-card', tones[tone], padded && 'p-4 sm:p-6', className)} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-soft text-ink [&_svg]:size-[18px]" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-base leading-tight font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-[13px] text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
