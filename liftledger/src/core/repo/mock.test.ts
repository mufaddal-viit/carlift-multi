import { beforeEach, describe, expect, it } from 'vitest';
import { createMockRepository, STORAGE_KEY } from './mock';
import { DEMO_COMPANY_ID, DEMO_PASSWORD } from './seed';
import type { Repository, Session } from './types';

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

const TODAY = '2026-10-13';
const MONTH = '2026-10';
let storage: MemStorage;
let repo: Repository;
let manager: Session;
const make = (s = storage) => createMockRepository({ storage: s, today: () => TODAY, latency: [0, 0] });
const as = async (role: string, r = repo) => {
  const u = (await r.demoUsers()).find((x) => x.role === role)!;
  return r.loginAs(u.id);
};

beforeEach(async () => {
  storage = new MemStorage();
  repo = make();
  manager = await as('manager');
});

describe('login', () => {
  it('accepts a seeded manager by email', async () => {
    const s = await repo.login('manager@almajra.ae', DEMO_PASSWORD);
    expect(s).toMatchObject({ role: 'manager', companyId: DEMO_COMPANY_ID });
  });
  it('accepts a phone number as the identifier, however it is spaced', async () => {
    const s = await repo.login('+971 50 100 0001', DEMO_PASSWORD);
    expect(s.role).toBe('manager');
  });
  it('rejects a wrong password', () =>
    expect(repo.login('manager@almajra.ae', 'nope')).rejects.toThrow('invalid-credentials'));
  it('rejects an unknown user', () =>
    expect(repo.login('nobody@example.com', DEMO_PASSWORD)).rejects.toThrow('invalid-credentials'));
  it('rejects an empty identifier', () =>
    expect(repo.login('', DEMO_PASSWORD)).rejects.toThrow('invalid-credentials'));
  it('never exposes passwords in the demo user list', async () => {
    expect(JSON.stringify(await repo.demoUsers())).not.toContain(DEMO_PASSWORD);
  });
});

describe('payments', () => {
  it('logging the balance turns an overdue rider paid', async () => {
    const before = (await repo.statusBoard(manager, MONTH)).find((r) => r.ledger.status === 'overdue')!;
    await repo.logPayment(manager, {
      passengerId: before.passenger.id, amount: before.ledger.balance, date: TODAY, method: 'cash', forMonth: MONTH,
    });
    const after = (await repo.statusBoard(manager, MONTH)).find((r) => r.passenger.id === before.passenger.id)!;
    expect(after.ledger.status).toBe('paid');
    expect(after.ledger.balance).toBe(0);
  });
  it('raises the dashboard collected total by exactly the amount logged', async () => {
    const before = await repo.dashboard(manager, MONTH);
    const row = before.rows.find((r) => r.ledger.balance > 0)!;
    await repo.logPayment(manager, { passengerId: row.passenger.id, amount: 40, date: TODAY, method: 'wallet', forMonth: MONTH });
    const after = await repo.dashboard(manager, MONTH);
    expect(after.summary.collected).toBe(before.summary.collected + 40);
  });
  it('deleting a payment restores the previous balance', async () => {
    const row = (await repo.statusBoard(manager, MONTH)).find((r) => r.ledger.balance > 0)!;
    const p = await repo.logPayment(manager, { passengerId: row.passenger.id, amount: 10, date: TODAY, method: 'cash', forMonth: MONTH });
    await repo.deletePayment(manager, p.id);
    const again = (await repo.statusBoard(manager, MONTH)).find((r) => r.passenger.id === row.passenger.id)!;
    expect(again.ledger.balance).toBe(row.ledger.balance);
  });
  it.each([[0], [-5], [12.5], [Number.NaN]])('rejects an amount of %s', async (amount) => {
    const row = (await repo.statusBoard(manager, MONTH))[0];
    await expect(repo.logPayment(manager, { passengerId: row.passenger.id, amount, date: TODAY, method: 'cash', forMonth: MONTH }))
      .rejects.toThrow('invalid-input');
  });
  it('rejects a malformed month', async () => {
    const row = (await repo.statusBoard(manager, MONTH))[0];
    await expect(repo.logPayment(manager, { passengerId: row.passenger.id, amount: 5, date: TODAY, method: 'cash', forMonth: 'Oct' }))
      .rejects.toThrow('invalid-input');
  });
  it('a rider cannot log a payment', async () => {
    const rider = await as('rider');
    const me = (await repo.passengers(rider))[0];
    await expect(repo.logPayment(rider, { passengerId: me.id, amount: 5, date: TODAY, method: 'cash', forMonth: MONTH }))
      .rejects.toThrow('forbidden');
  });
});

