import { describe, expect, it } from 'vitest';
import { SESSION_MAX_AGE, signSession, verifySession } from './session';
import type { Session } from '../repo/types';

const s: Session = { userId: 'u1', role: 'manager', companyId: 'c1', name: 'أحمد Noor', locale: 'ar' };
const SECRET = 'a-test-secret-that-is-long-enough-1234';
const NOW = Date.UTC(2026, 9, 20);

describe('signed session cookie', () => {
  it('round-trips, including non-Latin names', async () =>
    expect(await verifySession(await signSession(s, SECRET, NOW), SECRET, NOW)).toEqual(s));

  it('keeps a null company for the platform admin', async () => {
    const admin = await signSession({ ...s, role: 'admin', companyId: null }, SECRET, NOW);
    expect((await verifySession(admin, SECRET, NOW))?.companyId).toBeNull();
  });

  it('is safe to put in a cookie', async () => expect(await signSession(s, SECRET, NOW)).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/));

  it('rejects a cookie signed with another secret', async () =>
    expect(await verifySession(await signSession(s, 'another-secret-that-is-long-enough-99', NOW), SECRET, NOW)).toBeNull());

  it('rejects a cookie whose contents were changed', async () => {
    const [, signature] = (await signSession(s, SECRET, NOW)).split('.');
    const forged = Buffer.from(JSON.stringify({ ...s, role: 'admin', companyId: null, exp: NOW / 1000 + 60 })).toString('base64url');
    expect(await verifySession(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it('expires after a week', async () => {
    const value = await signSession(s, SECRET, NOW);
    expect(await verifySession(value, SECRET, NOW + (SESSION_MAX_AGE - 60) * 1000)).toEqual(s);
    expect(await verifySession(value, SECRET, NOW + SESSION_MAX_AGE * 1000)).toBeNull();
  });

  it.each([[undefined], [null], [''], ['garbage'], ['a.b'], ['a.b.c'], ['%7B%22role%22%3A%22admin%22%7D']])(
    'returns null for %s', async (v) => expect(await verifySession(v, SECRET, NOW)).toBeNull());
});
