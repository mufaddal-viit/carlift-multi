import type { PrismaClient } from '@prisma/client';
import { buildSeed } from '@/core/repo/seed';
import { hashPassword } from './password';
import { forCompany } from './tenant';

const at = (day: string) => new Date(day.length === 10 ? `${day}T08:00:00.000Z` : day);

/**
 * Fills an empty database with the demo companies, built relative to `today`.
 * Refuses when companies already exist, unless `reset` is set, which first deletes every document.
 * Company documents are written through forCompany(), like everything else.
 */
export async function seedDatabase(client: PrismaClient, today: string, { reset = false } = {}) {
  if (reset) {
    await Promise.all([
      client.trip.deleteMany(), client.payment.deleteMany(), client.passenger.deleteMany(), client.car.deleteMany(),
      client.carAssignment.deleteMany(),
      client.driver.deleteMany(), client.user.deleteMany(),
    ]);
    await Promise.all([client.company.deleteMany(), client.plan.deleteMany()]);
  } else if ((await client.company.count()) > 0) {
    throw new Error('The database already has companies. Run with --reset to wipe it and seed again.');
  }

  const seed = buildSeed(today);
  // One hash per distinct password; every demo account shares the demo password.
  const hashes = new Map<string, string>();
  for (const u of seed.users) if (!hashes.has(u.password)) hashes.set(u.password, await hashPassword(u.password));

  await client.plan.createMany({ data: seed.plans });
  await client.company.createMany({
    data: seed.companies.map((c) => ({
      id: c.id, slug: c.slug, name: c.name, tradeLicense: c.tradeLicense ?? null, city: c.city, phone: c.phone,
      planId: c.planId, status: c.status, dueDay: c.dueDay, currency: c.currency, createdAt: at(c.createdAt),
      receiptSeq: seed.payments.filter((x) => x.companyId === c.id).length,
    })),
  });

  const admins = seed.users.filter((u) => u.companyId === null);
  await client.user.createMany({
    data: admins.map((u) => ({
      id: u.id, companyId: null, role: u.role, name: u.name, email: u.email?.toLowerCase() ?? null, phone: u.phone,
      passwordHash: hashes.get(u.password)!, locale: u.locale, demo: true,
    })),
  });

  for (const company of seed.companies) {
    const db = forCompany(client, company.id);
    const mine = <T extends { companyId: string | null }>(xs: T[]) => xs.filter((x) => x.companyId === company.id);
    await db.user.createMany({
      data: mine(seed.users).map((u) => ({
        companyId: company.id, id: u.id, role: u.role, name: u.name, email: u.email?.toLowerCase() ?? null, phone: u.phone,
        passwordHash: hashes.get(u.password)!, locale: u.locale, linkedDriverId: u.linkedDriverId ?? null,
        linkedPassengerId: u.linkedPassengerId ?? null, demo: true,
      })),
    });
    await db.driver.createMany({
      data: mine(seed.drivers).map((d) => ({ companyId: company.id, id: d.id, name: d.name, phone: d.phone, licenseNo: d.licenseNo ?? null, status: d.status })),
    });
    await db.car.createMany({
      data: mine(seed.cars).map((c) => ({
        companyId: company.id, id: c.id, model: c.model, plate: c.plate, capacity: c.capacity, driverId: c.driverId, status: c.status, photoKey: c.photoKey,
      })),
    });
    await db.passenger.createMany({
      data: mine(seed.passengers).map((p) => ({
        companyId: company.id, id: p.id, carId: p.carId, name: p.name, employerName: p.employerName, phone: p.phone, pickupArea: p.pickupArea,
        dropArea: p.dropArea, route: p.route, seatNumber: p.seatNumber, billingType: p.billingType, monthlyFee: p.monthlyFee,
        perTripFee: p.perTripFee, joinDate: p.joinDate, status: p.status, createdAt: at(p.createdAt), updatedAt: at(p.updatedAt),
      })),
    });
    // Each passenger's history starts with the car they were given when they joined.
    const seated = mine(seed.passengers).filter((p) => p.carId !== null);
    const manager = mine(seed.users).find((u) => u.role === 'manager');
    if (seated.length) {
      await db.carAssignment.createMany({
        data: seated.map((p) => ({
          companyId: company.id, passengerId: p.id, fromCarId: null, toCarId: p.carId, byUserId: manager?.id ?? null, at: at(p.joinDate),
        })),
      });
    }

    const payments = mine(seed.payments);
    if (payments.length) {
      await db.payment.createMany({
        data: payments.map((x) => ({
          companyId: company.id, id: x.id, passengerId: x.passengerId, amount: x.amount, date: x.date, method: x.method, forMonth: x.forMonth,
          note: x.note ?? null, loggedByUserId: x.loggedByUserId, receiptNo: x.receiptNo, voided: false, createdAt: at(x.createdAt),
        })),
      });
    }
    const trips = mine(seed.trips);
    if (trips.length) {
      await db.trip.createMany({ data: trips.map((t) => ({ companyId: company.id, id: t.id, passengerId: t.passengerId, date: t.date, status: t.status })) });
    }
  }

  return { companies: seed.companies.length, users: seed.users.length, passengers: seed.passengers.length, payments: seed.payments.length, trips: seed.trips.length };
}
