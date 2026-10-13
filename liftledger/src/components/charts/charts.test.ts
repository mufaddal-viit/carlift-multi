import { describe, expect, it } from 'vitest';
import { niceMax } from './trend-bars';
import { smoothPath } from './area-line';

describe('niceMax', () => {
  it.each([[0, 4], [3, 4], [975, 1000], [1280, 1600], [5600, 6000], [10000, 10000], [42, 60]])(
    'rounds %s up to %s', (input, expected) => expect(niceMax(input)).toBe(expected));
  it('never returns less than the value', () => {
    for (const v of [1, 7, 99, 101, 2499, 2501, 87654]) expect(niceMax(v)).toBeGreaterThanOrEqual(v);
  });
  it('divides into four whole gridlines', () => {
    for (const v of [975, 1280, 5600, 42]) expect(Number.isInteger(niceMax(v) / 4)).toBe(true);
  });
});

describe('smoothPath', () => {
  it('is empty for no data', () => expect(smoothPath([])).toBe(''));
  it('draws a flat line for a single point', () => expect(smoothPath([5])).toMatch(/^M0,[\d.]+ L100,[\d.]+$/));
  it('draws a flat line when every value is equal, without NaN', () => expect(smoothPath([3, 3, 3])).not.toContain('NaN'));
  it('starts at the left edge and ends at the right edge', () => {
    const d = smoothPath([1, 5, 2]);
    expect(d.startsWith('M0,')).toBe(true);
    expect(d).toMatch(/ 100,[\d.]+$/);
  });
});
