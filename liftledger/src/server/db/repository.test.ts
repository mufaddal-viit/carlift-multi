import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_COMPANY_ID, DEMO_PASSWORD } from '@/core/repo/seed';
import type { Repository, Role, Session } from '@/core/repo/types';
import { createDbRepository } from './repository';
import { createTestDatabase } from './test-db';

const TODAY = '2026-10-13';
const MONTH = '2026-10';
const AMAD = 'amad-express';

let client: PrismaClient;
let drop: () => Promise<void>;
let repo: Repository;
let manager: Session;

/** Signs in as the first Amad Express demo account with that role, the way the login page does. */
const as = async (role: Exclude<Role, 'admin'>) => {
  const u = (await repo.demoUsers(AMAD)).find((x) => x.role === role)!;
  return repo.login(u.email!, DEMO_PASSWORD, AMAD);
};

beforeAll(async () => {
  ({ client, drop } = await createTestDatabase(TODAY));
  repo = createDbRepository(client, { today: () => TODAY });
  manager = await as('manager');
}, 120_000);

afterAll(() => drop());

describe('login', () => {
  it('accepts a seeded manager by email', async () =>
    expect(await repo.login('manager@amadexpress.ae', DEMO_PASSWORD, AMAD)).toMatchObject({
      role: 'manager', companyId: DEMO_COMPANY_ID, companySlug: AMAD,
    }));
  it('accepts an email in any case', async () => expect((await repo.login('Manager@AmadExpress.ae', DEMO_PASSWORD, AMAD)).role).toBe('manager'));
  it('accepts a phone number however it is spaced, and a local mobile number', async () => {
    expect((await repo.login('+971 50 100 0001', DEMO_PASSWORD, AMAD)).role).toBe('manager');
    expect((await repo.login('050 100 0001', DEMO_PASSWORD, AMAD)).role).toBe('manager');
  });
  it('signs each manager into their own company', async () =>
    expect(await repo.login('manager@skyline.example', DEMO_PASSWORD, 'skyline-commute')).toMatchObject({
      companyId: 'co-skyline', companySlug: 'skyline-commute',
    }));
  it("refuses a user on another company's login page", () =>
    expect(repo.login('manager@skyline.example', DEMO_PASSWORD, AMAD)).rejects.toThrow('invalid-credentials'));
  it('keeps the platform console and company logins apart', async () => {
    await expect(repo.login('manager@amadexpress.ae', DEMO_PASSWORD, null)).rejects.toThrow('invalid-credentials');
    await expect(repo.login('admin@liftledger.app', DEMO_PASSWORD, AMAD)).rejects.toThrow('invalid-credentials');
    expect(await repo.login('admin@liftledger.app', DEMO_PASSWORD, null)).toMatchObject({ role: 'admin', companyId: null, companySlug: null });
  });
  it('refuses users of a suspended company, but only once the password is right', async () => {
    await expect(repo.login('manager@palm.example', DEMO_PASSWORD, 'palm-shuttle')).rejects.toThrow('company-suspended');
    await expect(repo.login('manager@palm.example', 'nope', 'palm-shuttle')).rejects.toThrow('invalid-credentials');
  });
  it.each([
    ['manager@amadexpress.ae', 'nope', AMAD], ['nobody@example.com', DEMO_PASSWORD, AMAD], ['', DEMO_PASSWORD, AMAD],
    ['manager@amadexpress.ae', DEMO_PASSWORD, 'no-such-company'],
  ])('rejects %s / %s at %s', (id, pw, slug) => expect(repo.login(id, pw, slug)).rejects.toThrow('invalid-credentials'));
  it('stores passwords hashed, never in plain text', async () => {
    const u = await client.user.findFirst({ where: { email: 'manager@amadexpress.ae' } });
    expect(u?.passwordHash).toMatch(/^scrypt\$/);
    expect(JSON.stringify(await repo.demoUsers(AMAD))).not.toContain(DEMO_PASSWORD);
  });
  it('lists only that company’s demo accounts, or only the admin on the platform page', async () => {
    const users = await repo.demoUsers(AMAD);
    expect(users.every((u) => u.companyId === DEMO_COMPANY_ID)).toBe(true);
    expect(new Set(users.map((u) => u.role))).toEqual(new Set(['manager', 'driver', 'passenger']));
    expect((await repo.demoUsers(null)).map((u) => u.role)).toEqual(['admin']);
    expect(await repo.demoUsers('no-such-company')).toEqual([]);
  });
});

