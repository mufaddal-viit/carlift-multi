'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { RepoProvider } from '@/data/hooks';
import { createHttpRepository } from '@/data/http-repo';

export function Providers({ children, dir }: { children: ReactNode; dir: 'ltr' | 'rtl' }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  const [repo] = useState(createHttpRepository);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <RepoProvider repo={repo}>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
          <Toaster
            dir={dir}
            position="bottom-center"
            toastOptions={{
              unstyled: true,
              className: 'flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas shadow-card',
            }}
          />
        </RepoProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
