import { cookies } from 'next/headers';
import type { Role, Session } from '../repo/types';
import { authSecret } from './secret';
import { SESSION_COOKIE, verifySession } from './session';

/** The signed-in user for a portal layout, or null when the cookie is missing, forged or belongs to another role. */
export async function sessionFor(role: Role): Promise<Session | null> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value, authSecret());
  return session?.role === role ? session : null;
}
