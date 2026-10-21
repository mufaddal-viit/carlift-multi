import { NextResponse } from 'next/server';
import { homeFor } from '@/core/auth/guards';
import { authSecret } from '@/core/auth/secret';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/core/auth/session';
import { serverRepo } from '@/core/repo/server';

const STATUS: Record<string, number> = { 'invalid-credentials': 401, 'company-suspended': 403 };

/** Body: { identifier, password, company } where company is the slug of the login page, or null for the platform console. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { identifier, password, company } = (body ?? {}) as Record<string, unknown>;
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (company !== null && typeof company !== 'string') return NextResponse.json({ error: 'invalid-input' }, { status: 400 });

  try {
    const session = await serverRepo().login(identifier, password, company);
    const response = NextResponse.json({ home: homeFor(session) });
    response.cookies.set(SESSION_COOKIE, await signSession(session, authSecret()), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (!(code in STATUS)) throw error;
    return NextResponse.json({ error: code }, { status: STATUS[code] });
  }
}
