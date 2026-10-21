import { Skeleton } from '@/components/ui/skeleton';

/** Shown inside the manager shell while a section's server work runs, so navigation never looks frozen. */
export default function SectionLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" data-testid="section-loading">
      <Skeleton className="h-11 w-56 rounded-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
