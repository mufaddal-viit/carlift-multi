import { NextResponse } from 'next/server';
import { homeFor } from '@/core/auth/guards';
import { authSecret } from '@/core/auth/secret';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/core/auth/session';
import { createMockRepository } from '@/core/repo/mock';

// Accounts come from the seeded demo data until a real database replaces it.
const repo = createMockRepository({ latency: [0, 0] });

const STATUS: Record<string, number> = { 'invalid-credentials': 401, 'company-suspended': 403 };

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { identifier, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const session = await repo.login(identifier, password);
    const response = NextResponse.json({ home: homeFor(session.role) });
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
