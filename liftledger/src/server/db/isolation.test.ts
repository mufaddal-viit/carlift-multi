import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_COMPANY_ID, DEMO_PASSWORD } from '@/core/repo/seed';
import type { Repository, Session } from '@/core/repo/types';
import { createDbRepository } from './repository';
import { forCompany } from './tenant';
import { createTestDatabase } from './test-db';

/**
 * The tenancy guarantee: acting as one company, nothing of another company can be read, counted, changed or
 * removed, whatever ids are passed in. Company A is Skyline Commute; company B is Amad Express.
 */

const TODAY = '2026-10-13';
const MONTH = '2026-10';
const A = 'co-skyline';
const B = DEMO_COMPANY_ID;

let client: PrismaClient;
let drop: () => Promise<void>;
let repo: Repository;
let managerA: Session;
let ids: { passenger: string; car: string; payment: string; driver: string; user: string };

beforeAll(async () => {
  ({ client, drop } = await createTestDatabase(TODAY));
  repo = createDbRepository(client, { today: () => TODAY });
  managerA = await repo.login('manager@skyline.example', DEMO_PASSWORD, 'skyline-commute');
  const b = forCompany(client, B);
  const [passenger, car, payment, driver, user] = await Promise.all([
    b.passenger.findFirstOrThrow(), b.car.findFirstOrThrow(), b.payment.findFirstOrThrow(), b.driver.findFirstOrThrow(),
    b.user.findFirstOrThrow({ where: { role: 'manager' } }),
  ]);
  ids = { passenger: passenger.id, car: car.id, payment: payment.id, driver: driver.id, user: user.id };
}, 120_000);

afterAll(() => drop());

describe('the repository, acting as company A', () => {
  it('lists only company A in every list', async () => {
    const [passengers, cars, drivers, payments, board, dash] = await Promise.all([
      repo.passengers(managerA), repo.cars(managerA), repo.drivers(managerA), repo.payments(managerA),
      repo.statusBoard(managerA, MONTH), repo.dashboard(managerA, MONTH),
    ]);
    expect(passengers.length).toBeGreaterThan(0);
    for (const x of [...passengers, ...cars, ...drivers, ...payments]) expect(x.companyId).toBe(A);
    for (const r of board) expect(r.passenger.companyId).toBe(A);
    for (const x of dash.recentPayments) expect(x.companyId).toBe(A);
    expect((await repo.company(managerA)).id).toBe(A);
  });

  it("reads company B's passenger as not found", () => expect(repo.passenger(managerA, ids.passenger)).rejects.toThrow('not-found'));

  it("cannot log a payment against company B's passenger", () =>
    expect(repo.logPayment(managerA, { passengerId: ids.passenger, amount: 5, date: TODAY, method: 'cash', forMonth: MONTH }))
      .rejects.toThrow('not-found'));

  it("cannot void or open a receipt of company B's payment", async () => {
    await expect(repo.voidPayment(managerA, ids.payment, 'Not ours')).rejects.toThrow('not-found');
    await expect(repo.receipt(managerA, ids.payment)).rejects.toThrow('not-found');
    expect(await client.payment.findUnique({ where: { id: ids.payment } })).toMatchObject({ voided: false });
    expect((await repo.paymentLedger(managerA, MONTH)).every((x) => x.companyId === A)).toBe(true);
  });

  it("cannot edit, deactivate or mark trips for company B's passenger", async () => {
    const edit = {
      carId: null, name: 'Hijacked', employerName: 'X', phone: '971501231234', pickupArea: 'A', dropArea: 'B', seatNumber: 1,
      billingType: 'monthly' as const, monthlyFee: 1, perTripFee: 0, joinDate: TODAY,
    };
    await expect(repo.savePassenger(managerA, edit, ids.passenger)).rejects.toThrow('not-found');
    await expect(repo.deactivatePassenger(managerA, ids.passenger)).rejects.toThrow('not-found');
    await expect(repo.markTrips(managerA, TODAY, [{ passengerId: ids.passenger, status: 'absent' }])).rejects.toThrow('not-found');
    expect(await client.passenger.findUnique({ where: { id: ids.passenger } })).toMatchObject({ status: 'active', companyId: B });
  });

  it("cannot put its passenger on company B's car", async () => {
    const edit = {
      carId: ids.car, name: 'X', employerName: 'Y', phone: '971501231299', pickupArea: 'A', dropArea: 'B', seatNumber: 1,
      billingType: 'monthly' as const, monthlyFee: 1, perTripFee: 0, joinDate: TODAY,
    };
    await expect(repo.savePassenger(managerA, edit)).rejects.toThrow('not-found');
  });

  it('cannot use a session that claims company B while naming a company A user', () =>
    expect(repo.passengers({ ...managerA, companyId: B, companySlug: 'amad-express' })).rejects.toThrow('forbidden'));

  it('can register the same phone number as a company B passenger, since phones are unique per company', async () => {
    const phoneInB = (await client.passenger.findUniqueOrThrow({ where: { id: ids.passenger } })).phone;
    const p = await repo.registerPassenger(A, { name: 'Shared Phone', employerName: 'X', phone: phoneInB, pickupArea: 'Deira', dropArea: 'Al Quoz 1' });
    expect(p.companyId).toBe(A);
  });
});

