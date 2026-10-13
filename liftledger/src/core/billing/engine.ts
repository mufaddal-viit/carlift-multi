import type { Passenger, Payment, Trip } from '../repo/types';
import { daysInMonth, dueDate, lastDay, monthOf } from './month';

export type PayStatus = 'paid' | 'partial' | 'pending' | 'overdue';

export interface Ledger {
  expected: number;
  paid: number;
  balance: number;
  status: PayStatus;
  nothingDue: boolean;
}

export function proRate(monthlyFee: number, joinDate: string): number {
  const dim = daysInMonth(monthOf(joinDate));
  const remaining = dim - Number(joinDate.slice(8, 10)) + 1;
  return Math.round((monthlyFee * remaining) / dim);
}

export function expectedFor(p: Passenger, month: string, trips: Trip[]): number {
  const joinMonth = monthOf(p.joinDate);
  if (month < joinMonth) return 0;
  if (p.billingType === 'perTrip') {
    const travelled = trips.filter(
      (t) => t.passengerId === p.id && t.status === 'travelled' && monthOf(t.date) === month,
    ).length;
    return travelled * p.perTripFee;
  }
  return month === joinMonth ? proRate(p.monthlyFee, p.joinDate) : p.monthlyFee;
}

export function paidFor(passengerId: string, month: string, payments: Payment[]): number {
  return payments.reduce((sum, x) => (x.passengerId === passengerId && x.forMonth === month ? sum + x.amount : sum), 0);
}

export function statusFor(
  p: Passenger, month: string, payments: Payment[], trips: Trip[], today: string, dueDay: number,
): Ledger {
  const expected = expectedFor(p, month, trips);
  const paid = paidFor(p.id, month, payments);
  const balance = expected - paid;
  if (expected === 0) return { expected, paid, balance, status: 'paid', nothingDue: true };
  if (balance <= 0) return { expected, paid, balance, status: 'paid', nothingDue: false };
  // Per-trip riders are billed on what they travelled, so they are only late once the month is over.
  const due = p.billingType === 'perTrip' ? lastDay(month) : dueDate(month, dueDay);
  const status: PayStatus = today > due ? 'overdue' : paid === 0 ? 'pending' : 'partial';
  return { expected, paid, balance, status, nothingDue: false };
}
