import { addMonths, daysInMonth, expectedFor, monthOf } from '../billing';
import { slugify } from '../tenant';
import type { Car, Company, Db, Driver, Passenger, PayMethod, Payment, Plan, Trip, User } from './types';

export const DB_VERSION = 3;
export const DEMO_COMPANY_ID = 'co-majra';
export const DEMO_PASSWORD = 'demo1234';

const pad = (n: number) => String(n).padStart(2, '0');

/** Small deterministic generator so the same day always yields the same demo data. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isWorkingDay = (day: string) => {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  return dow >= 1 && dow <= 5;
};

/** How a passenger behaves in the current month. */
type Habit = 'full' | 'partial' | 'none' | 'advance' | 'late';

interface Row {
  name: string;
  employer: string;
  pickup: string;
  drop: string;
  car: 1 | 2 | 3;
  fee: number;
  habit: Habit;
  monthsAgo: number;
  perTrip?: boolean;
  inactive?: boolean;
}

// monthsAgo 0 means "joined a few days ago", which exercises pro-rating.
const EMPLOYERS = ['Emirates Steel', 'Al Futtaim Group', 'DEWA', 'Emaar Properties', 'Dubai Holdings', 'Jumeirah Group', 'Majid Al Futtaim', 'Etisalat', 'ENOC', 'Nakheel', 'DP World', 'Damac Properties'];

const ROSTER: Row[] = [
  { name: 'Priya Nair', employer: 'Emirates Steel', pickup: 'Karama', drop: 'JLT', car: 1, fee: 380, habit: 'advance', monthsAgo: 14 },
  { name: 'Rahul Menon', employer: 'Al Futtaim Group', pickup: 'Al Nahda', drop: 'Business Bay', car: 1, fee: 350, habit: 'full', monthsAgo: 11 },
  { name: 'Ayesha Khan', employer: 'DEWA', pickup: 'Al Qusais', drop: 'DIFC', car: 1, fee: 400, habit: 'partial', monthsAgo: 9 },
  { name: 'Lina Haddad', employer: 'Emaar Properties', pickup: 'Jumeirah', drop: 'DIFC', car: 1, fee: 500, habit: 'full', monthsAgo: 8 },
  { name: 'Omar Farouk', employer: 'Dubai Holdings', pickup: 'Al Nahda', drop: 'Downtown', car: 1, fee: 360, habit: 'full', monthsAgo: 7 },
  { name: 'Grace Fernandes', employer: 'Jumeirah Group', pickup: 'Karama', drop: 'Business Bay', car: 1, fee: 340, habit: 'late', monthsAgo: 6 },
  { name: 'Imran Sheikh', employer: 'Majid Al Futtaim', pickup: 'Al Qusais', drop: 'Downtown', car: 1, fee: 370, habit: 'full', monthsAgo: 4 },
  { name: 'Neha Kapoor', employer: 'Etisalat', pickup: 'Oud Metha', drop: 'JLT', car: 1, fee: 390, habit: 'full', monthsAgo: 3 },
  { name: 'Mohammed Siddiqui', employer: 'ENOC', pickup: 'Deira', drop: 'Media City', car: 2, fee: 350, habit: 'none', monthsAgo: 12 },
  { name: 'Sara Abdullah', employer: 'Nakheel', pickup: 'JVC', drop: 'Internet City', car: 2, fee: 420, habit: 'full', monthsAgo: 10 },
  { name: 'Fatima Ali', employer: 'DP World', pickup: 'Al Nahda', drop: 'Downtown', car: 2, fee: 350, habit: 'full', monthsAgo: 0 },
  { name: 'Daniel Cruz', employer: 'Damac Properties', pickup: 'Deira', drop: 'Internet City', car: 2, fee: 380, habit: 'full', monthsAgo: 8 },
  { name: 'Hessa Al Marri', employer: 'Emirates Steel', pickup: 'Mirdif', drop: 'Media City', car: 2, fee: 450, habit: 'partial', monthsAgo: 6 },
  { name: 'Arjun Pillai', employer: 'Al Futtaim Group', pickup: 'Al Barsha', drop: 'Media City', car: 2, fee: 300, habit: 'full', monthsAgo: 5 },
  { name: 'Maryam Yousuf', employer: 'DEWA', pickup: 'Deira', drop: 'Marina', car: 2, fee: 410, habit: 'full', monthsAgo: 2 },
  { name: 'Kevin Thomas', employer: 'Emaar Properties', pickup: 'JVC', drop: 'Marina', car: 2, fee: 30, habit: 'none', monthsAgo: 5, perTrip: true },
  { name: 'Suresh Kumar', employer: 'Dubai Holdings', pickup: 'Sharjah Taawun', drop: 'Al Barsha', car: 3, fee: 450, habit: 'full', monthsAgo: 13 },
  { name: "John D'Souza", employer: 'Jumeirah Group', pickup: 'Mirdif', drop: 'Festival City', car: 3, fee: 25, habit: 'partial', monthsAgo: 6, perTrip: true },
  { name: 'Vikram Shah', employer: 'Majid Al Futtaim', pickup: 'Al Warqa', drop: 'Silicon Oasis', car: 3, fee: 400, habit: 'none', monthsAgo: 9 },
  { name: 'Reem Hassan', employer: 'Etisalat', pickup: 'Sharjah Taawun', drop: 'Silicon Oasis', car: 3, fee: 460, habit: 'full', monthsAgo: 7 },
  { name: 'Anil George', employer: 'ENOC', pickup: 'Al Warqa', drop: 'Festival City', car: 3, fee: 330, habit: 'full', monthsAgo: 5 },
  { name: 'Zainab Hussain', employer: 'Nakheel', pickup: 'Muhaisnah', drop: 'Al Barsha', car: 3, fee: 440, habit: 'late', monthsAgo: 4 },
  { name: 'Carlos Reyes', employer: 'DP World', pickup: 'Mirdif', drop: 'Silicon Oasis', car: 3, fee: 390, habit: 'full', monthsAgo: 3 },
  { name: 'Tariq Mansoor', employer: 'Damac Properties', pickup: 'Muhaisnah', drop: 'Festival City', car: 3, fee: 360, habit: 'none', monthsAgo: 5, inactive: true },
];

