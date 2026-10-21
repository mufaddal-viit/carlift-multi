import { describe, expect, it } from 'vitest';
import { decide, homeFor, requiredRole } from './guards';
import type { Role, Session } from '../repo/types';

const SLUG = 'al-majra-transport';

const as = (role: Role, companySlug: string | null = role === 'admin' ? null : SLUG): Session => ({
  userId: 'u', role, companyId: companySlug ? 'c' : null, companySlug, name: 'N', locale: 'en',
});

describe('requiredRole', () => {
  it.each([
    ['/app', 'manager'], ['/app/payments', 'manager'], ['/driver', 'driver'], ['/driver/collect', 'driver'], ['/passenger/history', 'passenger'],
  ])('%s needs %s', (rest, role) => expect(requiredRole(rest)).toBe(role));
  it.each([['/'], ['/login'], ['/register'], ['/apple'], ['/passengers']])('%s is public', (rest) => expect(requiredRole(rest)).toBeNull());
});

describe('homeFor', () => {
  it('sends each company role to its portal under the company address', () => {
    expect([homeFor(as('manager')), homeFor(as('driver')), homeFor(as('passenger'))]).toEqual([
      `/${SLUG}/app`, `/${SLUG}/driver`, `/${SLUG}/passenger`,
    ]);
  });
  it('sends the platform admin to the console', () => expect(homeFor(as('admin'))).toBe('/admin'));
});

describe('decide', () => {
  it('sends a visitor without a session to that company login', () =>
    expect(decide(`/${SLUG}/app`, null)).toEqual({ redirect: `/${SLUG}/login` }));
  it('lets a manager into their own company portal', () => expect(decide(`/${SLUG}/app/payments`, as('manager'))).toEqual({ allow: true }));
  it('sends a manager of another company back to their own portal', () =>
    expect(decide(`/${SLUG}/app`, as('manager', 'skyline-commute'))).toEqual({ redirect: '/skyline-commute/app' }));
  it('sends a driver away from the manager portal to their own', () =>
    expect(decide(`/${SLUG}/app`, as('driver'))).toEqual({ redirect: `/${SLUG}/driver` }));
  it('keeps the platform admin out of company portals', () => expect(decide(`/${SLUG}/app`, as('admin'))).toEqual({ redirect: '/admin' }));
  it('sends a manager away from the platform console', () => expect(decide('/admin', as('manager'))).toEqual({ redirect: `/${SLUG}/app` }));
  it('sends a visitor of the console to its own login', () => expect(decide('/admin', null)).toEqual({ redirect: '/admin/login' }));

  it('opens company login and registration to everyone', () => {
    for (const p of [`/${SLUG}/login`, `/${SLUG}/register`]) expect(decide(p, null), p).toEqual({ allow: true });
    expect(decide(`/${SLUG}/register`, as('manager'))).toEqual({ allow: true });
  });
  it('sends a signed-in user from login to their portal', () =>
    expect(decide(`/${SLUG}/login`, as('passenger'))).toEqual({ redirect: `/${SLUG}/passenger` }));
  it('sends the company root to its login', () => expect(decide(`/${SLUG}`, null)).toEqual({ redirect: `/${SLUG}/login` }));

  it('sends the bare login to the default company', () => expect(decide('/login', null)).toEqual({ redirect: `/${SLUG}/login` }));
  it('forwards old portal links to the company address', () => {
    expect(decide('/app/passengers', as('manager'))).toEqual({ redirect: `/${SLUG}/app/passengers` });
    expect(decide('/app', null)).toEqual({ redirect: `/${SLUG}/login` });
  });
  it('lets anyone see the landing page and the design kit', () => {
    for (const p of ['/', '/dev/kit']) expect(decide(p, null), p).toEqual({ allow: true });
  });
});
