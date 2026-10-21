// Reports the tenancy safeguards on the live database: unique indexes per collection, and whether MongoDB
// refuses a company document without a companyId. Read-only apart from that one refused insert.
import './env.mjs';
import { createPrisma } from '@/server/db/client';

type Listed = { cursor: { firstBatch: { name: string; unique?: boolean }[] } };

const client = createPrisma();
try {
  for (const collection of ['companies', 'users', 'drivers', 'cars', 'passengers', 'payments', 'trips', 'car_assignments']) {
    const indexes = ((await client.$runCommandRaw({ listIndexes: collection })) as Listed).cursor.firstBatch;
    const count = ((await client.$runCommandRaw({ count: collection })) as { n: number }).n;
    console.log(`${collection} (${count}): ${indexes.map((i) => i.name + (i.unique ? ' [unique]' : '')).join(', ')}`);
  }
  const probe = (await client.$runCommandRaw({ insert: 'passengers', documents: [{ _id: 'db-check-probe', name: 'no company' }] })) as { n: number };
  console.log(`A passenger without companyId is ${probe.n === 0 ? 'refused by MongoDB' : 'ACCEPTED: validators are missing, run npm run db:push'}`);
  if (probe.n > 0) await client.$runCommandRaw({ delete: 'passengers', deletes: [{ q: { _id: 'db-check-probe' }, limit: 1 }] });
} finally {
  await client.$disconnect();
}