describe('sessions are re-checked against the database', () => {
  it('refuses a validly signed session for a user that no longer exists', () =>
    expect(repo.passengers({ ...manager, userId: 'u-deleted' })).rejects.toThrow('forbidden'));
  it('refuses a session whose role was changed', () => expect(repo.passengers({ ...manager, role: 'driver' })).rejects.toThrow('forbidden'));
  it('refuses the platform admin on company data', async () =>
    expect(repo.passengers(await repo.login('admin@liftledger.app', DEMO_PASSWORD, null))).rejects.toThrow('forbidden'));
});

describe('companies', () => {
  it('finds a company by address or id, with only public fields', async () => {
    expect(await repo.companyBySlug(AMAD)).toEqual({
      id: DEMO_COMPANY_ID, slug: AMAD, name: 'Amad Express', phone: '97143001000', status: 'active',
    });
    expect(await repo.companyById(DEMO_COMPANY_ID)).toMatchObject({ slug: AMAD });
    expect(await repo.companyBySlug('nope')).toBeNull();
  });
  it('forwards an old company address to the current one', async () => {
    await client.company.update({ where: { id: DEMO_COMPANY_ID }, data: { previousSlugs: ['al-majra-transport'] } });
    expect(await repo.currentSlugFor('al-majra-transport')).toBe(AMAD);
    expect(await repo.companyBySlug('al-majra-transport')).toBeNull();
    expect(await repo.currentSlugFor('never-existed')).toBeNull();
  });
  it('gives the manager their own company', async () => expect((await repo.company(manager)).name).toBe('Amad Express'));
});