describe('the scoped client for company A', () => {
  const a = () => forCompany(client, A);

  it('finds nothing of company B, even by id', async () => {
    expect(await a().passenger.findUnique({ where: { id: ids.passenger } })).toBeNull();
    expect(await a().car.findFirst({ where: { id: ids.car } })).toBeNull();
    expect(await a().user.findFirst({ where: { id: ids.user } })).toBeNull();
    await expect(a().passenger.count({ where: { companyId: B } })).rejects.toThrow('tenant-violation');
  });

  it("cannot update or delete company B's documents", async () => {
    await expect(a().passenger.update({ where: { id: ids.passenger }, data: { name: 'x' } })).rejects.toThrow();
    await expect(a().driver.delete({ where: { id: ids.driver } })).rejects.toThrow();
    expect((await a().payment.updateMany({ where: { id: ids.payment }, data: { amount: 1 } })).count).toBe(0);
    expect((await a().trip.deleteMany({ where: { passengerId: ids.passenger } })).count).toBe(0);
    expect(await client.driver.findUnique({ where: { id: ids.driver } })).not.toBeNull();
  });

  it('refuses to insert into company B or move a document between companies', async () => {
    await expect(a().driver.create({ data: { companyId: B, name: 'Spy', phone: '971500000099' } })).rejects.toThrow('tenant-violation');
    await expect(a().car.updateMany({ data: { companyId: B } })).rejects.toThrow('tenant-violation');
    await expect(
      a().trip.upsert({
        where: { companyId_passengerId_date: { companyId: A, passengerId: 'x', date: TODAY } },
        create: { companyId: B, passengerId: 'x', date: TODAY, status: 'absent' },
        update: {},
      }),
    ).rejects.toThrow('tenant-violation');
  });

  it('stamps its own company on every insert', async () => {
    const d = await a().driver.create({ data: { name: 'New Driver', phone: '971500000098' } as never });
    expect(d.companyId).toBe(A);
  });

  it('refuses raw queries and platform collections', async () => {
    await expect(a().passenger.findRaw({ filter: {} })).rejects.toThrow('tenant-violation');
    await expect((a() as unknown as PrismaClient).company.findMany()).rejects.toThrow('tenant-violation');
  });

  it('cannot be created without a company', () => expect(() => forCompany(client, '')).toThrow('tenant-violation'));
});

describe('the database itself', () => {
  it('refuses a company document without a companyId, even from raw commands', async () => {
    // MongoDB reports refused documents as write errors in the command result.
    const noCompany = await client.$runCommandRaw({ insert: 'passengers', documents: [{ _id: 'orphan', name: 'No company' }] });
    const emptyCompany = await client.$runCommandRaw({ insert: 'payments', documents: [{ _id: 'orphan', companyId: '', amount: 1 }] });
    for (const result of [noCompany, emptyCompany]) {
      expect(result).toMatchObject({ n: 0, writeErrors: [expect.objectContaining({ errmsg: 'Document failed validation' })] });
    }
    expect(await client.passenger.findUnique({ where: { id: 'orphan' } })).toBeNull();
  });
});
