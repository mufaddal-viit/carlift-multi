import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { inject } from 'vitest';
import { createPrisma } from './client';
import { seedDatabase } from './seed';
import { pushSchema } from './test-db.setup';
import { applyValidators } from './validators';

/** A fresh database for one test file: schema pushed, validators on, demo data seeded for `today`. */
export async function createTestDatabase(today: string): Promise<{ client: PrismaClient; drop: () => Promise<void> }> {
  const base = new URL(inject('mongoUri'));
  base.pathname = `/test_${randomUUID().replace(/-/g, '')}`;
  const url = base.toString();
  const client = createPrisma(url);
  await applyValidators(client);
  pushSchema(url);
  await seedDatabase(client, today);
  return {
    client,
    drop: async () => {
      await client.$runCommandRaw({ dropDatabase: 1 });
      await client.$disconnect();
    },
  };
}
