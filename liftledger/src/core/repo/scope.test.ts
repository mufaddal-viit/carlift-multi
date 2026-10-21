import { describe, expect, it } from 'vitest';
import { buildSeed, DEMO_COMPANY_ID } from './seed';
import { canWrite, visibleCars, visiblePassengers } from './scope';
import type { Role, Session } from './types';

const db = buildSeed('2026-10-13');
const sessionOf = (role: Role, companyId: string | null = DEMO_COMPANY_ID): Session => {
  const u = db.users.find((x) => x.role === role && x.companyId === companyId)!;
  return { userId: u.id, role, companyId, name: u.name, locale: 'en' };
};
const manager = sessionOf('manager');
const driver = sessionOf('driver');
const passenger = sessionOf('passenger');
const admin = sessionOf('admin', null);
const driverUser = db.users.find((u) => u.id === driver.userId)!;
const myCar = db.cars.find((c) => c.driverId === driverUser.linkedDriverId)!;
const otherCar = db.cars.find((c) => c.companyId === DEMO_COMPANY_ID && c.id !== myCar.id)!;
const otherCompany = db.companies.find((c) => c.id !== DEMO_COMPANY_ID)!.id;

describe('visiblePassengers', () => {
  it('a manager sees every passenger of their company and nobody else', () => {
    const seen = visiblePassengers(manager, db);
    expect(seen).toHaveLength(db.passengers.filter((p) => p.companyId === DEMO_COMPANY_ID).length);
    expect(seen.every((p) => p.companyId === DEMO_COMPANY_ID)).toBe(true);
  });
  it('a driver sees only passengers on their own car', () => {
    const seen = visiblePassengers(driver, db);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((p) => p.carId === myCar.id)).toBe(true);
  });
  it('a passenger sees only themselves', () => {
    const u = db.users.find((x) => x.id === passenger.userId)!;
    expect(visiblePassengers(passenger, db).map((p) => p.id)).toEqual([u.linkedPassengerId]);
  });
  it('the platform admin sees everyone', () => expect(visiblePassengers(admin, db)).toHaveLength(db.passengers.length));
  it('a session for an unknown user sees nobody', () =>
    expect(visiblePassengers({ ...driver, userId: 'ghost' }, db)).toEqual([]));
  it('a forged manager session for a company the user does not belong to sees nobody', () =>
    expect(visiblePassengers({ ...manager, companyId: otherCompany }, db)).toEqual([]));
});

describe('visibleCars', () => {
  it('a driver sees only their own car', () => expect(visibleCars(driver, db).map((c) => c.id)).toEqual([myCar.id]));
  it('a manager sees the company fleet', () => expect(visibleCars(manager, db)).toHaveLength(3));
});

describe('canWrite', () => {
  const own = { companyId: DEMO_COMPANY_ID, carId: myCar.id };
  it('a manager can write everything in their company', () => {
    for (const a of ['passenger', 'payment', 'trip', 'fleet'] as const) expect(canWrite(manager, a, own, db), a).toBe(true);
  });
  it('a manager cannot write to another company', () =>
    expect(canWrite(manager, 'payment', { companyId: otherCompany }, db)).toBe(false));
  it('a driver can log payments and trips for their own car', () => {
    expect(canWrite(driver, 'payment', own, db)).toBe(true);
    expect(canWrite(driver, 'trip', own, db)).toBe(true);
  });
  it('a driver cannot touch another car, the fleet, or passenger records', () => {
    expect(canWrite(driver, 'payment', { companyId: DEMO_COMPANY_ID, carId: otherCar.id }, db)).toBe(false);
    expect(canWrite(driver, 'fleet', own, db)).toBe(false);
    expect(canWrite(driver, 'passenger', own, db)).toBe(false);
  });
  it('a passenger can write nothing', () => {
    for (const a of ['passenger', 'payment', 'trip', 'fleet'] as const) expect(canWrite(passenger, a, own, db), a).toBe(false);
  });
});
