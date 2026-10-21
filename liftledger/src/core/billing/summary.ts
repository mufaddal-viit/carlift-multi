import type { Passenger, PayMethod, Payment, Trip } from '../repo/types';
import { expectedFor, paidFor, statusFor } from './engine';
import { addMonths } from './month';

export interface CompanySummary {
  collected: number;
  expected: number;
  outstanding: number;
  overdueCount: number;
  collectionRate: number;
  byCar: { carId: string; passengers: number; expected: number; collected: number }[];
  byMethod: { method: PayMethod; amount: number }[];
  trend: { month: string; expected: number; collected: number }[];
}

export interface SummaryInput {
  month: string;
  passengers: Passenger[];
  payments: Payment[];
  trips: Trip[];
  today: string;
  dueDay: number;
}

const METHODS: PayMethod[] = ['cash', 'transfer', 'wallet'];

export function companySummary({ month, passengers, payments, trips, today, dueDay }: SummaryInput): CompanySummary {
  const active = passengers.filter((p) => p.status === 'active');
  const activeIds = new Set(active.map((p) => p.id));
  const ledgers = active.map((p) => ({ p, l: statusFor(p, month, payments, trips, today, dueDay) }));

  const expected = ledgers.reduce((s, x) => s + x.l.expected, 0);
  const collected = ledgers.reduce((s, x) => s + x.l.paid, 0);
  const outstanding = ledgers.reduce((s, x) => s + Math.max(x.l.balance, 0), 0);

  const cars = new Map<string, CompanySummary['byCar'][number]>();
  for (const { p, l } of ledgers) {
    if (p.carId === null) continue; // Waiting for a car: counted in the totals, not on any car.
    const row = cars.get(p.carId) ?? { carId: p.carId, passengers: 0, expected: 0, collected: 0 };
    row.passengers += 1;
    row.expected += l.expected;
    row.collected += l.paid;
    cars.set(p.carId, row);
  }

  const monthPayments = payments.filter((x) => x.forMonth === month && activeIds.has(x.passengerId));

  return {
    collected,
    expected,
    outstanding,
    overdueCount: ledgers.filter((x) => x.l.status === 'overdue').length,
    collectionRate: expected === 0 ? 0 : Math.min(100, Math.round((collected / expected) * 100)),
    byCar: [...cars.values()],
    byMethod: METHODS.map((method) => ({
      method,
      amount: monthPayments.reduce((s, x) => (x.method === method ? s + x.amount : s), 0),
    })),
    trend: [-5, -4, -3, -2, -1, 0].map((n) => {
      const m = addMonths(month, n);
      return {
        month: m,
        expected: active.reduce((s, p) => s + expectedFor(p, m, trips), 0),
        collected: active.reduce((s, p) => s + paidFor(p.id, m, payments), 0),
      };
    }),
  };
}
