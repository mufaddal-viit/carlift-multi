import { describe, expect, it } from 'vitest';
import { decodeSession, encodeSession } from './session';
import type { Session } from '../repo/types';

const s: Session = { userId: 'u1', role: 'manager', companyId: 'c1', name: 'أحمد Noor', locale: 'ar' };

describe('session cookie value', () => {
  it('round-trips, including non-Latin names', () => expect(decodeSession(encodeSession(s))).toEqual(s));
  it('keeps a null company for the platform admin', () =>
    expect(decodeSession(encodeSession({ ...s, role: 'admin', companyId: null }))?.companyId).toBeNull());
  it('is safe to put in a cookie', () => expect(encodeSession(s)).toMatch(/^[A-Za-z0-9%._~!'()*-]+$/));
  it.each([[undefined], [''], ['garbage'], ['%7B%22role%22%3A%22king%22%7D'], ['%E0%A4%A'], ['null'], ['42']])(
    'returns null for %s', (v) => expect(decodeSession(v)).toBeNull());
});
