# LiftLedger Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the LiftLedger Next.js app with its design system, motion and illustration kits, billing engine, mock data layer, mock auth, i18n/RTL, and the manager app shell rendering a live dashboard from mock data.

**Architecture:** One Next.js App Router app in `liftledger/`. Pure domain code lives in `src/core` (billing, repo, auth) and has no React imports. Screens read data only through TanStack Query hooks over a `Repository` interface, implemented here by `MockRepository`. Visual tokens are CSS variables consumed by Tailwind.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui, lucide-react, motion (Framer Motion) 14, Recharts 3, next-intl 4, next-themes, TanStack Query 5, React Hook Form 7, Zod 4, Vitest 5, Playwright 1.64. (GSAP, Lenis and React Three Fiber are installed in the Front Door plan, not here.)

**Spec:** `docs/superpowers/specs/2026-10-13-liftledger-ui-design.md`

## Global Constraints

- App root is `liftledger/` (the repo folder name contains a space and cannot be an npm package name). All paths below are relative to `liftledger/` unless they start with `docs/`.
- Dates are ISO strings: days `YYYY-MM-DD`, months `YYYY-MM`. Never construct local-time `Date` objects for billing; use `Date.UTC`.
- All money is whole AED (integers).
- No paid/unpaid flag is stored. Status is always computed by `src/core/billing`.
- `src/core/**` must not import React, Next, or anything from `src/components` or `src/app`.
- Components never import `MockRepository` directly; they use hooks from `src/core/repo/hooks.ts`.
- No hard-coded user-facing strings in components; all text comes from `messages/en.json` and `messages/ar.json`.
- Layout uses logical Tailwind utilities only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`). No `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`.
- Colours come only from the tokens in spec section 3. No raw hex in components.
- Every animation respects `prefers-reduced-motion` through the helpers in `src/components/motion`.
- Portal routes must not import `three`, `gsap` or `lenis`.
- Installed major versions are newer than most online examples. Before using a framework API, check the installed package's own docs or types (for example, Next 16 names the request interceptor file `proxy.ts`; confirm in `node_modules/next` before creating it).
- Commit after every task with the co-author trailer used in this repo.

## Review Focus

1. A passenger whose join date is the last day of a month, or 29 Feb: pro-rating must return a positive whole amount and never divide by a wrong month length. (Task 2)
2. A per-trip passenger with zero travelled trips: expected is 0 and they must show as "nothing due", not pending or overdue. (Task 2)
3. A company `dueDay` of 31 in a 30-day month or February: the due date clamps to the month's last day instead of producing an invalid date. (Task 2)
4. Corrupt or old-version data in `localStorage`: the mock repository must fall back to a fresh seed instead of crashing the app. (Task 3)
5. A driver or rider session requesting another company's or another car's passenger by id: the repository must reject it, not return it. (Task 3)

---

## File Structure

```
liftledger/
  src/
    app/
      [locale]/
        layout.tsx                 html/body, fonts, dir, providers
        page.tsx                   temporary index: links to kit and demo logins
        (manager)/app/layout.tsx   manager shell
        (manager)/app/page.tsx     dashboard built from repo data
        dev/kit/page.tsx           component and motion showcase
      globals.css                  tokens, Tailwind theme mapping
    components/
      ui/                          button, card, badge, input, dialog, sheet, segmented, table,
                                   skeleton, avatar, dropdown-menu, toaster, status-badge, month-picker
      shell/                       top-bar, icon-rail, bottom-tabs, page-header, locale-toggle, theme-toggle
      motion/                      tokens.ts, reveal.tsx, stagger.tsx, count-up.tsx, page-transition.tsx
      charts/                      trend-bars.tsx, area-line.tsx, split-bars.tsx
      illustrations/               van.tsx, route.tsx, wallet.tsx, calendar.tsx, chat.tsx, receipt.tsx,
                                   shield.tsx, empty-road.tsx, index.ts
      providers.tsx                theme + query + repo providers
    core/
      billing/                     month.ts, engine.ts, summary.ts, index.ts, *.test.ts
      repo/                        types.ts, seed.ts, mock.ts, scope.ts, hooks.ts, *.test.ts
      auth/                        session.ts, guards.ts, *.test.ts
      format.ts                    money, phone, date formatting
    i18n/                          routing.ts, request.ts, navigation.ts
    content/images.ts              Unsplash manifest
    proxy.ts                       locale routing + role guards
  messages/en.json, messages/ar.json
  e2e/foundation.spec.ts
  vitest.config.ts, playwright.config.ts
```

---

### Task 1: Scaffold, tokens, fonts, test tooling

**Files:**
- Create: `liftledger/` via create-next-app; `vitest.config.ts`; `src/app/globals.css`
- Modify: `package.json` scripts

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `lint`, `test` (vitest run), `e2e` (playwright); Tailwind colour utilities `bg-canvas`, `bg-card`, `bg-soft`, `text-ink`, `text-ink-muted`, `border-line`, `bg-brand`, `bg-brand-deep`, `bg-brand-tint`, and status pairs `bg-paid-bg text-paid`, `bg-partial-bg text-partial`, `bg-overdue-bg text-overdue`, `bg-pending-bg text-pending`; radius utilities `rounded-card` (28px) and `rounded-inner` (16px).

- [ ] **Step 1: Scaffold**

```bash
npx create-next-app@16 liftledger --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes
cd liftledger
npm i motion recharts next-intl next-themes @tanstack/react-query react-hook-form zod @hookform/resolvers lucide-react clsx tailwind-merge class-variance-authority sonner
npm i -D vitest @vitest/coverage-v8 @playwright/test
```

- [ ] **Step 2: Vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"e2e": "playwright test"`.

