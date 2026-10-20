import { companySummary, monthOf, statusFor } from '../billing';
import { todayInDubai } from '../clock';
import { buildSeed, DB_VERSION } from './seed';
import { canWrite, visibleCars, visiblePassengers, type WriteAction } from './scope';
import type { Db, Passenger, RegistrationInput, Repository, Session, StatusRow, Trip, User } from './types';

export const STORAGE_KEY = 'liftledger.db.v2';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface MockOptions {
  storage?: StorageLike | null;
  today?: () => string;
  /** Simulated network delay range in milliseconds. */
  latency?: [number, number];
}

const LISTS = ['plans', 'companies', 'users', 'cars', 'drivers', 'passengers', 'payments', 'trips'] as const;

function isDb(x: unknown, month: string): x is Db {
  if (typeof x !== 'object' || x === null) return false;
  const d = x as Record<string, unknown>;
  return d.version === DB_VERSION && d.seedMonth === month && LISTS.every((k) => Array.isArray(d[k]));
}

const fail = (code: 'not-found' | 'forbidden' | 'invalid-input' | 'invalid-credentials' | 'company-suspended') => new Error(code);

export function createMockRepository(opts: MockOptions = {}): Repository {
  const storage = opts.storage ?? null;
  const today = opts.today ?? todayInDubai;
  const [lo, hi] = opts.latency ?? [150, 400];
  let cache: Db | null = null;

  const save = () => {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // Storage full or blocked: the demo keeps working from memory.
    }
  };

  const db = (): Db => {
    const month = monthOf(today());
    if (cache && cache.seedMonth === month) return cache;
    try {
      const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
      if (isDb(parsed, month)) return (cache = parsed);
    } catch {
      // Unreadable data falls through to a fresh seed.
    }
    cache = buildSeed(today());
    save();
    return cache;
  };

  const wait = () => (hi <= 0 ? Promise.resolve() : new Promise<void>((r) => setTimeout(r, lo + Math.random() * (hi - lo))));

  const toSession = (u: User): Session => ({ userId: u.id, role: u.role, companyId: u.companyId, name: u.name, locale: u.locale });

  const seen = (s: Session, id: string): Passenger => {
    const p = visiblePassengers(s, db()).find((x) => x.id === id);
    if (!p) throw fail('not-found');
    return p;
  };

  const allow = (s: Session, action: WriteAction, p: Pick<Passenger, 'companyId' | 'carId'>) => {
    if (!canWrite(s, action, { companyId: p.companyId, carId: p.carId }, db())) throw fail('forbidden');
  };

  const dueDayOf = (companyId: string) => db().companies.find((c) => c.id === companyId)?.dueDay ?? 5;

  const board = (s: Session, month: string): StatusRow[] => {
    const d = db();
    return visiblePassengers(s, d)
      .filter((p) => p.status === 'active')
      .map((passenger) => {
        const car = d.cars.find((c) => c.id === passenger.carId) ?? null;
        return {
          passenger,
          car,
          driver: d.drivers.find((x) => x.id === car?.driverId) ?? null,
          ledger: statusFor(passenger, month, d.payments, d.trips, today(), dueDayOf(passenger.companyId)),
        };
      });
  };

  const companyOf = (s: Session) => {
    const d = db();
    const u = d.users.find((x) => x.id === s.userId && x.companyId === s.companyId);
    const c = d.companies.find((x) => x.id === u?.companyId);
    if (!c) throw fail('not-found');
    return c;
  };

  return {
    async login(identifier, password) {
      await wait();
      const d = db();
      const id = identifier.trim().toLowerCase();
      // Local mobile numbers (050 123 4567) are stored in international form (971501234567).
      const digits = id.replace(/\D/g, '').replace(/^0(?=5\d{8}$)/, '971');
      const u = d.users.find((x) => (id.includes('@') ? x.email?.toLowerCase() === id : digits.length > 0 && x.phone === digits));
      if (!u || u.password !== password) throw fail('invalid-credentials');
      if (u.companyId && d.companies.find((c) => c.id === u.companyId)?.status === 'suspended') throw fail('company-suspended');
      return toSession(u);
    },

    async loginAs(userId) {
      await wait();
      const u = db().users.find((x) => x.id === userId);
      if (!u) throw fail('invalid-credentials');
      return toSession(u);
    },

    async demoUsers() {
      await wait();
      const d = db();
      const first = d.companies[0]?.id;
      const companyName = (id: string | null) => d.companies.find((c) => c.id === id)?.name ?? null;
      return d.users
        .filter((u) => u.companyId === first || u.role === 'admin' || u.role === 'manager')
        .map(({ id, name, role, email, companyId }) => ({ id, name, role, email, companyId, companyName: companyName(companyId) }));
    },

    async company(s) {
      await wait();
      return companyOf(s);
    },

    async cars(s) {
      await wait();
      return visibleCars(s, db());
    },

    async drivers(s) {
      await wait();
      const ids = new Set(visibleCars(s, db()).map((c) => c.driverId));
      return s.role === 'manager' || s.role === 'admin'
        ? db().drivers.filter((x) => s.role === 'admin' || x.companyId === companyOf(s).id)
        : db().drivers.filter((x) => ids.has(x.id));
    },

    async passengers(s) {
      await wait();
      return visiblePassengers(s, db());
    },

    async passenger(s, id) {
      await wait();
      return seen(s, id);
    },

    async savePassenger(s, input, id) {
      await wait();
      const d = db();
      const car = visibleCars(s, d).find((c) => c.id === input.carId);
      if (!car) throw fail('not-found');
      // Duplicate phone check within the same company
      const phone = input.phone.replace(/\D/g, '');
      const dup = d.passengers.find((p) => p.phone === phone && p.companyId === car.companyId && p.id !== id);
      if (dup) throw new Error('duplicate-phone');
      const now = today();
      const fields = { ...input, phone, route: `${input.pickupArea} → ${input.dropArea}`, updatedAt: now };
      if (id) {
        const existing = seen(s, id);
        allow(s, 'passenger', existing);
        Object.assign(existing, fields);
        save();
        return existing;
      }
      allow(s, 'passenger', { companyId: car.companyId, carId: car.id });
      const created: Passenger = { ...fields, id: crypto.randomUUID(), companyId: car.companyId, status: 'active', createdAt: now };
      d.passengers.push(created);
      save();
      return created;
    },

    async deactivatePassenger(s, id) {
      await wait();
      const p = seen(s, id);
      allow(s, 'passenger', p);
      p.status = 'inactive';
      p.updatedAt = today();
      save();
      return p;
    },

    async payments(s, month) {
      await wait();
      const ids = new Set(visiblePassengers(s, db()).map((p) => p.id));
      return db().payments.filter((x) => ids.has(x.passengerId) && (!month || x.forMonth === month));
    },

    async logPayment(s, input) {
      await wait();
      const p = seen(s, input.passengerId);
      allow(s, 'payment', p);
      const validAmount = Number.isInteger(input.amount) && input.amount > 0;
      if (!validAmount || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.forMonth) || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
        throw fail('invalid-input');
      }
      const payment = {
        ...input, id: crypto.randomUUID(), companyId: p.companyId, loggedByUserId: s.userId, createdAt: new Date().toISOString(),
      };
      db().payments.push(payment);
      save();
      return payment;
    },

    async deletePayment(s, id) {
      await wait();
      const d = db();
      const payment = d.payments.find((x) => x.id === id);
      if (!payment) throw fail('not-found');
      seen(s, payment.passengerId);
      if (s.role !== 'manager') throw fail('forbidden');
      d.payments.splice(d.payments.indexOf(payment), 1);
      save();
    },

    async trips(s, date) {
      await wait();
      const ids = new Set(visiblePassengers(s, db()).map((p) => p.id));
      return db().trips.filter((t) => t.date === date && ids.has(t.passengerId));
    },

    async markTrips(s, date, marks) {
      await wait();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail('invalid-input');
      const d = db();
      const out: Trip[] = [];
      for (const mark of marks) {
        const p = seen(s, mark.passengerId);
        allow(s, 'trip', p);
        const existing = d.trips.find((t) => t.passengerId === p.id && t.date === date);
        if (existing) {
          existing.status = mark.status;
          out.push(existing);
        } else {
          const trip: Trip = { id: `trip-${p.id}-${date}`, companyId: p.companyId, passengerId: p.id, date, status: mark.status };
          d.trips.push(trip);
          out.push(trip);
        }
      }
      save();
      return out;
    },

    async statusBoard(s, month) {
      await wait();
      return board(s, month);
    },

    async dashboard(s, month) {
      await wait();
      const d = db();
      const company = companyOf(s);
      const people = visiblePassengers(s, d);
      const ids = new Map(people.map((p) => [p.id, p.name]));
      const rows = board(s, month);
      return {
        summary: companySummary({ month, passengers: people, payments: d.payments, trips: d.trips, today: today(), dueDay: company.dueDay }),
        rows,
        recentPayments: d.payments
          .filter((x) => ids.has(x.passengerId))
          .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
          .slice(0, 8)
          .map((x) => ({ ...x, passengerName: ids.get(x.passengerId) ?? '' })),
        cars: visibleCars(s, d).map((car) => ({
          ...car,
          driver: d.drivers.find((x) => x.id === car.driverId) ?? null,
          riders: rows.filter((r) => r.passenger.carId === car.id).length,
        })),
      };
    },

    async companyById(companyId) {
      await wait();
      const c = db().companies.find((x) => x.id === companyId);
      return c ? { id: c.id, name: c.name, phone: c.phone } : null;
    },

    async registerPassenger(companyId, input) {
      await wait();
      const d = db();
      const company = d.companies.find((c) => c.id === companyId && c.status !== 'suspended');
      if (!company) throw fail('not-found');
      const phone = input.phone.replace(/\D/g, '');
      if (!/^971\d{9}$/.test(phone)) throw new Error('invalid-phone');
      const dup = d.passengers.find((p) => p.phone === phone && p.companyId === companyId);
      if (dup) throw new Error('duplicate-phone');
      // Assign to the first active car with capacity
      const activeCars = d.cars.filter((c) => c.companyId === companyId && c.status === 'active');
      if (activeCars.length === 0) throw fail('not-found');
      const carCounts = new Map(activeCars.map((c) => [c.id, 0]));
      for (const p of d.passengers) if (p.companyId === companyId && p.status === 'active' && carCounts.has(p.carId)) carCounts.set(p.carId, (carCounts.get(p.carId) ?? 0) + 1);
      const bestCar = activeCars.reduce((a, b) => ((carCounts.get(a.id) ?? 0) <= (carCounts.get(b.id) ?? 0) ? a : b));
      const seatNumber = (carCounts.get(bestCar.id) ?? 0) + 1;
      const now = today();
      const passenger: Passenger = {
        id: crypto.randomUUID(), companyId, carId: bestCar.id, name: input.name, employerName: input.employerName,
        phone, pickupArea: input.pickupArea, dropArea: input.dropArea, route: `${input.pickupArea} → ${input.dropArea}`,
        seatNumber, billingType: 'monthly', monthlyFee: 0, perTripFee: 0, joinDate: now,
        status: 'active', createdAt: now, updatedAt: now,
      };
      d.passengers.push(passenger);
      save();
      return passenger;
    },

    async reset() {
      cache = buildSeed(today());
      save();
    },
  };
}
