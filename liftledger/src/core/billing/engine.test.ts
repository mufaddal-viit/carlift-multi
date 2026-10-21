import { describe, expect, it } from 'vitest';
import { expectedFor, paidFor, proRate, statusFor } from './engine';
import { pax, pay, trip } from './fixtures';
import type { Payment, Trip } from '../repo/types';

describe('proRate', () => {
  it('joining on the 20th of a 31-day month charges 12/31', () => expect(proRate(350, '2026-10-20')).toBe(135));
  it('joining on the 1st charges the full fee', () => expect(proRate(350, '2026-10-01')).toBe(350));
  it('joining on the last day charges one day', () => expect(proRate(310, '2026-10-31')).toBe(10));
  it('handles 29 Feb in a leap year', () => expect(proRate(290, '2028-02-29')).toBe(10));
});

describe('expectedFor', () => {
  it('is the monthly fee in a normal month', () => expect(expectedFor(pax(), '2026-10', [])).toBe(350));
  it('is pro-rated in the join month', () =>
    expect(expectedFor(pax({ joinDate: '2026-10-20' }), '2026-10', [])).toBe(135));
  it('is zero before the join month', () =>
    expect(expectedFor(pax({ joinDate: '2026-10-20' }), '2026-09', [])).toBe(0));
  it('counts only travelled trips in the month for per-trip passengers', () => {
    const p = pax({ billingType: 'perTrip', perTripFee: 25, monthlyFee: 0 });
    const trips = [trip('2026-10-01'), trip('2026-10-02'), trip('2026-10-03', 'absent'), trip('2026-09-30'),
      trip('2026-10-04', 'travelled', 'someone-else')];
    expect(expectedFor(p, '2026-10', trips)).toBe(50);
  });
});

describe('paidFor', () => {
  it('sums only payments for that month and passenger', () => {
    const payments = [pay(100, '2026-10'), pay(50, '2026-10', { id: 'b' }), pay(350, '2026-11'),
      pay(999, '2026-10', { id: 'c', passengerId: 'other' })];
    expect(paidFor('p1', '2026-10', payments)).toBe(150);
  });
});

describe('statusFor', () => {
  const s = (payments: Payment[], today: string, p = pax(), trips: Trip[] = []) =>
    statusFor(p, '2026-10', payments, trips, today, 5);

  it('paid when fully covered', () => expect(s([pay(350, '2026-10')], '2026-10-13').status).toBe('paid'));
  it('pending on the due day with nothing paid', () => expect(s([], '2026-10-05').status).toBe('pending'));
  it('partial before the due day with some paid', () =>
    expect(s([pay(200, '2026-10')], '2026-10-04').status).toBe('partial'));
  it('overdue after the due day with nothing paid', () => expect(s([], '2026-10-06').status).toBe('overdue'));
  it('overdue after the due day with some paid', () =>
    expect(s([pay(200, '2026-10')], '2026-10-06').status).toBe('overdue'));
  it('reports the balance', () => expect(s([pay(200, '2026-10')], '2026-10-04').balance).toBe(150));
  it('overpayment is paid with a negative balance', () => {
    const l = s([pay(400, '2026-10')], '2026-10-13');
    expect(l.status).toBe('paid');
    expect(l.balance).toBe(-50);
  });
  it('advance for a future month does not count now', () =>
    expect(s([pay(350, '2026-11')], '2026-10-13').status).toBe('overdue'));
  it('per-trip passenger with zero trips has nothing due', () => {
    const l = s([], '2026-10-20', pax({ billingType: 'perTrip', perTripFee: 25 }));
    expect(l.status).toBe('paid');
    expect(l.nothingDue).toBe(true);
  });
  it('per-trip passenger is pending, not overdue, while the month is running', () => {
    const p = pax({ billingType: 'perTrip', perTripFee: 25 });
    expect(s([], '2026-10-20', p, [trip('2026-10-01')]).status).toBe('pending');
  });
  it('per-trip passenger is overdue once the month has ended', () => {
    const p = pax({ billingType: 'perTrip', perTripFee: 25 });
    expect(statusFor(p, '2026-10', [], [trip('2026-10-01')], '2026-11-01', 5).status).toBe('overdue');
  });
  it('a month before the passenger joined has nothing due', () =>
    expect(statusFor(pax({ joinDate: '2026-10-20' }), '2026-09', [], [], '2026-10-25', 5).nothingDue).toBe(true));
});
