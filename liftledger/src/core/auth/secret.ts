const DEV_SECRET = 'liftledger-development-only-secret-never-use-in-production';

/** The key that signs session cookies. Production refuses to run without a real one. */
export function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET must be set to at least 32 characters');
  return DEV_SECRET;
}
