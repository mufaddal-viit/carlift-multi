import type { Role, Session } from '../repo/types';
import { DEFAULT_COMPANY_SLUG, RESERVED_SLUGS } from '../tenant';

/** The portal each company role works in, as the first segment after the company slug. */
const PORTALS: [segment: string, role: Exclude<Role, 'admin'>][] = [['app', 'manager'], ['driver', 'driver'], ['passenger', 'passenger']];

export type Verdict = { allow: true } | { redirect: string };

const allow: Verdict = { allow: true };

/** Where a signed-in user belongs: their company's portal, or the platform console for the platform admin. */
export function homeFor(session: Pick<Session, 'role' | 'companySlug'>): string {
  if (session.role === 'admin' || !session.companySlug) return '/admin';
  return `/${session.companySlug}/${PORTALS.find(([, r]) => r === session.role)![0]}`;
}

/** Which role a company page belongs to, from its path below the slug ('/app/payments' → manager), or null when public. */
export function requiredRole(rest: string): Exclude<Role, 'admin'> | null {
  return PORTALS.find(([segment]) => rest === `/${segment}` || rest.startsWith(`/${segment}/`))?.[1] ?? null;
}

/**
 * Who may open a path (without its locale prefix).
 *
 * Company pages live under the company slug: /{slug}/login, /{slug}/register, /{slug}/app/…
 * A session only opens the portals of its own company and role; anything else goes back home.
 */
export function decide(path: string, session: Session | null): Verdict {
  const [first = '', ...more] = path.split('/').filter(Boolean);
  const rest = more.length ? `/${more.join('/')}` : '/';

  if (first === '' || first === 'dev') return allow;

  // The single-operator front door, and old links from before company addresses.
  if (first === 'login') return { redirect: session ? homeFor(session) : `/${DEFAULT_COMPANY_SLUG}/login` };
  if (first === 'register') return allow; // /register/{companyId}: the page forwards to the company address.
  if (PORTALS.some(([segment]) => segment === first)) {
    return { redirect: session ? (session.companySlug ? `/${session.companySlug}${path}` : homeFor(session)) : `/${DEFAULT_COMPANY_SLUG}/login` };
  }

  if (first === 'admin') {
    if (rest === '/login') return session ? { redirect: homeFor(session) } : allow;
    if (!session) return { redirect: '/admin/login' };
    return session.role === 'admin' ? allow : { redirect: homeFor(session) };
  }
  if (RESERVED_SLUGS.has(first)) return allow; // Unknown app-owned words fall through to a 404.

  const slug = first;
  if (rest === '/') return { redirect: session ? homeFor(session) : `/${slug}/login` };
  if (rest === '/register' || rest.startsWith('/register/')) return allow;
  if (rest === '/login') return session ? { redirect: homeFor(session) } : allow;

  const need = requiredRole(rest);
  if (!need) return allow;
  if (!session) return { redirect: `/${slug}/login` };
  return session.companySlug === slug && session.role === need ? allow : { redirect: homeFor(session) };
}