const PLANS: Plan[] = [
  { id: 'plan-starter', name: 'Starter', priceAed: 99, maxCars: 2, maxPassengers: 30, features: ['payments', 'attendance', 'reminders'] },
  { id: 'plan-growth', name: 'Growth', priceAed: 249, maxCars: 8, maxPassengers: 150, features: ['payments', 'attendance', 'reminders', 'driverApp', 'passengerPortal'] },
  { id: 'plan-fleet', name: 'Fleet', priceAed: 599, maxCars: null, maxPassengers: null, features: ['payments', 'attendance', 'reminders', 'driverApp', 'passengerPortal', 'prioritySupport'] },
];

const OTHER_COMPANIES: { id: string; name: string; city: string; planId: string; status: Company['status']; cars: number; passengers: number }[] = [
  { id: 'co-skyline', name: 'Skyline Commute', city: 'Sharjah', planId: 'plan-fleet', status: 'active', cars: 2, passengers: 7 },
  { id: 'co-oasis', name: 'Oasis Commute', city: 'Abu Dhabi', planId: 'plan-starter', status: 'trial', cars: 1, passengers: 4 },
  { id: 'co-palm', name: 'Palm Shuttle', city: 'Ajman', planId: 'plan-starter', status: 'suspended', cars: 1, passengers: 5 },
];

const FIRST = ['Adel', 'Bushra', 'Chetan', 'Dina', 'Ehsan', 'Farah', 'Gaurav', 'Hala', 'Ishaan', 'Joud', 'Karim', 'Layla'];
const LAST = ['Rahman', 'Mathew', 'Qureshi', 'Saleh', 'Verma', 'Nasser', 'Iyer', 'Darwish'];
const AREAS = ['Al Majaz', 'Al Khan', 'Khalifa City', 'Reem Island', 'Al Nuaimiya', 'Rashidiya', 'Al Reef', 'Mussafah'];

