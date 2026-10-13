import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { decide } from '@/core/auth/guards';
import { decodeSession, SESSION_COOKIE } from '@/core/auth/session';
import { routing } from '@/i18n/routing';

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/(en|ar)(\/.*)?$/);
  if (match) {
    const path = (match[2] ?? '/').replace(/\/+$/, '') || '/';
    const verdict = decide(path, decodeSession(request.cookies.get(SESSION_COOKIE)?.value));
    if ('redirect' in verdict) return NextResponse.redirect(new URL(`/${match[1]}${verdict.redirect}`, request.url));
  }
  return intl(request);
}

export const config = { matcher: ['/((?!api|_next|_vercel|.*\..*).*)'] };
