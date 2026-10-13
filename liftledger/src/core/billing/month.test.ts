import { describe, expect, it } from 'vitest';
import { addMonths, daysInMonth, dueDate, lastDay, monthOf } from './month';

describe('month helpers', () => {
  it('monthOf takes the month from a day', () => expect(monthOf('2026-10-13')).toBe('2026-10'));
  it('daysInMonth knows month lengths', () => {
    expect(daysInMonth('2026-10')).toBe(31);
    expect(daysInMonth('2026-04')).toBe(30);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
  });
  it('addMonths crosses year boundaries both ways', () => {
    expect(addMonths('2026-10', 3)).toBe('2027-01');
    expect(addMonths('2026-02', -5)).toBe('2025-09');
    expect(addMonths('2026-10', 0)).toBe('2026-10');
  });
  it('lastDay is the final day of the month', () => expect(lastDay('2026-02')).toBe('2026-02-28'));
  it('dueDate uses the due day', () => expect(dueDate('2026-10', 5)).toBe('2026-10-05'));
  it('dueDate clamps a due day past the end of the month', () => {
    expect(dueDate('2026-02', 31)).toBe('2026-02-28');
    expect(dueDate('2026-04', 31)).toBe('2026-04-30');
  });
  it('dueDate clamps a due day below 1', () => expect(dueDate('2026-10', 0)).toBe('2026-10-01'));
});
