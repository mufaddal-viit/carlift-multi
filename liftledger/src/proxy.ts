import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { decide } from '@/core/auth/guards';
import { authSecret } from '@/core/auth/secret';
import { SESSION_COOKIE, verifySession } from '@/core/auth/session';
import { routing } from '@/i18n/routing';

const intl = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/(en|ar)(\/.*)?$/);
  if (match) {
    const path = (match[2] ?? '/').replace(/\/+$/, '') || '/';
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, authSecret());
    const verdict = decide(path, session);
    if ('redirect' in verdict) return NextResponse.redirect(new URL(`/${match[1]}${verdict.redirect}`, request.url));
  }
  return intl(request);
}

// The pattern is a string, so the dot that marks file requests (favicon.ico) needs a double backslash.
// Link-preview images (/en/opengraph-image) have no dot in their address, so they are left out by name.
export const config = { matcher: ['/((?!api|_next|_vercel|.*opengraph-image|.*\\..*).*)'] };
