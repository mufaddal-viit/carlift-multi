import type { Session } from '../repo/types';

export const SESSION_COOKIE = 'll_session';

const ROLES = ['admin', 'manager', 'driver', 'rider'];
const LOCALES = ['en', 'ar'];

export const encodeSession = (s: Session): string => encodeURIComponent(JSON.stringify(s));

export function decodeSession(value: string | null | undefined): Session | null {
  if (!value) return null;
  try {
    const x: unknown = JSON.parse(decodeURIComponent(value));
    if (typeof x !== 'object' || x === null) return null;
    const { userId, role, companyId, name, locale } = x as Record<string, unknown>;
    if (typeof userId !== 'string' || userId === '' || typeof name !== 'string') return null;
    if (typeof role !== 'string' || !ROLES.includes(role)) return null;
    if (typeof locale !== 'string' || !LOCALES.includes(locale)) return null;
    if (companyId !== null && typeof companyId !== 'string') return null;
    return { userId, role, companyId, name, locale } as Session;
  } catch {
    return null;
  }
}