- [ ] **Step 3: Tokens in `src/app/globals.css`**

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --canvas: #F1F2F4; --card: #FFFFFF; --soft: #F6F7F8;
  --ink: #0E1512; --ink-muted: #8A9390; --line: #E8EAEC;
  --brand: #0F8A5F; --brand-deep: #0B6B49; --brand-tint: #DDF3E9; --on-brand: #FFFFFF;
  --paid: #0F8A5F; --paid-bg: #DDF3E9;
  --partial: #9A6500; --partial-bg: #FBF0D8;
  --overdue: #B3261E; --overdue-bg: #FCE7E7;
  --pending: #5B6675; --pending-bg: #EDF1F6;
  --shadow-card: 0 1px 2px rgb(14 21 18 / 0.04), 0 8px 24px rgb(14 21 18 / 0.04);
}
.dark {
  --canvas: #0B1210; --card: #121A17; --soft: #18221E;
  --ink: #ECF2EF; --ink-muted: #7E8C86; --line: #1F2B26;
  --brand: #3DDC97; --brand-deep: #2BB57A; --brand-tint: #123A2B; --on-brand: #05221D;
  --paid: #3DDC97; --paid-bg: #123A2B;
  --partial: #FBBF4D; --partial-bg: #322710;
  --overdue: #F2756F; --overdue-bg: #361C1C;
  --pending: #A3AEBD; --pending-bg: #1E252E;
  --shadow-card: 0 0 0 1px var(--line);
}

@theme inline {
  --color-canvas: var(--canvas); --color-card: var(--card); --color-soft: var(--soft);
  --color-ink: var(--ink); --color-ink-muted: var(--ink-muted); --color-line: var(--line);
  --color-brand: var(--brand); --color-brand-deep: var(--brand-deep);
  --color-brand-tint: var(--brand-tint); --color-on-brand: var(--on-brand);
  --color-paid: var(--paid); --color-paid-bg: var(--paid-bg);
  --color-partial: var(--partial); --color-partial-bg: var(--partial-bg);
  --color-overdue: var(--overdue); --color-overdue-bg: var(--overdue-bg);
  --color-pending: var(--pending); --color-pending-bg: var(--pending-bg);
  --radius-card: 28px; --radius-inner: 16px;
  --shadow-card: var(--shadow-card);
  --font-sans: var(--font-urbanist), var(--font-readex), system-ui, sans-serif;
}

