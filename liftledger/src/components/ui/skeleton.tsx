import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-inner bg-line/70 motion-reduce:animate-none', className)} aria-hidden />;
}
