// Before `prisma db push`: turns on MongoDB's own check that every company document has a companyId.
import './env.mjs';
import { createPrisma } from '@/server/db/client';
import { applyValidators } from '@/server/db/validators';

const client = createPrisma();
try {
  for (const line of await applyValidators(client)) console.log(line);
} finally {
  await client.$disconnect();
}
