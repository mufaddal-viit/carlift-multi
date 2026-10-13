import { describe, expect, it } from 'vitest';
import { companySummary } from './summary';
import { pax, pay } from './fixtures';

const passengers = [
  pax({ id: 'a', carId: 'car1', monthlyFee: 300 }),
  pax({ id: 'b', carId: 'car1', monthlyFee: 400 }),
  pax({ id: 'c', carId: 'car2', monthlyFee: 500 }),
  pax({ id: 'gone', carId: 'car2', monthlyFee: 900, status: 'inactive' }),
];
const payments = [
  pay(300, '2026-10', { id: '1', passengerId: 'a', method: 'cash' }),
  pay(150, '2026-10', { id: '2', passengerId: 'b', method: 'transfer' }),
  pay(900, '2026-10', { id: '3', passengerId: 'gone', method: 'wallet' }),
  pay(300, '2026-09', { id: '4', passengerId: 'a', method: 'cash' }),
];
const run = (o: Partial<Parameters<typeof companySummary>[0]> = {}) =>
  companySummary({ month: '2026-10', passengers, payments, trips: [], today: '2026-10-13', dueDay: 5, ...o });

describe('companySummary', () => {
  it('totals expected, collected and outstanding over active riders only', () => {
    const s = run();
    expect(s.expected).toBe(1200);
    expect(s.collected).toBe(450);
    expect(s.outstanding).toBe(750);
  });
  it('collected plus outstanding equals expected when nobody overpaid', () => {
    const s = run();
    expect(s.collected + s.outstanding).toBe(s.expected);
  });
  it('counts overdue riders', () => expect(run().overdueCount).toBe(2));
  it('counts nobody as overdue before the due day', () => expect(run({ today: '2026-10-03' }).overdueCount).toBe(0));
  it('rounds the collection rate', () => expect(run().collectionRate).toBe(38));
  it('collection rate is 0 when nothing is expected', () => expect(run({ passengers: [] }).collectionRate).toBe(0));
  it('collection rate is capped at 100', () => {
    const s = run({ passengers: [passengers[0]], payments: [pay(999, '2026-10', { passengerId: 'a' })] });
    expect(s.collectionRate).toBe(100);
  });
  it('per-car totals add up to the company totals', () => {
    const s = run();
    expect(s.byCar).toEqual([
      { carId: 'car1', riders: 2, expected: 700, collected: 450 },
      { carId: 'car2', riders: 1, expected: 500, collected: 0 },
    ]);
  });
  it('per-method amounts add up to collected and always list all methods', () => {
    const s = run();
    expect(s.byMethod).toEqual([
      { method: 'cash', amount: 300 }, { method: 'transfer', amount: 150 }, { method: 'wallet', amount: 0 },
    ]);
  });
  it('trend covers six months ending at the requested month', () => {
    const s = run();
    expect(s.trend.map((t) => t.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(s.trend[4]).toEqual({ month: '2026-09', expected: 1200, collected: 300 });
    expect(s.trend[5]).toEqual({ month: '2026-10', expected: 1200, collected: 450 });
  });
});