export function buildSeed(today: string): Db {
  const rnd = mulberry32(20261013);
  const month = monthOf(today);
  const todayDay = Number(today.slice(8, 10));
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const method = (): PayMethod => {
    const r = rnd();
    return r < 0.5 ? 'cash' : r < 0.82 ? 'transfer' : 'wallet';
  };

  const companies: Company[] = [];
  const users: User[] = [];
  const cars: Car[] = [];
  const drivers: Driver[] = [];
  const passengers: Passenger[] = [];
  const payments: Payment[] = [];
  const trips: Trip[] = [];

  const addPayment = (p: Passenger, amount: number, date: string, forMonth: string, by: string, note?: string) => {
    if (amount <= 0) return;
    const safeDate = date > today ? today : date < p.joinDate ? p.joinDate : date;
    payments.push({
      id: `pay-${payments.length + 1}`, companyId: p.companyId, passengerId: p.id, amount, date: safeDate,
      method: method(), forMonth, loggedByUserId: by, createdAt: `${safeDate}T08:00:00.000Z`, ...(note ? { note } : {}),
    });
  };

  const addTrips = (p: Passenger, fromMonth: string, absentRate: number) => {
    for (let m = fromMonth; m <= month; m = addMonths(m, 1)) {
      for (let d = 1; d <= daysInMonth(m); d++) {
        const day = `${m}-${pad(d)}`;
        if (day > today) return;
        if (day < p.joinDate || !isWorkingDay(day)) continue;
        trips.push({
          id: `trip-${p.id}-${day}`, companyId: p.companyId, passengerId: p.id, date: day,
          status: rnd() < absentRate ? 'absent' : 'travelled',
        });
      }
    }
  };

  // ---- Main demo company -------------------------------------------------
  companies.push({
    id: DEMO_COMPANY_ID, slug: 'al-majra-transport', name: 'Al Majra Transport', tradeLicense: 'CN-1048821', city: 'Dubai', phone: '97143001000',
    planId: 'plan-growth', status: 'active', dueDay: 5, currency: 'AED', createdAt: `${addMonths(month, -14)}-01`,
  });

  const fleet = [
    { n: 1, model: 'Toyota Hiace', plate: 'B 12345', capacity: 14, photoKey: 'hiace', driver: 'Rashid Khan', email: 'rashid@almajra.ae' },
    { n: 2, model: 'Toyota Hiace', plate: 'D 67890', capacity: 14, photoKey: 'hiace', driver: 'Ahmed Noor', email: 'ahmed@almajra.ae' },
    { n: 3, model: 'Nissan Urvan', plate: 'A 44821', capacity: 15, photoKey: 'urvan', driver: 'Bilal Hassan', email: 'bilal@almajra.ae' },
  ];

  users.push(
    { id: 'u-mgr-majra', companyId: DEMO_COMPANY_ID, role: 'manager', name: 'Salim Al Majra', email: 'manager@almajra.ae', phone: '971501000001', password: DEMO_PASSWORD, locale: 'en' },
  );
  for (const f of fleet) {
    drivers.push({ id: `drv-majra-${f.n}`, companyId: DEMO_COMPANY_ID, name: f.driver, phone: `97150200000${f.n}`, licenseNo: `DXB-${40000 + f.n * 317}`, status: 'active' });
    cars.push({ id: `car-majra-${f.n}`, companyId: DEMO_COMPANY_ID, model: f.model, plate: f.plate, capacity: f.capacity, driverId: `drv-majra-${f.n}`, status: 'active', photoKey: f.photoKey });
    users.push({ id: `u-drv-majra-${f.n}`, companyId: DEMO_COMPANY_ID, role: 'driver', name: f.driver, email: f.email, phone: `97150200000${f.n}`, password: DEMO_PASSWORD, locale: 'en', linkedDriverId: `drv-majra-${f.n}` });
  }

  const seats = { 1: 0, 2: 0, 3: 0 };
  ROSTER.forEach((r, i) => {
    const joinDate = r.monthsAgo === 0
      ? `${month}-${pad(Math.max(1, todayDay - 3))}`
      : `${addMonths(month, -r.monthsAgo)}-${pad(1 + ((i * 7) % 27))}`;
    seats[r.car] += 1;
    passengers.push({
      id: `pax-majra-${i + 1}`, companyId: DEMO_COMPANY_ID, carId: `car-majra-${r.car}`, name: r.name,
      employerName: r.employer,
      phone: `9715${String(4410000 + i * 13711).padStart(8, '0')}`,
      pickupArea: r.pickup, dropArea: r.drop, route: `${r.pickup} → ${r.drop}`, seatNumber: seats[r.car],
      billingType: r.perTrip ? 'perTrip' : 'monthly', monthlyFee: r.perTrip ? 0 : r.fee, perTripFee: r.perTrip ? r.fee : 0,
      joinDate, status: r.inactive ? 'inactive' : 'active', createdAt: joinDate, updatedAt: joinDate,
    });
  });

  const passengerUsers: [number, string, 'en' | 'ar'][] = [[0, 'priya@example.com', 'en'], [2, 'ayesha@example.com', 'en'], [12, 'hessa@example.com', 'ar']];
  for (const [idx, email, locale] of passengerUsers) {
    const p = passengers[idx];
    users.push({ id: `u-passenger-majra-${idx + 1}`, companyId: DEMO_COMPANY_ID, role: 'passenger', name: p.name, email, phone: p.phone, password: DEMO_PASSWORD, locale, linkedPassengerId: p.id });
  }

  const firstMonth = addMonths(month, -5);
  const lastMonth = addMonths(month, -1);
  ROSTER.forEach((r, i) => {
    const p = passengers[i];
    if (r.inactive) {
      // Left the service: attendance stops before this month.
      addTrips({ ...p }, addMonths(month, -2), 0.1);
      for (let n = trips.length - 1; n >= 0; n--) if (trips[n].passengerId === p.id && monthOf(trips[n].date) === month) trips.splice(n, 1);
    } else {
      addTrips(p, r.perTrip ? firstMonth : lastMonth, r.perTrip ? 0.12 : 0.08);
    }
  });

  ROSTER.forEach((r, i) => {
    const p = passengers[i];
    const by = 'u-mgr-majra';
    for (let m = firstMonth; m < month; m = addMonths(m, 1)) {
      if (r.inactive && m === lastMonth) continue;
      const expected = expectedFor(p, m, trips);
      // Most months are paid in full; now and then a passenger settles only part, which gives the history some texture.
      const short = (r.habit === 'late' && m === lastMonth) || (!r.perTrip && rnd() < 0.14);
      const amount = short ? Math.round(expected / 100) * 50 : expected;
      addPayment(p, amount, `${m}-${pad(1 + Math.floor(rnd() * 6))}`, m, by);
    }
    if (r.inactive) return;
    const expected = expectedFor(p, month, trips);
    const date = `${month}-${pad(Math.min(todayDay, 1 + Math.floor(rnd() * 9)))}`;
    if (r.habit === 'full') addPayment(p, expected, date, month, by);
    if (r.habit === 'partial') {
      const half = r.perTrip ? Math.floor(expected / p.perTripFee / 2) * p.perTripFee : Math.round(expected / 100) * 50;
      addPayment(p, half, date, month, by, 'Part payment');
    }
    if (r.habit === 'advance') {
      addPayment(p, expected, date, month, by);
      addPayment(p, p.monthlyFee, date, addMonths(month, 1), by, 'Advance');
    }
  });

  // ---- Platform admin ----------------------------------------------------
  users.push({ id: 'u-admin', companyId: null, role: 'admin', name: 'LiftLedger Admin', email: 'admin@liftledger.app', phone: '971500000001', password: DEMO_PASSWORD, locale: 'en' });

  // ---- Other companies, for the platform admin view ----------------------
  OTHER_COMPANIES.forEach((c, ci) => {
    const short = c.id.slice(3);
    companies.push({
      id: c.id, slug: slugify(c.name), name: c.name, city: c.city, phone: `9716500${pad(ci + 1)}000`, planId: c.planId, status: c.status,
      dueDay: 5 + ci * 5, currency: 'AED', createdAt: `${addMonths(month, -(3 + ci * 2))}-10`,
    });
    users.push({ id: `u-mgr-${short}`, companyId: c.id, role: 'manager', name: `${pick(FIRST)} ${pick(LAST)}`, email: `manager@${short}.example`, phone: `97150300000${ci + 1}`, password: DEMO_PASSWORD, locale: 'en' });
    for (let n = 1; n <= c.cars; n++) {
      drivers.push({ id: `drv-${short}-${n}`, companyId: c.id, name: `${pick(FIRST)} ${pick(LAST)}`, phone: `9715040${ci}00${n}0`, status: 'active' });
      cars.push({ id: `car-${short}-${n}`, companyId: c.id, model: n % 2 ? 'Toyota Hiace' : 'Nissan Urvan', plate: `${'STU'[ci]} ${20000 + ci * 4111 + n * 97}`, capacity: 14, driverId: `drv-${short}-${n}`, status: 'active', photoKey: n % 2 ? 'hiace' : 'urvan' });
    }
    for (let n = 1; n <= c.passengers; n++) {
      const pickup = pick(AREAS);
      const drop = pick(AREAS.filter((a) => a !== pickup));
      const joinDate = `${addMonths(month, -(1 + (n % 3)))}-${pad(1 + ((n * 5) % 27))}`;
      const p: Passenger = {
        id: `pax-${short}-${n}`, companyId: c.id, carId: `car-${short}-${1 + (n % c.cars)}`, name: `${pick(FIRST)} ${pick(LAST)}`,
        employerName: pick(EMPLOYERS),
        phone: `9715${String(5500000 + ci * 100000 + n * 811).padStart(8, '0')}`, pickupArea: pickup, dropArea: drop,
        route: `${pickup} → ${drop}`, seatNumber: n, billingType: 'monthly', monthlyFee: 300 + n * 20, perTripFee: 0,
        joinDate, status: 'active', createdAt: joinDate, updatedAt: joinDate,
      };
      passengers.push(p);
      addPayment(p, expectedFor(p, lastMonth, []), `${lastMonth}-04`, lastMonth, `u-mgr-${short}`);
      if (rnd() < 0.6) addPayment(p, p.monthlyFee, `${month}-${pad(Math.min(todayDay, 3))}`, month, `u-mgr-${short}`);
    }
  });

  return { version: DB_VERSION, seedMonth: month, plans: PLANS, companies, users, cars, drivers, passengers, payments, trips };
}
