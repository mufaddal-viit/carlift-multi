'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { duration, ease, riseIn } from './tokens';

export * from './tokens';

/** Rises and fades its children in on mount. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div className={className} {...riseIn(reduced, delay)}>
      {children}
    </motion.div>
  );
}

/** Children wrapped in StaggerItem enter one after another. */
export function Stagger({ children, gap = 0.06, className }: { children: ReactNode; gap?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : 18 },
        shown: {
          opacity: 1,
          y: 0,
          transition: reduced ? { duration: duration.fast } : { duration: duration.slower, ease: ease.out },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Animates a number towards its value. Writes through a ref so it does not re-render per frame. */
export function CountUp({
  value,
  format = String,
  seconds = 0.9,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  seconds?: number;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    if (reduced) {
      shown.current = value;
      el.textContent = format(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: seconds,
      ease: ease.out,
      onUpdate: (latest) => {
        shown.current = latest;
        el.textContent = format(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, format, seconds, reduced]);

  // The real value is rendered for the server, screen readers and no-JS; the effect animates over it.
  return (
    <span ref={node} className={cn('tabular', className)}>
      {format(value)}
    </span>
  );
}

/** Fades route content in whenever the path changes. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div key={pathname} {...riseIn(reduced)}>
      {children}
    </motion.div>
  );
}
