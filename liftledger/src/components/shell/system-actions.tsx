'use client';

import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';

/** Back to the previous page, or nowhere when the page was opened directly. */
export function BackButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button variant="soft" onClick={() => (window.history.length > 1 ? router.back() : router.push('/login'))}>
      <ArrowLeft className="rtl:-scale-x-100" aria-hidden />
      {label}
    </Button>
  );
}

export function RetryButton({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <Button onClick={onRetry} data-testid="error-retry">
      <RotateCcw aria-hidden />
      {label}
    </Button>
  );
}
