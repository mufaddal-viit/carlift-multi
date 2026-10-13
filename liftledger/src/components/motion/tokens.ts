export const duration = { fast: 0.12, base: 0.2, slow: 0.32, slower: 0.48 } as const;

export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

export const spring = {
  sheet: { type: 'spring', stiffness: 380, damping: 34 },
  pop: { type: 'spring', stiffness: 520, damping: 28 },
} as const;

/** Entrance used across the app: rise and fade, or a plain quick fade when motion is reduced. */
export function riseIn(reduced: boolean, delay = 0) {
  return {
    initial: { opacity: 0, y: reduced ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: reduced
      ? { duration: duration.fast, delay: 0 }
      : { duration: duration.slower, ease: ease.out, delay },
  };
}
