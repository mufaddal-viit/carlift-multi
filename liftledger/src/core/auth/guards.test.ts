import { describe, expect, it } from 'vitest';
import { decide, homeFor, requiredRole } from './guards';
import type { Role, Session } from '../repo/types';

const as = (role: Role): Session => ({ userId: 'u', role, companyId: role === 'admin' ? null : 'c', name: 'N', locale: 'en' });

describe('requiredRole', () => {
  it.each([
    ['/app', 'manager'], ['/app/payments', 'manager'], ['/driver', 'driver'], ['/driver/collect', 'driver'],
    ['/rider/history', 'rider'], ['/admin/companies/1', 'admin'],
  ])('%s needs %s', (path, role) => expect(requiredRole(path)).toBe(role));
  it.each([['/'], [''], ['/login'], ['/pricing'], ['/dev/kit'], ['/apple'], ['/administrator'], ['/riders']])(
    '%s is public', (path) => expect(requiredRole(path)).toBeNull());
});

describe('homeFor', () => {
  it('sends each role to its own portal', () => {
    expect([homeFor('admin'), homeFor('manager'), homeFor('driver'), homeFor('rider')]).toEqual(['/admin', '/app', '/driver', '/rider']);
  });
});

describe('decide', () => {
  it('sends a visitor without a session to login', () => expect(decide('/app', null)).toEqual({ redirect: '/login' }));
  it('lets a manager into the manager portal', () => expect(decide('/app/payments', as('manager'))).toEqual({ allow: true }));
  it('sends a driver away from the manager portal to their own', () =>
    expect(decide('/app', as('driver'))).toEqual({ redirect: '/driver' }));
  it('sends a manager away from the admin portal to their own', () =>
    expect(decide('/admin', as('manager'))).toEqual({ redirect: '/app' }));
  it('lets anyone see public pages', () => {
    for (const p of ['/', '/login', '/dev/kit']) expect(decide(p, null), p).toEqual({ allow: true });
  });
  it('sends a signed-in user from login to their portal', () =>
    expect(decide('/login', as('rider'))).toEqual({ redirect: '/rider' }));
});
