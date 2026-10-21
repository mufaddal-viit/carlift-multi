import { Prisma, type PrismaClient } from '@prisma/client';
import { addMonths, companySummary, statusFor } from '@/core/billing';
import { todayInDubai } from '@/core/clock';
import { canWrite, visibleCars, visiblePassengers, type WriteAction } from '@/core/repo/scope';
import type {
  Car, CarAssignment, Company, Db, Driver, FleetCar, Passenger, PassengerInput, Payment, PublicCompany, Repository, Session, StatusRow,
  Trip, User,
} from '@/core/repo/types';
import { DUMMY_HASH, verifyPassword } from './password';
import { forCompany, type CompanyDb } from './tenant';

export type RepoError =
  | 'not-found' | 'forbidden' | 'invalid-input' | 'invalid-credentials' | 'company-suspended' | 'duplicate-phone' | 'invalid-phone'
  | 'car-full' | 'car-inactive' | 'passenger-inactive';

export const fail = (code: RepoError) => new Error(code);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const UAE_MOBILE = /^9715\d{8}$/;

/** Stored phones are international digits only: "050 123 4567" and "+971 50 123 4567" both become 971501234567. */
export const normalizePhone = (value: string) => value.replace(/\D/g, '').replace(/^0(?=5\d{8}$)/, '971');

// ---- Rows to app types -----------------------------------------------------

const opt = <T,>(v: T | null): T | undefined => (v === null ? undefined : v);
const iso = (d: Date) => d.toISOString();

const toCompany = (c: Prisma.CompanyGetPayload<object>): Company => ({
  id: c.id, slug: c.slug, name: c.name, tradeLicense: opt(c.tradeLicense), city: c.city, phone: c.phone, planId: c.planId,
  status: c.status, dueDay: c.dueDay, currency: 'AED', createdAt: iso(c.createdAt),
});
const toPublic = ({ id, slug, name, phone, status }: Prisma.CompanyGetPayload<object>): PublicCompany => ({ id, slug, name, phone, status });
const toUser = (u: Prisma.UserGetPayload<object>): User => ({
  id: u.id, companyId: u.companyId, role: u.role, name: u.name, email: opt(u.email), phone: u.phone, password: '', locale: u.locale,
  linkedDriverId: opt(u.linkedDriverId), linkedPassengerId: opt(u.linkedPassengerId),
});
const toCar = (c: Prisma.CarGetPayload<object>): Car => ({
  id: c.id, companyId: c.companyId, model: c.model, plate: c.plate, capacity: c.capacity, driverId: c.driverId, status: c.status, photoKey: c.photoKey,
});
const toDriver = (d: Prisma.DriverGetPayload<object>): Driver => ({
  id: d.id, companyId: d.companyId, name: d.name, phone: d.phone, licenseNo: opt(d.licenseNo), status: d.status,
});
const toPassenger = (p: Prisma.PassengerGetPayload<object>): Passenger => ({
  id: p.id, companyId: p.companyId, carId: p.carId, name: p.name, employerName: p.employerName, phone: p.phone,
  pickupArea: p.pickupArea, dropArea: p.dropArea, route: p.route, seatNumber: p.seatNumber, billingType: p.billingType,
  monthlyFee: p.monthlyFee, perTripFee: p.perTripFee, joinDate: p.joinDate, status: p.status,
  createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt),
});
const toPayment = (x: Prisma.PaymentGetPayload<object>): Payment => ({
  id: x.id, companyId: x.companyId, passengerId: x.passengerId, amount: x.amount, date: x.date, method: x.method,
  forMonth: x.forMonth, note: opt(x.note), loggedByUserId: x.loggedByUserId, createdAt: iso(x.createdAt),
});
const toTrip = (t: Prisma.TripGetPayload<object>): Trip => ({
  id: t.id, companyId: t.companyId, passengerId: t.passengerId, date: t.date, status: t.status,
});

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
/** MongoDB aborted a transaction because another one wrote the same document first. */
const isWriteConflict = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034';

/**
 * Puts a passenger in a car (or takes them out with null) and records the change.
 *
 * Runs in a transaction that also writes the car, so two changes racing for its last seat touch the same document:
 * MongoDB lets one commit and aborts the other, which is retried, recounts the seats and reports the car full.
 * The passenger gets the lowest free seat number.
 */
