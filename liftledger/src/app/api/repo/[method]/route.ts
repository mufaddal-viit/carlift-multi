import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { authSecret } from '@/core/auth/secret';
import { SESSION_COOKIE, verifySession } from '@/core/auth/session';
import { serverRepo } from '@/core/repo/server';
import type { Repository, Session } from '@/core/repo/types';

/**
 * The bridge between the screens and the database: POST /api/repo/{method} with { args: [...] }.
 *
 * Each method has a schema for its arguments, so a request can only pass plain strings and numbers of the
 * expected shape (never a query object such as { "$ne": "" }). Signed-in methods take the session from the signed
 * cookie, never from the request.
 */

const id = z.string().min(1).max(64);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const text = (max = 120) => z.string().trim().min(1).max(max);
const money = z.number().int().min(0).max(1_000_000);

const passengerInput = z.object({
  carId: id.nullable(),
  name: text(),
  employerName: z.string().trim().max(120),
  phone: z.string().max(32),
  pickupArea: text(),
  dropArea: text(),
  seatNumber: z.number().int().min(0).max(99),
  billingType: z.enum(['monthly', 'perTrip']),
  monthlyFee: money,
  perTripFee: money,
  joinDate: date,
});

const paymentInput = z.object({
  passengerId: id,
  amount: z.number(),
  date,
  method: z.enum(['cash', 'transfer', 'wallet']),
  forMonth: z.string().max(7),
  note: z.string().max(500).optional(),
});

const registrationInput = z.object({
  name: text(),
  employerName: text(),
  phone: z.string().max(32),
  pickupArea: text(),
  dropArea: text(),
});

const marks = z.array(z.object({ passengerId: id, status: z.enum(['travelled', 'absent']) })).max(500);

/** Methods anyone may call: they back the login and registration pages. */
const PUBLIC = {
  demoUsers: z.tuple([z.string().max(64).nullable()]),
  companyById: z.tuple([id]),
  companyBySlug: z.tuple([z.string().max(64)]),
  registerPassenger: z.tuple([id, registrationInput]),
} satisfies Partial<Record<keyof Repository, z.ZodType>>;

/** Methods for a signed-in user; the session is added from the cookie. */
const PRIVATE = {
  company: z.tuple([]),
  cars: z.tuple([]),
  drivers: z.tuple([]),
  passengers: z.tuple([]),
  passenger: z.tuple([id]),
  savePassenger: z.union([z.tuple([passengerInput]), z.tuple([passengerInput, id])]),
  deactivatePassenger: z.tuple([id]),
  payments: z.union([z.tuple([]), z.tuple([month.optional()])]),
  logPayment: z.tuple([paymentInput]),
  deletePayment: z.tuple([id]),
  trips: z.tuple([date]),
  markTrips: z.tuple([date, marks]),
  statusBoard: z.tuple([month]),
  dashboard: z.tuple([month]),
} satisfies Partial<Record<keyof Repository, z.ZodType>>;

/** Error codes the repository throws on purpose, and the HTTP status each one gets. */
const STATUS: Record<string, number> = {
  'invalid-input': 400, 'invalid-phone': 400, 'unauthenticated': 401, 'forbidden': 403, 'not-found': 404, 'duplicate-phone': 409,
};

const error = (code: string) => NextResponse.json({ error: code }, { status: STATUS[code] ?? 500 });

type Call = (...args: unknown[]) => Promise<unknown>;

export async function POST(request: Request, { params }: { params: Promise<{ method: string }> }) {
  const { method } = await params;
  const body = (await request.json().catch(() => null)) as { args?: unknown } | null;
  const repo = serverRepo() as unknown as Record<string, Call>;

  try {
    if (Object.hasOwn(PUBLIC, method)) {
      const args = PUBLIC[method as keyof typeof PUBLIC].safeParse(body?.args ?? []);
      if (!args.success) return error('invalid-input');
      return NextResponse.json({ data: (await repo[method](...args.data)) ?? null });
    }
    if (Object.hasOwn(PRIVATE, method)) {
      const session: Session | null = await verifySession((await cookies()).get(SESSION_COOKIE)?.value, authSecret());
      if (!session) return error('unauthenticated');
      const args = PRIVATE[method as keyof typeof PRIVATE].safeParse(body?.args ?? []);
      if (!args.success) return error('invalid-input');
      return NextResponse.json({ data: (await repo[method](session, ...args.data)) ?? null });
    }
    return error('not-found');
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    if (code in STATUS) return error(code);
    console.error(`repo.${method} failed`, e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
