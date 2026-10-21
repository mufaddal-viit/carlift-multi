import type { Session } from '../repo/types';

export const SESSION_COOKIE = 'll_session';
/** A week, in seconds. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const ROLES = ['admin', 'manager', 'driver', 'passenger'];
const LOCALES = ['en', 'ar'];

/** A session from untrusted JSON, or null when any field is missing or wrong. */
function parseSession(x: unknown): Session | null {
  if (typeof x !== 'object' || x === null) return null;
  const { userId, role, companyId, companySlug, name, locale } = x as Record<string, unknown>;
  if (typeof userId !== 'string' || userId === '' || typeof name !== 'string') return null;
  if (typeof role !== 'string' || !ROLES.includes(role)) return null;
  if (typeof locale !== 'string' || !LOCALES.includes(locale)) return null;
  if (companyId !== null && typeof companyId !== 'string') return null;
  if (companySlug !== null && typeof companySlug !== 'string') return null;
  if ((companyId === null) !== (companySlug === null)) return null;
  return { userId, role, companyId, companySlug, name, locale } as Session;
}

const text = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', text.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

/** The cookie value for a session: its JSON and expiry, signed so the browser cannot change either. */
export async function signSession(session: Session, secret: string, now = Date.now()): Promise<string> {
  const body = toBase64Url(text.encode(JSON.stringify({ ...session, exp: Math.floor(now / 1000) + SESSION_MAX_AGE })));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), text.encode(body)));
  return `${body}.${toBase64Url(signature)}`;
}

/** The session in a cookie value, or null when it is missing, expired, malformed or not signed with this secret. */
export async function verifySession(value: string | null | undefined, secret: string, now = Date.now()): Promise<Session | null> {
  const [body, signature, ...rest] = value?.split('.') ?? [];
  if (!body || !signature || rest.length > 0) return null;
  try {
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64Url(signature), text.encode(body));
    if (!valid) return null;
    const payload: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    const exp = (payload as { exp?: unknown } | null)?.exp;
    if (typeof exp !== 'number' || exp * 1000 <= now) return null;
    return parseSession(payload);
  } catch {
    return null;
  }
}
