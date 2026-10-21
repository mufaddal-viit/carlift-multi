import { cookies } from 'next/headers';
import type { Role, Session } from '../repo/types';
import { authSecret } from './secret';
import { SESSION_COOKIE, verifySession } from './session';

/**
 * The signed-in user for a portal page, or null when the cookie is missing or forged, belongs to another role,
 * or (for company portals) belongs to another company than the address being opened.
 */
export async function sessionFor(role: Role, companySlug?: string): Promise<Session | null> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value, authSecret());
  if (session?.role !== role) return null;
  if (companySlug !== undefined && session.companySlug !== companySlug) return null;
  return session;
}