describe('scoping', () => {
  it('hides a rider of another company behind not-found', async () => {
    const admin = await as('admin');
    const foreign = (await repo.passengers(admin)).find((p) => p.companyId !== DEMO_COMPANY_ID)!;
    await expect(repo.passenger(manager, foreign.id)).rejects.toThrow('not-found');
  });
  it('hides a rider on another car from a driver', async () => {
    const driver = await as('driver');
    const mine = new Set((await repo.passengers(driver)).map((p) => p.id));
    const other = (await repo.passengers(manager)).find((p) => !mine.has(p.id))!;
    await expect(repo.passenger(driver, other.id)).rejects.toThrow('not-found');
    await expect(repo.logPayment(driver, { passengerId: other.id, amount: 5, date: TODAY, method: 'cash', forMonth: MONTH }))
      .rejects.toThrow('not-found');
  });
  it('a driver only sees payments of their own riders', async () => {
    const driver = await as('driver');
    const mine = new Set((await repo.passengers(driver)).map((p) => p.id));
    const pays = await repo.payments(driver, MONTH);
    expect(pays.length).toBeGreaterThan(0);
    expect(pays.every((x) => mine.has(x.passengerId))).toBe(true);
  });
});

describe('trips', () => {
  it('marking the same day twice keeps one trip per rider with the latest status', async () => {
    const id = (await repo.passengers(manager))[0].id;
    await repo.markTrips(manager, TODAY, [{ passengerId: id, status: 'travelled' }]);
    await repo.markTrips(manager, TODAY, [{ passengerId: id, status: 'absent' }]);
    const today = (await repo.trips(manager, TODAY)).filter((t) => t.passengerId === id);
    expect(today).toHaveLength(1);
    expect(today[0].status).toBe('absent');
  });
  it('marking a per-trip rider absent lowers what they owe by one trip', async () => {
    const row = (await repo.statusBoard(manager, MONTH)).find((r) => r.passenger.billingType === 'perTrip' && r.ledger.expected > 0)!;
    const days = await Promise.all(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'].map((d) => repo.trips(manager, d)));
    const day = days.flat().find((t) => t.passengerId === row.passenger.id && t.status === 'travelled');
    expect(day, 'seed has a travelled trip in early October for a per-trip rider').toBeTruthy();
    await repo.markTrips(manager, day!.date, [{ passengerId: row.passenger.id, status: 'absent' }]);
    const after = (await repo.statusBoard(manager, MONTH)).find((r) => r.passenger.id === row.passenger.id)!;
    expect(after.ledger.expected).toBe(row.ledger.expected - row.passenger.perTripFee);
  });
});

describe('passengers', () => {
  it('saves a new rider into the manager company with a derived route', async () => {
    const car = (await repo.cars(manager))[0];
    const p = await repo.savePassenger(manager, {
      carId: car.id, name: 'New Rider', employerName: 'Test Company', phone: '971501112233', pickupArea: 'Karama', dropArea: 'JLT', seatNumber: 9,
      billingType: 'monthly', monthlyFee: 300, perTripFee: 0, joinDate: TODAY,
    });
    expect(p).toMatchObject({ companyId: DEMO_COMPANY_ID, route: 'Karama → JLT', status: 'active' });
    expect((await repo.passengers(manager)).some((x) => x.id === p.id)).toBe(true);
  });
  it('refuses to put a rider on a car from another company', async () => {
    const admin = await as('admin');
    const foreignCar = (await repo.cars(admin)).find((c) => c.companyId !== DEMO_COMPANY_ID)!;
    await expect(repo.savePassenger(manager, {
      carId: foreignCar.id, name: 'X', employerName: 'Y', phone: '971501112233', pickupArea: 'A', dropArea: 'B', seatNumber: 1,
      billingType: 'monthly', monthlyFee: 300, perTripFee: 0, joinDate: TODAY,
    })).rejects.toThrow('not-found');
  });
  it('deactivating removes the rider from the status board', async () => {
    const row = (await repo.statusBoard(manager, MONTH))[0];
    await repo.deactivatePassenger(manager, row.passenger.id);
    expect((await repo.statusBoard(manager, MONTH)).some((r) => r.passenger.id === row.passenger.id)).toBe(false);
  });
});

describe('persistence', () => {
  it('keeps changes across repository instances on the same storage', async () => {
    const row = (await repo.statusBoard(manager, MONTH)).find((r) => r.ledger.balance > 0)!;
    await repo.logPayment(manager, { passengerId: row.passenger.id, amount: 7, date: TODAY, method: 'cash', forMonth: MONTH });
    const again = (await make().statusBoard(manager, MONTH)).find((r) => r.passenger.id === row.passenger.id)!;
    expect(again.ledger.paid).toBe(row.ledger.paid + 7);
  });
  it.each([['not json'], ['{"version":99}'], ['null'], ['{"version":1,"seedMonth":"2026-10"}']])(
    'falls back to a fresh seed when storage holds %s', async (junk) => {
      storage.setItem(STORAGE_KEY, junk);
      const r = make();
      expect((await r.passengers(manager)).length).toBeGreaterThan(0);
    });
  it('reseeds when the stored data was built for an earlier month', async () => {
    const old = createMockRepository({ storage, today: () => '2026-09-13', latency: [0, 0] });
    await old.passengers(manager);
    const board = await make().statusBoard(manager, MONTH);
    expect(board.some((r) => r.ledger.paid > 0)).toBe(true);
  });
  it('works with no storage at all', async () => {
    const r = createMockRepository({ storage: null, today: () => TODAY, latency: [0, 0] });
    expect((await r.passengers(manager)).length).toBeGreaterThan(0);
  });
  it('survives a storage that throws on write', async () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
    const r = createMockRepository({ storage: broken, today: () => TODAY, latency: [0, 0] });
    const row = (await r.statusBoard(manager, MONTH)).find((x) => x.ledger.balance > 0)!;
    await expect(r.logPayment(manager, { passengerId: row.passenger.id, amount: 5, date: TODAY, method: 'cash', forMonth: MONTH }))
      .resolves.toBeTruthy();
  });
  it('reset discards changes', async () => {
    const before = await repo.dashboard(manager, MONTH);
    const row = before.rows.find((r) => r.ledger.balance > 0)!;
    await repo.logPayment(manager, { passengerId: row.passenger.id, amount: 9, date: TODAY, method: 'cash', forMonth: MONTH });
    await repo.reset();
    expect((await repo.dashboard(manager, MONTH)).summary.collected).toBe(before.summary.collected);
  });
});

describe('dashboard', () => {
  it('agrees with the status board', async () => {
    const d = await repo.dashboard(manager, MONTH);
    const board = await repo.statusBoard(manager, MONTH);
    expect(d.summary.collected).toBe(board.reduce((s, r) => s + r.ledger.paid, 0));
    expect(d.summary.expected).toBe(board.reduce((s, r) => s + r.ledger.expected, 0));
    expect(d.summary.byCar.reduce((s, c) => s + c.collected, 0)).toBe(d.summary.collected);
  });
  it('lists recent payments newest first with rider names', async () => {
    const d = await repo.dashboard(manager, MONTH);
    expect(d.recentPayments.length).toBeGreaterThan(0);
    expect(d.recentPayments.every((x) => x.passengerName.length > 0)).toBe(true);
    const dates = d.recentPayments.map((x) => x.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
  it('counts riders per car', async () => {
    const d = await repo.dashboard(manager, MONTH);
    expect(d.cars).toHaveLength(3);
    expect(d.cars.reduce((s, c) => s + c.riders, 0)).toBe(d.rows.length);
    expect(d.cars.every((c) => c.driver !== null)).toBe(true);
  });
});
