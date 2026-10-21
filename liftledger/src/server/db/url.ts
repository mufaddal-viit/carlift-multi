/** The database every environment uses unless MONGODB_DB names another one. */
export const DEFAULT_DATABASE = 'liftledger';

/**
 * Prisma needs the database name in the connection string. Vercel Storage gives MONGODB_URI without one
 * (mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true), so the name is added here.
 * An explicit DATABASE_URL (tests, scripts) wins.
 */
export function databaseUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Add MongoDB Atlas in Vercel → Storage, or put it in .env.local.');
  const url = new URL(uri);
  if (url.pathname === '' || url.pathname === '/') url.pathname = `/${env.MONGODB_DB || DEFAULT_DATABASE}`;
  return url.toString();
}
