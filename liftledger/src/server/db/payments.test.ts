import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_COMPANY_ID, DEMO_PASSWORD } from '@/core/repo/seed';
import type { Repository, Session } from '@/core/repo/types';
import { createDbRepository } from './repository';
import { createTestDatabase } from './test-db';

const TODAY = '2026-10-13';
const MONTH = '2026-10';
const AMAD = 'amad-express';

let client: PrismaClient;
let drop: () => Promise<void>;
let repo: Repository;
let manager: Session;
let driver: Session;

beforeAll(async () => {
  ({ client, drop } = await createTestDatabase(TODAY));
  repo = createDbRepository(client, { today: () => TODAY });
  manager = await repo.login('manager@amadexpress.ae', DEMO_PASSWORD, AMAD);
  driver = await repo.login('rashid@amadexpress.ae', DEMO_PASSWORD, AMAD);
}, 120_000);

afterAll(() => drop());

const someone = async () => (await repo.statusBoard(manager, MONTH)).find((r) => r.ledger.balance > 0)!.passenger;
const pay = async (amount = 25, o: { date?: string; forMonth?: string } = {}) =>
  repo.logPayment(manager, { passengerId: (await someone()).id, amount, date: o.date ?? TODAY, method: 'cash', forMonth: o.forMonth ?? MONTH });

describe('receipt numbers', () => {
  it('numbers seeded payments 1..n per company, in the order money came in', async () => {
    const rows = await client.payment.findMany({ where: { companyId: DEMO_COMPANY_ID }, orderBy: { receiptNo: 'asc' } });
    expect(rows.map((r) => r.receiptNo)).toEqual(rows.map((_, i) => i + 1));
    const dates = rows.map((r) => r.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('gives each new payment the next number', async () => {
    const before = (await client.company.findUniqueOrThrow({ where: { id: DEMO_COMPANY_ID } })).receiptSeq;
    const a = await pay();
    const b = await pay();
    expect([a.receiptNo, b.receiptNo]).toEqual([before + 1, before + 2]);
  });

  it('never hands out the same number twice, even for payments logged at the same moment', async () => {
    const made = await Promise.all(Array.from({ length: 8 }, () => pay(5)));
    expect(new Set(made.map((p) => p.receiptNo)).size).toBe(8);
  });

  it('numbers each company on its own', async () => {
    const skyline = await repo.login('manager@skyline.example', DEMO_PASSWORD, 'skyline-commute');
    const p = (await repo.passengers(skyline))[0];
    const seq = (await client.company.findUniqueOrThrow({ where: { id: 'co-skyline' } })).receiptSeq;
    const made = await repo.logPayment(skyline, { passengerId: p.id, amount: 5, date: TODAY, method: 'cash', forMonth: MONTH });
    expect(made.receiptNo).toBe(seq + 1);
  });
});

describe('logging', () => {
  it('refuses a payment dated in the future', () => expect(pay(5, { date: '2026-10-14' })).rejects.toThrow('invalid-input'));
  it('accepts months from a year back to three ahead', async () => {
    await expect(pay(5, { forMonth: '2025-09' })).rejects.toThrow('invalid-input');
    await expect(pay(5, { forMonth: '2027-02' })).rejects.toThrow('invalid-input');
    await expect(pay(5, { forMonth: '2027-01' })).resolves.toBeTruthy();
  });
});

describe('the ledger', () => {
  it('lists the month’s payments newest first, with names', async () => {
    const made = await pay(33);
    const ledger = await repo.paymentLedger(manager, MONTH);
    expect(ledger.every((x) => x.forMonth === MONTH)).toBe(true);
    const mine = ledger.find((x) => x.id === made.id)!;
    expect(mine).toMatchObject({ amount: 33, loggedByName: 'Amad', voided: false });
    expect(mine.passengerName.length).toBeGreaterThan(0);
    const dates = ledger.map((x) => x.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('adds up to the dashboard’s collected total once voided payments are left out', async () => {
    const ledger = await repo.paymentLedger(manager, MONTH);
    const dash = await repo.dashboard(manager, MONTH);
    const active = new Set((await repo.statusBoard(manager, MONTH)).map((r) => r.passenger.id));
    const counted = ledger.filter((x) => !x.voided && active.has(x.passengerId)).reduce((s, x) => s + x.amount, 0);
    expect(counted).toBe(dash.summary.collected);
  });

  it('shows a driver only the payments of their own passengers', async () => {
    const mine = new Set((await repo.passengers(driver)).map((p) => p.id));
    const ledger = await repo.paymentLedger(driver, MONTH);
    expect(ledger.length).toBeGreaterThan(0);
    expect(ledger.every((x) => mine.has(x.passengerId))).toBe(true);
  });
});

describe('voiding', () => {
  it('keeps the payment on record, flagged, and takes it out of every total', async () => {
    const before = await repo.dashboard(manager, MONTH);
    const made = await pay(77);
    const voided = await repo.voidPayment(manager, made.id, '  Logged for the wrong passenger ');
    expect(voided).toMatchObject({ voided: true, voidReason: 'Logged for the wrong passenger', voidedByName: 'Amad' });
    expect(voided.voidedAt).toBeTruthy();
    expect((await repo.dashboard(manager, MONTH)).summary.collected).toBe(before.summary.collected);
    expect((await repo.payments(manager, MONTH)).some((x) => x.id === made.id)).toBe(false);
    expect((await repo.paymentLedger(manager, MONTH)).find((x) => x.id === made.id)?.voided).toBe(true);
  });

  it('cannot void the same payment twice, even at the same moment', async () => {
    const made = await pay(12);
    const results = await Promise.allSettled([repo.voidPayment(manager, made.id, 'Duplicate'), repo.voidPayment(manager, made.id, 'Duplicate')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await expect(repo.voidPayment(manager, made.id, 'Again')).rejects.toThrow('already-voided');
  });

  it('needs a reason', async () => {
    const made = await pay(9);
    await expect(repo.voidPayment(manager, made.id, ' x ')).rejects.toThrow('invalid-input');
  });

  it('is for managers only', async () => {
    const ledger = await repo.paymentLedger(driver, MONTH);
    await expect(repo.voidPayment(driver, ledger[0].id, 'Driver wants it gone')).rejects.toThrow('forbidden');
  });
});

describe('receipts', () => {
  it('carry the payment, the passenger and the company', async () => {
    const made = await pay(150);
    const r = await repo.receipt(manager, made.id);
    expect(r.payment).toMatchObject({ id: made.id, amount: 150, receiptNo: made.receiptNo, loggedByName: 'Amad' });
    expect(r.payment.passengerPhone).toMatch(/^9715/);
    expect(r.company).toEqual({ name: 'Amad Express', phone: '97143001000', city: 'Dubai', tradeLicense: 'CN-1048821' });
  });

  it('are hidden from a driver for passengers on another car', async () => {
    const mine = new Set((await repo.passengers(driver)).map((p) => p.id));
    const other = (await repo.paymentLedger(manager, MONTH)).find((x) => !mine.has(x.passengerId))!;
    await expect(repo.receipt(driver, other.id)).rejects.toThrow('not-found');
  });
});
