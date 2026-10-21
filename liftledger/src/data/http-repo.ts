import type { Repository } from '@/core/repo/types';

/** An error from the server, with the code the repository threw ('duplicate-phone', 'not-found', ...). */
export class RepoRequestError extends Error {
  constructor(code: string, readonly status: number) {
    super(code);
  }
}

async function call<T>(method: string, args: unknown[]): Promise<T> {
  const response = await fetch(`/api/repo/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args }),
  });
  const body = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!response.ok) throw new RepoRequestError(body.error ?? 'failed', response.status);
  return body.data as T;
}

/**
 * The Repository the screens use: every call goes to /api/repo/{method}. The session parameter is ignored here,
 * because the server takes the signed-in user from the cookie, never from the request.
 */
export function createHttpRepository(): Repository {
  return {
    login: () => Promise.reject(new Error('Sign in through /api/auth/login')),
    demoUsers: (companySlug) => call('demoUsers', [companySlug]),
    companyById: (companyId) => call('companyById', [companyId]),
    companyBySlug: (slug) => call('companyBySlug', [slug]),
    currentSlugFor: () => Promise.reject(new Error('Only available on the server')),
    registerPassenger: (companyId, input) => call('registerPassenger', [companyId, input]),
    company: () => call('company', []),
    cars: () => call('cars', []),
    drivers: () => call('drivers', []),
    passengers: () => call('passengers', []),
    passenger: (_s, id) => call('passenger', [id]),
    savePassenger: (_s, input, id) => call('savePassenger', id ? [input, id] : [input]),
    deactivatePassenger: (_s, id) => call('deactivatePassenger', [id]),
    fleet: () => call('fleet', []),
    assignCar: (_s, passengerId, carId) => call('assignCar', [passengerId, carId]),
    assignments: (_s, passengerId) => call('assignments', [passengerId]),
    payments: (_s, month) => call('payments', month ? [month] : []),
    logPayment: (_s, input) => call('logPayment', [input]),
    paymentLedger: (_s, month) => call('paymentLedger', [month]),
    voidPayment: (_s, id, reason) => call('voidPayment', [id, reason]),
    receipt: (_s, id) => call('receipt', [id]),
    trips: (_s, date) => call('trips', [date]),
    markTrips: (_s, date, marks) => call('markTrips', [date, marks]),
    statusBoard: (_s, month) => call('statusBoard', [month]),
    dashboard: (_s, month) => call('dashboard', [month]),
  };
}
