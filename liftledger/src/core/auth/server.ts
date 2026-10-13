import { cookies } from 'next/headers';
import type { Role, Session } from '../repo/types';
import { decodeSession, SESSION_COOKIE } from './session';

/** The signed-in user for a portal layout, or null when the cookie is missing or belongs to another role. */
export async function sessionFor(role: Role): Promise<Session | null> {
  const session = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  return session?.role === role ? session : null;
}