describe('payments', () => {
  it('logging the balance turns an overdue passenger paid', async () => {
    const before = (await repo.statusBoard(manager, MONTH)).find((r) => r.ledger.status === 'overdue')!;
    await repo.logPayment(manager, { passengerId: before.passenger.id, amount: before.ledger.balance, date: TODAY, method: 'cash', forMonth: MONTH });
    const after = (await repo.statusBoard(manager, MONTH)).find((r) => r.passenger.id === before.passenger.id)!;
    expect(after.ledger).toMatchObject({ status: 'paid', balance: 0 });
  });
  it('raises the dashboard collected total by exactly the amount logged', async () => {
    const before = await repo.dashboard(manager, MONTH);
    const row = before.rows.find((r) => r.ledger.balance > 0)!;
    await repo.logPayment(manager, { passengerId: row.passenger.id, amount: 40, date: TODAY, method: 'wallet', forMonth: MONTH });
    expect((await repo.dashboard(manager, MONTH)).summary.collected).toBe(before.summary.collected + 40);
  });
  it('deleting a payment restores the previous balance', async () => {
    const row = (await repo.statusBoard(manager, MONTH)).find((r) => r.ledger.balance > 0)!;
    const p = await repo.logPayment(manager, { passengerId: row.passenger.id, amount: 10, date: TODAY, method: 'cash', forMonth: MONTH });
    await repo.deletePayment(manager, p.id);
    expect((await repo.statusBoard(manager, MONTH)).find((r) => r.passenger.id === row.passenger.id)!.ledger.balance).toBe(row.ledger.balance);
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
  it('a passenger cannot log a payment', async () => {
    const passenger = await as('passenger');
    const me = (await repo.passengers(passenger))[0];
    await expect(repo.logPayment(passenger, { passengerId: me.id, amount: 5, date: TODAY, method: 'cash', forMonth: MONTH }))
      .rejects.toThrow('forbidden');
  });
});

describe('inside a company', () => {
  it('hides a passenger on another car from a driver', async () => {
    const driver = await as('driver');
    const mine = new Set((await repo.passengers(driver)).map((p) => p.id));
    const other = (await repo.passengers(manager)).find((p) => !mine.has(p.id))!;
    await expect(repo.passenger(driver, other.id)).rejects.toThrow('not-found');
    await expect(repo.logPayment(driver, { passengerId: other.id, amount: 5, date: TODAY, method: 'cash', forMonth: MONTH }))
      .rejects.toThrow('not-found');
  });
  it('a driver only sees payments of their own passengers', async () => {
    const driver = await as('driver');
    const mine = new Set((await repo.passengers(driver)).map((p) => p.id));
    const pays = await repo.payments(driver, MONTH);
    expect(pays.length).toBeGreaterThan(0);
    expect(pays.every((x) => mine.has(x.passengerId))).toBe(true);
  });
  it('a passenger sees only themselves', async () => {
    const passenger = await as('passenger');
    expect(await repo.passengers(passenger)).toHaveLength(1);
  });
});

describe('trips', () => {
  it('marking the same day twice keeps one trip per passenger with the latest status', async () => {
    const id = (await repo.passengers(manager))[0].id;
    await repo.markTrips(manager, TODAY, [{ passengerId: id, status: 'travelled' }]);
    await repo.markTrips(manager, TODAY, [{ passengerId: id, status: 'absent' }]);
    const today = (await repo.trips(manager, TODAY)).filter((t) => t.passengerId === id);
    expect(today).toHaveLength(1);
    expect(today[0].status).toBe('absent');
  });
  it('marking a per-trip passenger absent lowers what they owe by one trip', async () => {
    const row = (await repo.statusBoard(manager, MONTH)).find((r) => r.passenger.billingType === 'perTrip' && r.ledger.expected > 0)!;
    const days = await Promise.all(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'].map((d) => repo.trips(manager, d)));
    const day = days.flat().find((t) => t.passengerId === row.passenger.id && t.status === 'travelled');
    expect(day, 'seed has a travelled trip in early October for a per-trip passenger').toBeTruthy();
    await repo.markTrips(manager, day!.date, [{ passengerId: row.passenger.id, status: 'absent' }]);
    const after = (await repo.statusBoard(manager, MONTH)).find((r) => r.passenger.id === row.passenger.id)!;
    expect(after.ledger.expected).toBe(row.ledger.expected - row.passenger.perTripFee);
  });
});

describe('passengers', () => {
  const input = (carId: string | null, phone = '971501112233') => ({
    carId, name: 'New Passenger', employerName: 'Test Company', phone, pickupArea: 'Karama', dropArea: 'JLT', seatNumber: 9,
    billingType: 'monthly' as const, monthlyFee: 300, perTripFee: 0, joinDate: TODAY,
  });

  it('saves a new passenger into the manager company with a derived route', async () => {
    const car = (await repo.cars(manager))[0];
    const p = await repo.savePassenger(manager, input(car.id));
    expect(p).toMatchObject({ companyId: DEMO_COMPANY_ID, carId: car.id, route: 'Karama → JLT', status: 'active', phone: '971501112233' });
    expect((await repo.passengers(manager)).some((x) => x.id === p.id)).toBe(true);
  });
  it('refuses a second passenger with the same phone in the company', async () =>
    expect(repo.savePassenger(manager, input(null, '050 111 2233'))).rejects.toThrow('duplicate-phone'));
  it('refuses a phone that is not a UAE mobile', async () =>
    expect(repo.savePassenger(manager, input(null, '12345'))).rejects.toThrow('invalid-phone'));
  it('can save a passenger who has no car yet', async () =>
    expect((await repo.savePassenger(manager, input(null, '971509998877'))).carId).toBeNull());
  it('deactivating removes the passenger from the status board', async () => {
    const row = (await repo.statusBoard(manager, MONTH))[0];
    await repo.deactivatePassenger(manager, row.passenger.id);
    expect((await repo.statusBoard(manager, MONTH)).some((r) => r.passenger.id === row.passenger.id)).toBe(false);
  });
});

describe('public registration', () => {
  it('registers into the company and suggests the least-full car', async () => {
    const p = await repo.registerPassenger(DEMO_COMPANY_ID, {
      name: 'Walk In', employerName: 'DEWA', phone: '0507776655', pickupArea: 'Deira', dropArea: 'Al Quoz 1',
    });
    expect(p).toMatchObject({ companyId: DEMO_COMPANY_ID, phone: '971507776655', status: 'active', joinDate: TODAY });
    expect(p.carId).not.toBeNull();
  });
  it('refuses the same phone twice', () =>
    expect(repo.registerPassenger(DEMO_COMPANY_ID, {
      name: 'Again', employerName: 'DEWA', phone: '971507776655', pickupArea: 'Deira', dropArea: 'Al Quoz 1',
    })).rejects.toThrow('duplicate-phone'));
  it('refuses a suspended or unknown company', async () => {
    const reg = { name: 'X', employerName: 'Y', phone: '971507770000', pickupArea: 'Deira', dropArea: 'Al Quoz 1' };
    await expect(repo.registerPassenger('co-palm', reg)).rejects.toThrow('not-found');
    await expect(repo.registerPassenger('co-nope', reg)).rejects.toThrow('not-found');
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
  it('lists recent payments newest first with passenger names', async () => {
    const d = await repo.dashboard(manager, MONTH);
    expect(d.recentPayments.length).toBeGreaterThan(0);
    expect(d.recentPayments.every((x) => x.passengerName.length > 0)).toBe(true);
    const dates = d.recentPayments.map((x) => x.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
  it('counts passengers per car', async () => {
    const d = await repo.dashboard(manager, MONTH);
    expect(d.cars).toHaveLength(3);
    expect(d.cars.reduce((s, c) => s + c.passengers, 0)).toBe(d.rows.filter((r) => r.passenger.carId !== null).length);
    expect(d.cars.every((c) => c.driver !== null)).toBe(true);
  });
});
