import { describe, expect, it } from 'vitest';
import { buildSeed, DEMO_COMPANY_ID } from './seed';
import { addMonths, monthOf, statusFor } from '../billing';

const TODAY = '2026-10-13';
const db = buildSeed(TODAY);
const mine = <T extends { companyId: string }>(xs: T[]) => xs.filter((x) => x.companyId === DEMO_COMPANY_ID);
const company = db.companies.find((c) => c.id === DEMO_COMPANY_ID)!;
const board = mine(db.passengers)
  .filter((p) => p.status === 'active')
  .map((p) => ({ p, l: statusFor(p, '2026-10', db.payments, db.trips, TODAY, company.dueDay) }));

describe('buildSeed', () => {
  it('is deterministic for a given day', () => expect(buildSeed(TODAY)).toEqual(db));
  it('records the month it was built for', () => expect(db.seedMonth).toBe('2026-10'));
  it('gives the demo company three cars, three drivers and at least 20 passengers', () => {
    expect(mine(db.cars)).toHaveLength(3);
    expect(mine(db.drivers)).toHaveLength(3);
    expect(mine(db.passengers).length).toBeGreaterThanOrEqual(20);
  });
  it('has four companies', () => expect(db.companies).toHaveLength(4));
  it('shows every payment status on the current board', () => {
    const seen = new Set(board.map((x) => x.l.status));
    expect([...seen].sort()).toEqual(['overdue', 'paid', 'partial', 'pending']);
  });
  it('includes a per-trip passenger, a passenger who joined this month, an advance payment and an inactive passenger', () => {
    expect(mine(db.passengers).some((p) => p.billingType === 'perTrip')).toBe(true);
    expect(mine(db.passengers).some((p) => monthOf(p.joinDate) === '2026-10' && p.joinDate <= TODAY)).toBe(true);
    expect(mine(db.payments).some((x) => x.forMonth === '2026-11')).toBe(true);
    expect(mine(db.passengers).some((p) => p.status === 'inactive')).toBe(true);
  });
  it('never dates a payment or trip in the future', () => {
    expect(db.payments.every((x) => x.date <= TODAY)).toBe(true);
    expect(db.trips.every((t) => t.date <= TODAY)).toBe(true);
  });
  it('has payments in each of the last six months', () => {
    for (let n = -5; n <= 0; n++) {
      const m = addMonths('2026-10', n);
      expect(mine(db.payments).some((x) => x.forMonth === m), m).toBe(true);
    }
  });
  it('has one trip at most per passenger per day', () => {
    const keys = db.trips.map((t) => `${t.passengerId}|${t.date}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('gives every record a unique id', () => {
    for (const list of [db.users, db.cars, db.drivers, db.passengers, db.payments, db.trips]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });
  it('builds on awkward days without dating anything in the future', () => {
    for (const d of ['2026-01-01', '2026-03-31', '2028-02-29', '2026-12-31']) {
      const x = buildSeed(d);
      expect(x.payments.every((p) => p.date <= d), d).toBe(true);
    }
  });
  it('links every driver user and passenger user to a real record', () => {
    for (const u of db.users) {
      if (u.role === 'driver') expect(db.drivers.some((d) => d.id === u.linkedDriverId), u.name).toBe(true);
      if (u.role === 'passenger') expect(db.passengers.some((p) => p.id === u.linkedPassengerId), u.name).toBe(true);
    }
  });
});
