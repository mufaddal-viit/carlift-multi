import type { Home } from '@/core/auth/guards';

export type SignInError = 'invalid-input' | 'invalid-credentials' | 'company-suspended' | 'failed';

/** Asks the server to check the credentials. On success the server sets the signed session cookie. */
export async function signIn(identifier: string, password: string): Promise<{ home: Home } | { error: SignInError }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = (await response.json().catch(() => ({}))) as { home?: Home; error?: SignInError };
    if (response.ok && data.home) return { home: data.home };
    return { error: data.error ?? 'failed' };
  } catch {
    return { error: 'failed' };
  }
}

export async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
}
