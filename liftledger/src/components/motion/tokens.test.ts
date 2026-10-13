import { describe, expect, it } from 'vitest';
import { duration, riseIn } from './tokens';

describe('riseIn', () => {
  it('rises and fades in by default', () => {
    const m = riseIn(false);
    expect(m.initial.y).toBeGreaterThan(0);
    expect(m.initial.opacity).toBe(0);
    expect(m.animate).toEqual({ opacity: 1, y: 0 });
  });
  it('honours a delay', () => expect(riseIn(false, 0.1).transition.delay).toBe(0.1));
  it('only fades, quickly and without delay, when motion is reduced', () => {
    const m = riseIn(true, 0.4);
    expect(m.initial.y).toBe(0);
    expect(m.transition.duration).toBeLessThanOrEqual(duration.fast);
    expect(m.transition.delay).toBe(0);
  });
});