async function moveToCar(db: CompanyDb, companyId: string, passengerId: string, carId: string | null, byUserId: string | null) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const p = await tx.passenger.findFirst({ where: { id: passengerId } });
        if (!p) throw fail('not-found');
        if (p.carId === carId) return p;
        if (p.status !== 'active') throw fail('passenger-inactive');
        let seatNumber = 0;
        if (carId !== null) {
          const car = await tx.car.findFirst({ where: { id: carId } });
          if (!car) throw fail('not-found');
          if (car.status !== 'active') throw fail('car-inactive');
          const riders = await tx.passenger.findMany({ where: { carId, status: 'active' }, select: { seatNumber: true } });
          if (riders.length >= car.capacity) throw fail('car-full');
          const taken = new Set(riders.map((r) => r.seatNumber));
          seatNumber = 1;
          while (taken.has(seatNumber)) seatNumber += 1;
          await tx.car.update({ where: { id: carId }, data: { seatsChangedAt: new Date() } });
        }
        const moved = await tx.passenger.update({ where: { id: passengerId }, data: { carId, seatNumber } });
        await tx.carAssignment.create({ data: { companyId, passengerId, fromCarId: p.carId, toCarId: carId, byUserId } });
        return moved;
      });
    } catch (e) {
      if (attempt < 5 && isWriteConflict(e)) continue;
      throw e;
    }
  }
}

// ---- Repository ------------------------------------------------------------

export interface DbRepositoryOptions {
  today?: () => string;
}

/** Everything one signed-in request may work with: the company-scoped client, the acting user and the company. */
interface Ctx {
  db: CompanyDb;
  actor: User;
  company: Company;
}

/**
 * The Repository backed by MongoDB.
 *
 * Company data is only ever reached through forCompany(session.companyId). The session itself is not trusted on
 * its own: each call re-reads the acting user inside that company and refuses suspended companies, so a deleted
 * user or a suspended company loses access at once, not when the cookie expires.
 *
 * Who-sees-what inside a company (a driver sees their own car) reuses the rules in core/repo/scope.ts, applied to
 * the company's own documents.
 */
