import { PrismaClient } from '@prisma/client';
import { databaseUrl } from './url';

/**
 * The unscoped Prisma client. It sees every company's data, so only platform-level code may import it:
 * the repository's public and sign-in paths, and the seed scripts. Everything else goes through
 * forCompany() in ./tenant.ts. A lint rule enforces this.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrisma(url = databaseUrl()): PrismaClient {
  return new PrismaClient({ datasourceUrl: url });
}

/** One client per server process; dev hot reloads reuse it instead of opening new connection pools. */
export function prisma(): PrismaClient {
  globalForPrisma.prisma ??= createPrisma();
  return globalForPrisma.prisma;
}