html[lang="ar"] { --font-sans: var(--font-readex), var(--font-urbanist), system-ui, sans-serif; }
body { background: var(--canvas); color: var(--ink); font-family: var(--font-sans); }
.tabular { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 4: Verify** — `npm run build` succeeds; `npm test` reports "no test files" without error.
- [ ] **Step 5: Commit** — `chore: scaffold liftledger app with design tokens`

---

### Task 2: Billing engine

**Files:**
- Create: `src/core/billing/month.ts`, `engine.ts`, `summary.ts`, `index.ts`
- Test: `src/core/billing/month.test.ts`, `engine.test.ts`, `summary.test.ts`
- Create (types used here): `src/core/repo/types.ts` (domain types only in this task)

**Interfaces:**
- Produces:

```ts
// month.ts
monthOf(day: string): string                       // '2026-10-13' -> '2026-10'
daysInMonth(month: string): number
addMonths(month: string, n: number): string
lastDay(month: string): string                     // '2026-10' -> '2026-10-31'
dueDate(month: string, dueDay: number): string     // clamped to month length

// engine.ts
type PayStatus = 'paid' | 'partial' | 'pending' | 'overdue';
interface Ledger { expected: number; paid: number; balance: number; status: PayStatus; nothingDue: boolean }
proRate(monthlyFee: number, joinDate: string): number
expectedFor(p: Passenger, month: string, trips: Trip[]): number
paidFor(passengerId: string, month: string, payments: Payment[]): number
statusFor(p: Passenger, month: string, payments: Payment[], trips: Trip[], today: string, dueDay: number): Ledger

// summary.ts
interface CompanySummary {
  collected: number; expected: number; outstanding: number; overdueCount: number; collectionRate: number;
  byCar: { carId: string; riders: number; expected: number; collected: number }[];
  byMethod: { method: PayMethod; amount: number }[];
  trend: { month: string; expected: number; collected: number }[];   // 6 months, oldest first
}
companySummary(input: { month: string; passengers: Passenger[]; payments: Payment[]; trips: Trip[];
                        today: string; dueDay: number }): CompanySummary
```

- [ ] **Step 1: Domain types** — write `src/core/repo/types.ts` with `Plan`, `Company`, `User`, `Car`, `Driver`, `Passenger`, `Payment`, `Trip`, `Role`, `PayMethod`, `BillingType` exactly as in spec section 7.

- [ ] **Step 2: Failing tests** (`engine.test.ts`; `month.test.ts` and `summary.test.ts` follow the same fixture style)

```ts
import { describe, expect, it } from 'vitest';
import { expectedFor, paidFor, proRate, statusFor } from './engine';
import { dueDate } from './month';
import type { Passenger, Payment, Trip } from '../repo/types';

const pax = (o: Partial<Passenger> = {}): Passenger => ({
  id: 'p1', companyId: 'c1', carId: 'car1', name: 'A', phone: '971500000000',
  pickupArea: 'X', dropArea: 'Y', route: 'X → Y', seatNumber: 1,
  billingType: 'monthly', monthlyFee: 350, perTripFee: 0, joinDate: '2026-01-01',
  status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01', ...o,
});
const pay = (amount: number, forMonth: string, o: Partial<Payment> = {}): Payment => ({
  id: `pay-${amount}-${forMonth}`, companyId: 'c1', passengerId: 'p1', amount, date: `${forMonth}-03`,
  method: 'cash', forMonth, loggedByUserId: 'u1', createdAt: `${forMonth}-03`, ...o,
});
const trip = (date: string, status: Trip['status'] = 'travelled'): Trip =>
  ({ id: `t-${date}`, companyId: 'c1', passengerId: 'p1', date, status });

describe('proRate', () => {
  it('joining on the 20th of a 31-day month charges 12/31', () => expect(proRate(350, '2026-10-20')).toBe(135));
  it('joining on the 1st charges the full fee', () => expect(proRate(350, '2026-10-01')).toBe(350));
  it('joining on the last day charges one day', () => expect(proRate(310, '2026-10-31')).toBe(10));
  it('handles 29 Feb in a leap year', () => expect(proRate(290, '2028-02-29')).toBe(10));
});

describe('expectedFor', () => {
  it('is the monthly fee in a normal month', () => expect(expectedFor(pax(), '2026-10', [])).toBe(350));
  it('is pro-rated in the join month', () =>
    expect(expectedFor(pax({ joinDate: '2026-10-20' }), '2026-10', [])).toBe(135));
  it('is zero before the join month', () =>
    expect(expectedFor(pax({ joinDate: '2026-10-20' }), '2026-09', [])).toBe(0));
  it('counts only travelled trips in the month for per-trip riders', () => {
    const p = pax({ billingType: 'perTrip', perTripFee: 25, monthlyFee: 0 });
    const trips = [trip('2026-10-01'), trip('2026-10-02'), trip('2026-10-03', 'absent'), trip('2026-09-30')];
    expect(expectedFor(p, '2026-10', trips)).toBe(50);
  });
});

describe('paidFor', () => {
  it('sums only payments for that month and passenger', () => {
    const payments = [pay(100, '2026-10'), pay(50, '2026-10', { id: 'b' }), pay(350, '2026-11'),
      pay(999, '2026-10', { id: 'c', passengerId: 'other' })];
    expect(paidFor('p1', '2026-10', payments)).toBe(150);
  });
});

describe('statusFor', () => {
  const s = (payments: Payment[], today: string, p = pax(), trips: Trip[] = []) =>
    statusFor(p, '2026-10', payments, trips, today, 5);

  it('paid when fully covered', () => expect(s([pay(350, '2026-10')], '2026-10-13').status).toBe('paid'));
  it('pending before the due day with nothing paid', () => expect(s([], '2026-10-05').status).toBe('pending'));
  it('partial before the due day with some paid', () =>
    expect(s([pay(200, '2026-10')], '2026-10-04').status).toBe('partial'));
  it('overdue after the due day', () => {
    expect(s([], '2026-10-06').status).toBe('overdue');
    expect(s([pay(200, '2026-10')], '2026-10-06').status).toBe('overdue');
  });
  it('reports the balance', () => expect(s([pay(200, '2026-10')], '2026-10-04').balance).toBe(150));
  it('overpayment is paid with a negative balance', () => {
    const l = s([pay(400, '2026-10')], '2026-10-13');
    expect(l.status).toBe('paid'); expect(l.balance).toBe(-50);
  });
  it('advance for a future month does not count now', () =>
    expect(s([pay(350, '2026-11')], '2026-10-13').status).toBe('overdue'));
  it('per-trip rider with zero trips has nothing due', () => {
    const l = s([], '2026-10-20', pax({ billingType: 'perTrip', perTripFee: 25 }));
    expect(l.status).toBe('paid'); expect(l.nothingDue).toBe(true);
  });
  it('per-trip rider is not overdue until the month has ended', () => {
    const p = pax({ billingType: 'perTrip', perTripFee: 25 });
    expect(s([], '2026-10-20', p, [trip('2026-10-01')]).status).toBe('pending');
    expect(statusFor(p, '2026-10', [], [trip('2026-10-01')], '2026-11-01', 5).status).toBe('overdue');
  });
});

describe('dueDate', () => {
  it('clamps to the month length', () => {
    expect(dueDate('2026-02', 31)).toBe('2026-02-28');
    expect(dueDate('2026-04', 31)).toBe('2026-04-30');
    expect(dueDate('2026-10', 5)).toBe('2026-10-05');
  });
});
```

`summary.test.ts` must assert: collected + outstanding equals expected when nobody overpaid; inactive passengers are excluded; `byCar` totals sum to the company totals; `byMethod` sums to `collected`; `trend` has 6 entries ending at the requested month; `collectionRate` is 0 when expected is 0 and is capped at 100.

- [ ] **Step 3: Run** — `npm test`; expect failures for missing modules.

- [ ] **Step 4: Implement**

```ts
// month.ts
const pad = (n: number) => String(n).padStart(2, '0');
export const monthOf = (day: string) => day.slice(0, 7);
export const daysInMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
export const addMonths = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};
export const lastDay = (month: string) => `${month}-${pad(daysInMonth(month))}`;
export const dueDate = (month: string, dueDay: number) =>
  `${month}-${pad(Math.min(Math.max(dueDay, 1), daysInMonth(month)))}`;
```

```ts
// engine.ts
import type { Passenger, Payment, Trip } from '../repo/types';
import { daysInMonth, dueDate, lastDay, monthOf } from './month';

export type PayStatus = 'paid' | 'partial' | 'pending' | 'overdue';
export interface Ledger { expected: number; paid: number; balance: number; status: PayStatus; nothingDue: boolean }

export function proRate(monthlyFee: number, joinDate: string): number {
  const dim = daysInMonth(monthOf(joinDate));
  const remaining = dim - Number(joinDate.slice(8, 10)) + 1;
  return Math.round((monthlyFee * remaining) / dim);
}

export function expectedFor(p: Passenger, month: string, trips: Trip[]): number {
  const joinMonth = monthOf(p.joinDate);
  if (month < joinMonth) return 0;
  if (p.billingType === 'perTrip') {
    const n = trips.filter(
      (t) => t.passengerId === p.id && t.status === 'travelled' && monthOf(t.date) === month && t.date >= p.joinDate,
    ).length;
    return n * p.perTripFee;
  }
  return month === joinMonth ? proRate(p.monthlyFee, p.joinDate) : p.monthlyFee;
}

export function paidFor(passengerId: string, month: string, payments: Payment[]): number {
  return payments.reduce((s, x) => (x.passengerId === passengerId && x.forMonth === month ? s + x.amount : s), 0);
}

export function statusFor(
  p: Passenger, month: string, payments: Payment[], trips: Trip[], today: string, dueDay: number,
): Ledger {
  const expected = expectedFor(p, month, trips);
  const paid = paidFor(p.id, month, payments);
  const balance = expected - paid;
  if (expected === 0) return { expected, paid, balance, status: 'paid', nothingDue: true };
  if (balance <= 0) return { expected, paid, balance, status: 'paid', nothingDue: false };
  const due = p.billingType === 'perTrip' ? lastDay(month) : dueDate(month, dueDay);
  const status: PayStatus = today > due ? 'overdue' : paid === 0 ? 'pending' : 'partial';
  return { expected, paid, balance, status, nothingDue: false };
}
```

`summary.ts`: filter to `status === 'active'` passengers; build a `Ledger` per passenger with `statusFor`; `collected` = sum of `paid`; `expected` = sum of `expected`; `outstanding` = sum of `Math.max(balance, 0)`; `overdueCount` = ledgers with status `overdue`; `collectionRate` = `expected === 0 ? 0 : Math.min(100, Math.round(collected / expected * 100))`; `byCar` groups those ledgers by `carId`; `byMethod` groups payments with `forMonth === month` from active passengers by method, always returning all three methods; `trend` maps `addMonths(month, -5..0)` to `{ month, expected, collected }` using the same per-passenger functions. `index.ts` re-exports all three files.

- [ ] **Step 5: Run** — `npm test`; all pass.
- [ ] **Step 6: Commit** — `feat: add billing engine with pro-rating and computed status`

---

### Task 3: Repository, seed data, scoping

**Files:**
- Create: `src/core/repo/scope.ts`, `seed.ts`, `mock.ts`, `hooks.ts`, `src/core/auth/session.ts`
- Modify: `src/core/repo/types.ts` (add `Session`, `Repository`, row types)
- Test: `src/core/repo/scope.test.ts`, `mock.test.ts`, `seed.test.ts`

**Interfaces:**
- Consumes: everything from Task 2.
- Produces:

```ts
interface Session { userId: string; role: Role; companyId: string | null; name: string; locale: 'en' | 'ar' }
interface StatusRow { passenger: Passenger; car: Car | null; driver: Driver | null; ledger: Ledger }
interface DashboardData { summary: CompanySummary; rows: StatusRow[]; recentPayments: (Payment & { passengerName: string })[];
                          cars: (Car & { driver: Driver | null; riders: number })[] }

interface Repository {
  login(identifier: string, password: string): Promise<Session>;          // rejects with Error('invalid-credentials')
  demoUsers(): Promise<Pick<User, 'id' | 'name' | 'role' | 'email'>[]>;
  company(s: Session): Promise<Company>;
  cars(s: Session): Promise<Car[]>;
  drivers(s: Session): Promise<Driver[]>;
  passengers(s: Session): Promise<Passenger[]>;
  passenger(s: Session, id: string): Promise<Passenger>;                  // rejects with Error('not-found') when out of scope
  savePassenger(s: Session, input: PassengerInput, id?: string): Promise<Passenger>;
  deactivatePassenger(s: Session, id: string): Promise<Passenger>;
  payments(s: Session, month?: string): Promise<Payment[]>;
  logPayment(s: Session, input: PaymentInput): Promise<Payment>;
  deletePayment(s: Session, id: string): Promise<void>;
  trips(s: Session, date: string): Promise<Trip[]>;
  markTrips(s: Session, date: string, marks: { passengerId: string; status: Trip['status'] }[]): Promise<Trip[]>;
  statusBoard(s: Session, month: string): Promise<StatusRow[]>;
  dashboard(s: Session, month: string): Promise<DashboardData>;
  reset(): Promise<void>;
}

// scope.ts — pure functions, no storage
visiblePassengers(s: Session, db: Db): Passenger[]
canWrite(s: Session, action: 'passenger' | 'payment' | 'trip' | 'fleet', target: { companyId: string; carId?: string }, db: Db): boolean

// seed.ts
buildSeed(today: string): Db            // deterministic for a given `today`
interface Db { version: number; plans; companies; users; cars; drivers; passengers; payments; trips }

// mock.ts
createMockRepository(opts?: { storage?: Storage | null; today?: () => string; latency?: [number, number] }): Repository

// hooks.ts ('use client')
useSession(): Session | null
useDashboard(month: string), useStatusBoard(month: string), usePassengers(), useCars(), useLogPayment(), useMarkTrips()
```

- [ ] **Step 1: Failing tests**
  - `seed.test.ts`: the demo company has 3 cars, 3 drivers, at least 20 passengers; every `PayStatus` value appears on the current month's status board; at least one per-trip rider, one join-month rider, one advance payment, one inactive rider; `buildSeed` called twice with the same date returns deep-equal data; payments and trips span 6 months ending at `today`'s month.
  - `scope.test.ts`: a manager sees all passengers of their company and none of another; a driver sees only passengers whose car has `driverId === user.linkedDriverId`; a rider sees only `linkedPassengerId`; admin sees all; `canWrite` is false for riders on every action and false for drivers on `fleet` and on passengers of other cars.
  - `mock.test.ts` (use `latency: [0, 0]` and an in-memory `Storage` stub): `login` with a seeded manager returns a session, wrong password rejects with `invalid-credentials`; `logPayment` then `statusBoard` shows the passenger's status change from `overdue` to `paid`; `passenger(session, idFromOtherCompany)` rejects with `not-found`; a driver calling `passenger` for a rider on another car rejects with `not-found`; `markTrips` twice on the same day leaves one trip per passenger; `deletePayment` restores the previous balance; storage containing `"not json"` or a different `version` produces a fresh seed without throwing; `reset()` discards changes.

- [ ] **Step 2: Run** — expect failures.

- [ ] **Step 3: Implement**
  - `seed.ts`: a small seeded pseudo-random generator (mulberry32 with a fixed seed) so output is deterministic. Four companies (`Al Majra Transport` as the main demo, plus three smaller ones on different plans and statuses). Three plans: Starter (2 cars, 30 riders, AED 99), Growth (8 cars, 150 riders, AED 249), Fleet (unlimited, AED 599). Users: one admin, one manager per company, one user per driver, and three rider users in the main company. All mock passwords are `demo1234`. Main company passengers are hand-authored so each case exists: full payers, partial, unpaid, an advance payer (payment with next month's `forMonth`), a rider whose `joinDate` is the 20th of the current month (or the 1st if today is before the 20th, so the row is never in the future), two per-trip riders with trips on working days (Monday to Friday) up to `today`, one inactive rider. Payments for the previous five months are complete for most riders so the trend chart has shape.
  - `scope.ts`: pure filters as specified.
  - `mock.ts`: load `Db` from `storage` key `liftledger.db.v1` inside try/catch, validating `version === 1`; otherwise `buildSeed(today())`. Every method awaits a random delay within `latency`, applies `scope.ts`, mutates the in-memory `Db`, and writes it back. Ids come from `crypto.randomUUID()`. `logPayment` validates amount is a positive integer and `forMonth` matches `/^\d{4}-\d{2}$/`, throwing `Error('invalid-input')` otherwise. `statusBoard` and `dashboard` call the billing engine; nothing recomputes billing rules here.
  - `session.ts`: `encodeSession`/`decodeSession` (base64url JSON, returns `null` on any malformed input), cookie name `ll_session`.
  - `hooks.ts`: a `RepoContext` plus TanStack Query hooks keyed by `[name, session.userId, args]`; mutations invalidate `dashboard`, `statusBoard`, `payments`, `trips`.

- [ ] **Step 4: Run** — `npm test`; all pass.
- [ ] **Step 5: Commit** — `feat: add mock repository with seeded demo data and role scoping`

---

### Task 4: i18n, RTL, themes, providers, route guards

**Files:**
- Create: `src/i18n/routing.ts`, `request.ts`, `navigation.ts`; `messages/en.json`, `messages/ar.json`; `src/components/providers.tsx`; `src/core/auth/guards.ts`; `src/proxy.ts`; `src/app/[locale]/layout.tsx`; `src/core/format.ts`
- Delete: `src/app/layout.tsx`, `src/app/page.tsx` (replaced by the locale versions)
- Test: `src/core/auth/guards.test.ts`, `src/core/format.test.ts`, `src/i18n/messages.test.ts`

**Interfaces:**
- Produces:

```ts
// guards.ts
homeFor(role: Role): '/admin' | '/app' | '/driver' | '/rider'
requiredRole(pathnameWithoutLocale: string): Role | null       // '/app/payments' -> 'manager', '/' -> null
decide(pathnameWithoutLocale: string, session: Session | null): { allow: true } | { redirect: string }

// format.ts
formatMoney(amount: number, locale: 'en' | 'ar'): string       // 'AED 1,430' | '1,430 د.إ'
formatPhone(phone: string): string                             // '971504412011' -> '+971 50 441 2011'
formatMonth(month: string, locale: 'en' | 'ar'): string        // 'October 2026' | 'أكتوبر 2026'
formatDay(day: string, locale: 'en' | 'ar'): string
waLink(phone: string, message: string): string
```

- [ ] **Step 1: Failing tests**
  - `guards.test.ts`: no session on `/app` redirects to `/login`; a driver on `/app` redirects to `/driver`; a manager on `/app/payments` is allowed; `/`, `/login`, `/dev/kit` are allowed without a session; a manager on `/admin` redirects to `/app`.
  - `format.test.ts`: the examples in the interface block above; `formatMoney` uses Western digits in Arabic; negative amounts keep the minus sign; `waLink('971504412011', 'Hi & bye')` equals `https://wa.me/971504412011?text=Hi%20%26%20bye`.
  - `messages.test.ts`: `en.json` and `ar.json` have exactly the same set of nested keys, and no value is an empty string.

- [ ] **Step 2: Run** — expect failures.

- [ ] **Step 3: Implement**
  - next-intl with locales `['en', 'ar']`, default `en`, prefix always. Follow the installed next-intl version's App Router setup for file names.
  - `proxy.ts`: run the next-intl handler, then strip the locale, decode the `ll_session` cookie, call `decide`, and redirect when needed.
  - `[locale]/layout.tsx`: `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>`, Urbanist and Readex Pro from `next/font/google` exposed as `--font-urbanist` and `--font-readex`, wrapped in `Providers`.
  - `providers.tsx` (client): `ThemeProvider` from next-themes (`attribute="class"`, system default), `QueryClientProvider`, `RepoContext` with a single `createMockRepository({ storage: window.localStorage })` instance, and the `sonner` toaster.
  - Message namespaces created now: `common`, `nav`, `status`, `dashboard`, `kit`. Arabic is written properly, not transliterated.
  - `format.ts` uses `Intl.NumberFormat(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE')` and `Intl.DateTimeFormat` with `timeZone: 'UTC'`.

- [ ] **Step 4: Run** — `npm test` passes; `npm run build` succeeds; visiting `/` redirects to `/en`.
- [ ] **Step 5: Commit** — `feat: add i18n, RTL, themes and role-based route guards`

---

### Task 5: UI primitives

**Files:**
- Create: everything under `src/components/ui/` listed in File Structure; `src/lib/cn.ts`

**Interfaces:**
- Produces:

```ts
Button    { variant?: 'primary' | 'soft' | 'ghost' | 'outline' | 'danger' | 'whatsapp'; size?: 'sm' | 'md' | 'lg' | 'icon'; loading?: boolean }
Card      { as?: ElementType; tone?: 'default' | 'brand' | 'soft'; padded?: boolean }   + CardHeader { title, subtitle?, action? }
Badge     { tone: 'paid' | 'partial' | 'overdue' | 'pending' | 'info' | 'neutral'; dot?: boolean }
StatusBadge { status: PayStatus; nothingDue?: boolean }       // label from messages `status.*`, animates on change
Segmented<T extends string> { value: T; onChange(v: T): void; options: { value: T; label: string }[]; layoutId: string }
MonthPicker { value: string; onChange(month: string): void; min?: string; max?: string }
Input, Label, Field { label; error?; hint? }, Select
Dialog, Sheet (bottom on mobile, side on desktop), DropdownMenu, Avatar { name; src? }, AvatarStack { names: string[]; max?: number }
DataTable<T> { columns: { key; header; cell(row: T): ReactNode; align?: 'start' | 'end' }[]; rows: T[]; rowKey(row: T): string; empty: ReactNode }
Skeleton { className }
```

- [ ] **Step 1:** Run `npx shadcn@latest init` (neutral base, CSS variables), then add `dialog sheet dropdown-menu select label input avatar`. Restyle every generated file to the tokens: remove shadcn's own colour variables and use the utilities from Task 1.
- [ ] **Step 2:** Write the custom components. Rules: buttons and chips are fully rounded with a minimum height of 44px on touch sizes; cards use `rounded-card bg-card shadow-card`; the `brand` card tone is `bg-brand text-on-brand`; `Segmented` uses a `motion.span` with the given `layoutId` for the sliding thumb; `StatusBadge` wraps its content in `AnimatePresence mode="popLayout"` keyed by status; `DataTable` renders a stacked card list below the `md` breakpoint; focus rings are `outline-2 outline-offset-2 outline-brand`.
- [ ] **Step 3: Verify** — `npm run lint` and `npm run build` succeed. Visual checks happen on the kit page in Task 9.
- [ ] **Step 4: Commit** — `feat: add UI primitives styled to the LiftLedger tokens`

---

### Task 6: Motion primitives

**Files:**
- Create: `src/components/motion/tokens.ts`, `reveal.tsx`, `stagger.tsx`, `count-up.tsx`, `page-transition.tsx`, `index.ts`
- Test: `src/components/motion/tokens.test.ts`

**Interfaces:**
- Produces:

```ts
// tokens.ts
duration = { fast: 0.12, base: 0.2, slow: 0.32, slower: 0.48 }
ease = { out: [0.16, 1, 0.3, 1], inOut: [0.65, 0, 0.35, 1] }
spring = { sheet: { type: 'spring', stiffness: 380, damping: 34 }, pop: { type: 'spring', stiffness: 520, damping: 28 } }
riseIn(reduced: boolean, delay?: number): { initial; animate; transition }   // fade only when reduced

Reveal { delay?: number; as?: ElementType }            // rise + fade on mount
Stagger { gap?: number } + StaggerItem                 // children enter in sequence
CountUp { value: number; format?(n: number): string; duration?: number }   // renders final value immediately when reduced
PageTransition                                         // wraps route content, keyed by pathname
```

- [ ] **Step 1: Failing test** — `riseIn(true)` has no `y` offset in `initial` and a duration of at most `duration.fast`; `riseIn(false, 0.1)` has `initial.y > 0` and `transition.delay === 0.1`.
- [ ] **Step 2: Run** — fails.
- [ ] **Step 3: Implement** using `motion/react` and its `useReducedMotion`. `CountUp` animates a motion value with `animate()` and writes text through a ref so it does not re-render per frame.
- [ ] **Step 4: Run** — passes.
- [ ] **Step 5: Commit** — `feat: add motion primitives with reduced-motion support`

---

### Task 7: Charts

**Files:**
- Create: `src/components/charts/trend-bars.tsx`, `area-line.tsx`, `split-bars.tsx`, `index.ts`

**Interfaces:**
- Produces:

```ts
TrendBars { data: { label: string; value: number; target?: number }[]; activeIndex?: number; format(n: number): string; summary: string }
AreaLine  { data: number[]; height?: number; summary: string }
SplitBars { items: { label: string; value: number; tone: 'brand' | 'info' | 'violet' }[]; format(n: number): string }
```

- [ ] **Step 1:** `TrendBars` with Recharts `BarChart`: a custom bar `shape` drawing a fully rounded pill; inactive bars filled with an SVG diagonal-hatch `<pattern>` in `brand` at reduced opacity, the active bar solid `brand-deep`; a floating bubble above the active bar showing its percentage of target; dashed horizontal grid; axis text in `ink-muted`; bars animate from the baseline (animation disabled when reduced motion is set). `summary` is rendered in a visually hidden paragraph for screen readers. In RTL the x-axis is reversed.
- [ ] **Step 2:** `AreaLine`: a smooth line with a vertical gradient fill from `brand` at 25% to transparent, no axes. `SplitBars`: labelled horizontal bars whose width animates from zero.
- [ ] **Step 3: Verify** — `npm run build` succeeds; charts are checked on the kit page in Task 9.
- [ ] **Step 4: Commit** — `feat: add chart components`

---

### Task 8: Illustrations and image manifest

**Files:**
- Create: the eight files under `src/components/illustrations/` plus `index.ts`; `src/content/images.ts`
- Modify: `next.config.ts` (allow `images.unsplash.com`)
- Test: `src/content/images.test.ts`

**Interfaces:**
- Produces:

```ts
// each illustration
Illustration { className?: string; animated?: boolean; title: string }   // inline SVG, colours from currentColor and CSS variables
// images.ts
interface ImageEntry { id: string; alt: { en: string; ar: string }; credit: string; width: number; height: number }
images: Record<'heroCity' | 'vanRoad' | 'commuters' | 'driverPortrait' | 'phonePay' | 'skylineDusk' | 'hiace' | 'urvan' | 'emptyRoad', ImageEntry>
unsplashUrl(key: keyof typeof images, width: number): string
```

- [ ] **Step 1: Failing test** — every entry has a non-empty `id`, both alt texts, a credit, positive dimensions; `unsplashUrl('heroCity', 1200)` starts with `https://images.unsplash.com/` and contains `w=1200` and `auto=format`.
- [ ] **Step 2:** Draw the SVGs on a 240×180 viewBox in a consistent style: 2px rounded strokes in `var(--ink)`, fills in `var(--brand)`, `var(--brand-tint)` and `var(--soft)`. Animations are CSS keyframes scoped per file (van bobbing with spinning wheels, route dash offset travelling between pins, coin dropping into wallet, calendar tick, chat bubble typing dots, receipt unrolling, shield pulse, road lines scrolling) and are wrapped in `@media (prefers-reduced-motion: no-preference)`.
- [ ] **Step 3:** Fill the manifest. Find each photo on unsplash.com, confirm the image URL returns 200 with `curl -I`, and record the real photo id and photographer. Do not invent ids.
- [ ] **Step 4: Run** — test passes; build succeeds.
- [ ] **Step 5: Commit** — `feat: add illustration set and Unsplash image manifest`

---

### Task 9: App shell, dashboard and kit page

**Files:**
- Create: everything under `src/components/shell/`; `src/app/[locale]/page.tsx`; `src/app/[locale]/(manager)/app/layout.tsx` and `page.tsx`; `src/app/[locale]/dev/kit/page.tsx`; `src/features/dashboard/*` (one file per card)
- Modify: `messages/*.json`

**Interfaces:**
- Consumes: `useDashboard`, `useSession`, `useLogPayment` (Task 3); UI, motion, chart and illustration components (Tasks 5 to 8); `formatMoney`, `formatMonth`, `waLink` (Task 4).
- Produces: `ManagerShell { children }`, used by every manager route in the Manager Portal plan; `PageHeader { greetingName?: string; title?: string; actions?: ReactNode }`.

- [ ] **Step 1: Shell.** `TopBar`: floating `rounded-full bg-card shadow-card` bar with logo, section links (Dashboard, Fleet, Passengers, Payments, Attendance) with a shared-layout sliding pill on the active one, then search button, notifications button, `LocaleToggle`, `ThemeToggle`, avatar menu with sign out. `IconRail`: two floating capsules fixed at the inline start, visible from `lg` up. `BottomTabs`: fixed bottom bar below `lg` with the same five sections. Content is wrapped in `PageTransition`.
- [ ] **Step 2: Dashboard cards**, laid out as in the reference on a 12-column grid: `CollectedCard` (brand tone, company name, count-up amount, collection rate, animated sheen); `MonthStatCard` (expected this month with delta against last month); `TrendCard` (`TrendBars` with Monthly/Annually `Segmented`); `OutstandingCard` (amount, `AreaLine`, "Remind all" and "Log payment" buttons); `OverdueCard` (overdue total, count chip, `AvatarStack` of riders needing attention); `RecentPaymentsCard` (`DataTable` of the latest payments with status dot); `OccupancyCard`; `MethodSplitCard`. A `MonthPicker` in the page header drives all of them. Each card has a matching skeleton, and the page has an illustrated empty state (`EmptyRoad`) for a company with no passengers and an error state with retry.
- [ ] **Step 3: Log payment dialog** wired to `useLogPayment` with React Hook Form and Zod (rider, amount, date, method, for-month, note); on success it shows a toast and the cards update through query invalidation.
- [ ] **Step 4: Temporary index page** at `/[locale]` with the logo, a link to the kit, and one button per demo user that writes the session cookie and navigates to that role's home. (Replaced by the landing page in the Front Door plan.)
- [ ] **Step 5: Kit page** showing every primitive, badge tone, chart, illustration and motion helper in both themes, with a locale switch.
- [ ] **Step 6: Verify by hand** with `npm run dev`: dashboard totals match the payments table; logging a payment for an overdue rider changes the collected amount, the overdue card and that rider's badge; `/ar/app` is fully mirrored with no clipped text; dark theme has no white flashes or unreadable text; at 375px wide the layout is a single column with bottom tabs and no horizontal scroll.
- [ ] **Step 7: Commit** — `feat: add manager shell and live dashboard`

---

### Task 10: End-to-end smoke tests and final checks

**Files:**
- Create: `playwright.config.ts`, `e2e/foundation.spec.ts`

- [ ] **Step 1:** Configure Playwright with a `webServer` running `npm run build && npm run start` on port 3100, Chromium only, plus a second project with a 390×844 mobile viewport.
- [ ] **Step 2: Tests**
  - Visiting `/en/app` without a session lands on the index page.
  - Signing in as the demo manager shows the dashboard with a non-zero collected amount.
  - Logging a payment equal to an overdue rider's balance raises the collected amount by exactly that balance.
  - Signing in as a demo driver and opening `/en/app` lands on `/en/driver` (a 404 page is acceptable until the Driver plan; assert the URL).
  - `/ar/app` has `dir="rtl"` on `<html>` and shows the Arabic dashboard title.
  - With `reducedMotion: 'reduce'` the dashboard renders its final numbers immediately.
  - The page has no horizontal scrollbar at 390px.
  - No console errors on the dashboard or kit page.
- [ ] **Step 3: Run everything** — `npm run lint && npm test && npm run build && npm run e2e`; all pass.
- [ ] **Step 4: Commit** — `test: add foundation end-to-end smoke tests`