export function createDbRepository(client: PrismaClient, opts: DbRepositoryOptions = {}): Repository {
  const today = opts.today ?? todayInDubai;

  async function ctx(s: Session): Promise<Ctx> {
    if (!s.companyId) throw fail('forbidden'); // The platform console has its own module; company data needs a company.
    const db = forCompany(client, s.companyId);
    const [user, company] = await Promise.all([
      db.user.findFirst({ where: { id: s.userId, role: s.role } }),
      client.company.findUnique({ where: { id: s.companyId } }),
    ]);
    if (!user || !company || company.status === 'suspended') throw fail('forbidden');
    return { db, actor: toUser(user), company: toCompany(company) };
  }

  /**
   * The company's documents in the shape the shared rules and billing engine work on.
   * Payments and trips are read from `fromMonth` onwards, or not at all when it is null, so a request never
   * reads the company's whole history.
   */
  async function slice(c: Ctx, fromMonth: string | null): Promise<Db> {
    const [cars, drivers, passengers, payments, trips] = await Promise.all([
      c.db.car.findMany({ orderBy: { plate: 'asc' } }),
      c.db.driver.findMany({ orderBy: { name: 'asc' } }),
      c.db.passenger.findMany({ orderBy: { name: 'asc' } }),
      fromMonth ? c.db.payment.findMany({ where: { forMonth: { gte: fromMonth } } }) : [],
      fromMonth ? c.db.trip.findMany({ where: { date: { gte: `${fromMonth}-01` } } }) : [],
    ]);
    return {
      version: 0, seedMonth: '', plans: [], companies: [c.company], users: [c.actor],
      cars: cars.map(toCar), drivers: drivers.map(toDriver), passengers: passengers.map(toPassenger),
      payments: payments.map(toPayment), trips: trips.map(toTrip),
    };
  }

  const seen = (s: Session, d: Db, id: string): Passenger => {
    const p = visiblePassengers(s, d).find((x) => x.id === id);
    if (!p) throw fail('not-found');
    return p;
  };

  const allow = (s: Session, d: Db, action: WriteAction, p: Pick<Passenger, 'companyId' | 'carId'>) => {
    if (!canWrite(s, action, p, d)) throw fail('forbidden');
  };

  const board = (s: Session, d: Db, month: string): StatusRow[] =>
    visiblePassengers(s, d)
      .filter((p) => p.status === 'active')
      .map((passenger) => {
        const car = d.cars.find((c) => c.id === passenger.carId) ?? null;
        return {
          passenger,
          car,
          driver: d.drivers.find((x) => x.id === car?.driverId) ?? null,
          ledger: statusFor(passenger, month, d.payments, d.trips, today(), d.companies[0].dueDay),
        };
      });

  function validPassengerInput(input: PassengerInput) {
    const fees = [input.monthlyFee, input.perTripFee, input.seatNumber];
    if (!input.name.trim() || !input.pickupArea.trim() || !input.dropArea.trim() || !DATE.test(input.joinDate)) throw fail('invalid-input');
    if (fees.some((n) => !Number.isInteger(n) || n < 0)) throw fail('invalid-input');
    const phone = normalizePhone(input.phone);
    if (!UAE_MOBILE.test(phone)) throw fail('invalid-phone');
    return phone;
  }

  return {
    async login(identifier, password, companySlug) {
      const id = identifier.trim().toLowerCase();
      const phone = normalizePhone(id);
      const match = id.includes('@') ? { email: id } : phone ? { phone } : null;
      let user: Prisma.UserGetPayload<object> | null = null;
      let company: Prisma.CompanyGetPayload<object> | null = null;

      if (match && companySlug === null) {
        user = await client.user.findFirst({ where: { ...match, companyId: null, role: 'admin' } });
      } else if (match && companySlug) {
        company = await client.company.findUnique({ where: { slug: companySlug } });
        if (company) user = await forCompany(client, company.id).user.findFirst({ where: match });
      }

      const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !ok) throw fail('invalid-credentials');
      // Only after the password is right, so a stranger cannot learn which companies are suspended.
      if (company?.status === 'suspended') throw fail('company-suspended');
      return {
        userId: user.id, role: user.role, companyId: user.companyId, companySlug: company?.slug ?? null, name: user.name, locale: user.locale,
      };
    },

    async demoUsers(companySlug) {
      const where = { demo: true, ...(companySlug === null ? { companyId: null, role: 'admin' as const } : {}) };
      let users: Prisma.UserGetPayload<object>[] = [];
      if (companySlug === null) users = await client.user.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
      else {
        const company = await client.company.findUnique({ where: { slug: companySlug } });
        if (company) users = await forCompany(client, company.id).user.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
      }
      return users.map(({ id, name, role, email, companyId }) => ({ id, name, role, email: opt(email), companyId }));
    },

    async company(s) {
      return (await ctx(s)).company;
    },

    async cars(s) {
      return visibleCars(s, await slice(await ctx(s), null));
    },

    async drivers(s) {
      const d = await slice(await ctx(s), null);
      if (s.role === 'manager') return d.drivers;
      const ids = new Set(visibleCars(s, d).map((c) => c.driverId));
      return d.drivers.filter((x) => ids.has(x.id));
    },

    async passengers(s) {
      return visiblePassengers(s, await slice(await ctx(s), null));
    },

    async passenger(s, id) {
      return seen(s, await slice(await ctx(s), null), id);
    },

    async savePassenger(s, input, id) {
      const c = await ctx(s);
      const d = await slice(c, null);
      const phone = validPassengerInput(input);
      const car = input.carId === null ? null : visibleCars(s, d).find((x) => x.id === input.carId);
      if (car === undefined) throw fail('not-found');
      if (d.passengers.some((p) => p.phone === phone && p.id !== id)) throw fail('duplicate-phone');
      const fields = {
        carId: car?.id ?? null, name: input.name.trim(), employerName: input.employerName.trim(), phone,
        pickupArea: input.pickupArea, dropArea: input.dropArea, route: `${input.pickupArea} → ${input.dropArea}`,
        seatNumber: input.seatNumber, billingType: input.billingType, monthlyFee: input.monthlyFee, perTripFee: input.perTripFee,
        joinDate: input.joinDate,
      };
      // The car is changed separately, through the same seat checks and history as assignCar.
      const { carId, ...details } = fields;
      let saved: Prisma.PassengerGetPayload<object>;
      try {
        if (id) {
          allow(s, d, 'passenger', seen(s, d, id));
          saved = await c.db.passenger.update({ where: { id }, data: details });
        } else {
          allow(s, d, 'passenger', { companyId: c.company.id, carId });
          saved = await c.db.passenger.create({
            data: { ...details, carId: null, seatNumber: 0, companyId: c.company.id, status: 'active' },
          });
        }
      } catch (e) {
        if (isUniqueViolation(e)) throw fail('duplicate-phone');
        throw e;
      }
      if (saved.carId === carId) return toPassenger(saved);
      return toPassenger(await moveToCar(c.db, c.company.id, saved.id, carId, s.userId));
    },

    async deactivatePassenger(s, id) {
      const c = await ctx(s);
      const d = await slice(c, null);
      allow(s, d, 'passenger', seen(s, d, id));
      return toPassenger(await c.db.passenger.update({ where: { id }, data: { status: 'inactive' } }));
    },

    async fleet(s) {
      const d = await slice(await ctx(s), null);
      return visibleCars(s, d).map((car): FleetCar => ({
        ...car,
        driver: d.drivers.find((x) => x.id === car.driverId) ?? null,
        passengers: d.passengers.filter((p) => p.carId === car.id && p.status === 'active').length,
      }));
    },

    async assignCar(s, passengerId, carId) {
      const c = await ctx(s);
      if (c.actor.role !== 'manager') throw fail('forbidden');
      return toPassenger(await moveToCar(c.db, c.company.id, passengerId, carId, s.userId));
    },

    async assignments(s, passengerId) {
      const c = await ctx(s);
      seen(s, await slice(c, null), passengerId);
      const rows = await c.db.carAssignment.findMany({ where: { passengerId }, orderBy: { at: 'desc' }, take: 50 });
      const userIds = [...new Set(rows.map((r) => r.byUserId).filter((x): x is string => x !== null))];
      const users = await c.db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
      const names = new Map(users.map((u) => [u.id, u.name]));
      return rows.map((r): CarAssignment => ({
        id: r.id, passengerId: r.passengerId, fromCarId: r.fromCarId, toCarId: r.toCarId, byUserId: r.byUserId,
        byName: r.byUserId ? (names.get(r.byUserId) ?? null) : null, at: iso(r.at),
      }));
    },

    async payments(s, month) {
      const c = await ctx(s);
      const d = await slice(c, null);
      const ids = visiblePassengers(s, d).map((p) => p.id);
      const rows = await c.db.payment.findMany({
        where: { passengerId: { in: ids }, ...(month ? { forMonth: month } : {}) },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });
      return rows.map(toPayment);
    },

    async logPayment(s, input) {
      const c = await ctx(s);
      const d = await slice(c, null);
      const p = seen(s, d, input.passengerId);
      allow(s, d, 'payment', p);
      const validAmount = Number.isInteger(input.amount) && input.amount > 0 && input.amount <= 1_000_000;
      if (!validAmount || !MONTH.test(input.forMonth) || !DATE.test(input.date)) throw fail('invalid-input');
      const row = await c.db.payment.create({
        data: {
          companyId: c.company.id, passengerId: p.id, amount: input.amount, date: input.date, method: input.method,
          forMonth: input.forMonth, note: input.note?.trim() || null, loggedByUserId: s.userId,
        },
      });
      return toPayment(row);
    },

    async deletePayment(s, id) {
      const c = await ctx(s);
      const payment = await c.db.payment.findFirst({ where: { id } });
      if (!payment) throw fail('not-found');
      seen(s, await slice(c, null), payment.passengerId);
      if (s.role !== 'manager') throw fail('forbidden');
      await c.db.payment.delete({ where: { id } });
    },

    async trips(s, date) {
      if (!DATE.test(date)) throw fail('invalid-input');
      const c = await ctx(s);
      const d = await slice(c, date.slice(0, 7));
      const ids = new Set(visiblePassengers(s, d).map((p) => p.id));
      return d.trips.filter((t) => t.date === date && ids.has(t.passengerId));
    },

    async markTrips(s, date, marks) {
      if (!DATE.test(date) || marks.some((m) => m.status !== 'travelled' && m.status !== 'absent')) throw fail('invalid-input');
      const c = await ctx(s);
      const d = await slice(c, date.slice(0, 7));
      const out: Trip[] = [];
      for (const mark of marks) {
        const p = seen(s, d, mark.passengerId);
        allow(s, d, 'trip', p);
        const row = await c.db.trip.upsert({
          where: { companyId_passengerId_date: { companyId: c.company.id, passengerId: p.id, date } },
          create: { companyId: c.company.id, passengerId: p.id, date, status: mark.status },
          update: { status: mark.status },
        });
        out.push(toTrip(row));
      }
      return out;
    },

    async statusBoard(s, month) {
      if (!MONTH.test(month)) throw fail('invalid-input');
      return board(s, await slice(await ctx(s), month), month);
    },

    async dashboard(s, month) {
      if (!MONTH.test(month)) throw fail('invalid-input');
      const c = await ctx(s);
      const d = await slice(c, addMonths(month, -5));
      const people = visiblePassengers(s, d);
      const names = new Map(people.map((p) => [p.id, p.name]));
      const rows = board(s, d, month);
      const recent = await c.db.payment.findMany({
        where: { passengerId: { in: [...names.keys()] } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      });
      return {
        summary: companySummary({ month, passengers: people, payments: d.payments, trips: d.trips, today: today(), dueDay: c.company.dueDay }),
        rows,
        recentPayments: recent.map((x) => ({ ...toPayment(x), passengerName: names.get(x.passengerId) ?? '' })),
        cars: visibleCars(s, d).map((car) => ({
          ...car,
          driver: d.drivers.find((x) => x.id === car.driverId) ?? null,
          passengers: rows.filter((r) => r.passenger.carId === car.id).length,
        })),
      };
    },

    async companyById(companyId) {
      const c = await client.company.findUnique({ where: { id: companyId } });
      return c ? toPublic(c) : null;
    },

    async companyBySlug(slug) {
      const c = await client.company.findUnique({ where: { slug } });
      return c ? toPublic(c) : null;
    },

    async registerPassenger(companyId, input) {
      const company = await client.company.findUnique({ where: { id: companyId } });
      if (!company || company.status === 'suspended') throw fail('not-found');
      const phone = normalizePhone(input.phone);
      if (!UAE_MOBILE.test(phone)) throw fail('invalid-phone');
      if (!input.name.trim() || !input.employerName.trim() || !input.pickupArea.trim() || !input.dropArea.trim()) throw fail('invalid-input');
      const db = forCompany(client, companyId);
      if (await db.passenger.findFirst({ where: { phone } })) throw fail('duplicate-phone');

      // Suggest the least-full active car with a free seat; the manager can move them later.
      const [cars, riding] = await Promise.all([
        db.car.findMany({ where: { status: 'active' } }),
        db.passenger.groupBy({ by: ['carId'], where: { status: 'active' }, _count: { _all: true } }),
      ]);
      const load = new Map(riding.map((r) => [r.carId, r._count._all]));
      const open = cars.filter((car) => (load.get(car.id) ?? 0) < car.capacity);
      const best = open.sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))[0] ?? null;

      let row: Prisma.PassengerGetPayload<object>;
      try {
        row = await db.passenger.create({
          data: {
            companyId, carId: null, name: input.name.trim(), employerName: input.employerName.trim(), phone,
            pickupArea: input.pickupArea, dropArea: input.dropArea, route: `${input.pickupArea} → ${input.dropArea}`,
            seatNumber: 0, billingType: 'monthly', monthlyFee: 0, perTripFee: 0, joinDate: today(), status: 'active',
          },
        });
      } catch (e) {
        if (isUniqueViolation(e)) throw fail('duplicate-phone');
        throw e;
      }
      if (!best) return toPassenger(row);
      try {
        return toPassenger(await moveToCar(db, companyId, row.id, best.id, null));
      } catch (e) {
        // The suggested car filled up meanwhile: the passenger waits for the manager to choose one.
        if (e instanceof Error && e.message === 'car-full') return toPassenger(row);
        throw e;
      }
    },
  };
}
