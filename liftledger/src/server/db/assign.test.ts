import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DEMO_COMPANY_ID, DEMO_PASSWORD } from '@/core/repo/seed';
import type { Repository, Session } from '@/core/repo/types';
import { createDbRepository } from './repository';
import { forCompany } from './tenant';
import { createTestDatabase } from './test-db';

const TODAY = '2026-10-13';
const AMAD = 'amad-express';

let client: PrismaClient;
let drop: () => Promise<void>;
let repo: Repository;
let manager: Session;

/** A small car of the demo company, for filling up. */
const SMALL = 'car-majra-small';

beforeAll(async () => {
  ({ client, drop } = await createTestDatabase(TODAY));
  repo = createDbRepository(client, { today: () => TODAY });
  manager = await repo.login('manager@amadexpress.ae', DEMO_PASSWORD, AMAD);
  await forCompany(client, DEMO_COMPANY_ID).car.create({
    data: { id: SMALL, companyId: DEMO_COMPANY_ID, model: 'Toyota Previa', plate: 'Z 1', capacity: 2, status: 'active' },
  });
}, 120_000);

afterAll(() => drop());

/** Active passengers of the demo company that are not in the small car, so tests can move them in. */
const movable = async (n: number) => {
  const all = await repo.passengers(manager);
  return all.filter((p) => p.status === 'active' && p.carId !== SMALL).slice(0, n);
};

const emptySmallCar = async () => {
  for (const p of (await repo.passengers(manager)).filter((x) => x.carId === SMALL)) await repo.assignCar(manager, p.id, null);
};

beforeEach(emptySmallCar);

describe('assigning a car', () => {
  it('moves a passenger, gives them the lowest free seat, and records who did it', async () => {
    const [p] = await movable(1);
    const from = p.carId;
    const moved = await repo.assignCar(manager, p.id, SMALL);
    expect(moved).toMatchObject({ carId: SMALL, seatNumber: 1 });
    const [last] = await repo.assignments(manager, p.id);
    expect(last).toMatchObject({ fromCarId: from, toCarId: SMALL, byUserId: manager.userId, byName: 'Amad' });
  });

  it('shows the move everywhere: fleet seats, passenger record and dashboard', async () => {
    const [p] = await movable(1);
    const before = (await repo.fleet(manager)).find((c) => c.id === SMALL)!;
    await repo.assignCar(manager, p.id, SMALL);
    const after = (await repo.fleet(manager)).find((c) => c.id === SMALL)!;
    expect(after.passengers).toBe(before.passengers + 1);
    expect((await repo.passenger(manager, p.id)).carId).toBe(SMALL);
  });

  it('refuses a full car', async () => {
    const [a, b, c] = await movable(3);
    await repo.assignCar(manager, a.id, SMALL);
    await repo.assignCar(manager, b.id, SMALL);
    await expect(repo.assignCar(manager, c.id, SMALL)).rejects.toThrow('car-full');
    expect((await repo.passenger(manager, c.id)).carId).not.toBe(SMALL);
  });

  it('gives a freed seat to the next passenger', async () => {
    const [a, b, c] = await movable(3);
    await repo.assignCar(manager, a.id, SMALL);
    await repo.assignCar(manager, b.id, SMALL);
    await repo.assignCar(manager, a.id, null);
    expect(await repo.assignCar(manager, c.id, SMALL)).toMatchObject({ carId: SMALL, seatNumber: 1 });
  });

  it('lets only one of two managers take the last seat at the same moment', async () => {
    const [a, b, c] = await movable(3);
    await repo.assignCar(manager, a.id, SMALL);
    const results = await Promise.allSettled([repo.assignCar(manager, b.id, SMALL), repo.assignCar(manager, c.id, SMALL)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refused = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(String(refused.reason)).toContain('car-full');
    expect((await repo.fleet(manager)).find((x) => x.id === SMALL)!.passengers).toBe(2);
  });

  it('takes a passenger out of their car and lists them as waiting', async () => {
    const [p] = await movable(1);
    const out = await repo.assignCar(manager, p.id, null);
    expect(out).toMatchObject({ carId: null, seatNumber: 0 });
    expect((await repo.assignments(manager, p.id))[0]).toMatchObject({ toCarId: null });
  });

  it('does nothing and records nothing when the car does not change', async () => {
    const [p] = await movable(1);
    const before = (await repo.assignments(manager, p.id)).length;
    await repo.assignCar(manager, p.id, p.carId);
    expect(await repo.assignments(manager, p.id)).toHaveLength(before);
  });

  it('refuses an inactive car and an inactive passenger', async () => {
    const db = forCompany(client, DEMO_COMPANY_ID);
    await db.car.create({ data: { id: 'car-off', companyId: DEMO_COMPANY_ID, model: 'Old Van', plate: 'Z 9', capacity: 9, status: 'inactive' } });
    const [p, q] = await movable(2);
    await expect(repo.assignCar(manager, p.id, 'car-off')).rejects.toThrow('car-inactive');
    await repo.deactivatePassenger(manager, q.id);
    await expect(repo.assignCar(manager, q.id, SMALL)).rejects.toThrow('passenger-inactive');
  });

  it('refuses drivers and passengers', async () => {
    const [p] = await movable(1);
    const users = await repo.demoUsers(AMAD);
    for (const role of ['driver', 'passenger'] as const) {
      const u = users.find((x) => x.role === role)!;
      const s = await repo.login(u.email!, DEMO_PASSWORD, AMAD);
      await expect(repo.assignCar(s, p.id, SMALL)).rejects.toThrow('forbidden');
    }
  });

  it('starts every seeded passenger with the car they joined in', async () => {
    const [p] = await movable(1);
    const history = await repo.assignments(manager, p.id);
    expect(history.at(-1)).toMatchObject({ fromCarId: null, byName: 'Amad' });
  });
});

describe('assigning across companies', () => {
  let skyline: Session;
  beforeAll(async () => {
    skyline = await repo.login('manager@skyline.example', DEMO_PASSWORD, 'skyline-commute');
  });

  it("cannot put its passenger in another company's car", async () => {
    const mine = (await repo.passengers(skyline))[0];
    await expect(repo.assignCar(skyline, mine.id, SMALL)).rejects.toThrow('not-found');
    expect((await repo.passenger(skyline, mine.id)).carId).toBe(mine.carId);
  });

  it("cannot move another company's passenger or read their history", async () => {
    const [theirs] = await movable(1);
    await expect(repo.assignCar(skyline, theirs.id, null)).rejects.toThrow('not-found');
    await expect(repo.assignments(skyline, theirs.id)).rejects.toThrow('not-found');
    expect((await repo.passenger(manager, theirs.id)).carId).toBe(theirs.carId);
  });

  it('keeps transactions scoped to the company too', async () => {
    const [theirs] = await movable(1);
    const seen = await forCompany(client, 'co-skyline').$transaction((tx) => tx.passenger.findFirst({ where: { id: theirs.id } }));
    expect(seen).toBeNull();
  });

  it("lists only the company's own cars in the fleet", async () => {
    const fleet = await repo.fleet(skyline);
    expect(fleet.length).toBeGreaterThan(0);
    expect(fleet.every((c) => c.companyId === 'co-skyline')).toBe(true);
  });
});
