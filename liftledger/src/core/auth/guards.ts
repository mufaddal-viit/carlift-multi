import type { Role, Session } from '../repo/types';

const PORTALS: [prefix: string, role: Role][] = [['/admin', 'admin'], ['/app', 'manager'], ['/driver', 'driver'], ['/rider', 'rider']];
const GUEST_ONLY = ['/login', '/signup'];
const PUBLIC = ['/register'];

export type Home = '/admin' | '/app' | '/driver' | '/rider';

export const homeFor = (role: Role): Home => PORTALS.find(([, r]) => r === role)![0] as Home;

/** Which role a path belongs to, or null when anyone may see it. The path has no locale prefix. */
export function requiredRole(path: string): Role | null {
  return PORTALS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] ?? null;
}

export function decide(path: string, session: Session | null): { allow: true } | { redirect: string } {
  // Public routes (registration) are always allowed
  if (PUBLIC.some((p) => path === p || path.startsWith(`${p}/`))) return { allow: true };
  const need = requiredRole(path);
  if (!need) return session && GUEST_ONLY.includes(path) ? { redirect: homeFor(session.role) } : { allow: true };
  if (!session) return { redirect: '/login' };
  return session.role === need ? { allow: true } : { redirect: homeFor(session.role) };
}
