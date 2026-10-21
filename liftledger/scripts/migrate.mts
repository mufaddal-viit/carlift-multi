// Runs the data migrations in scripts/migrations that this database has not run yet, oldest first, and
// records each one in the _migrations collection. Part of `npm run db:push`; run alone with `npm run db:migrate`.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import './env.mjs';
import { createPrisma } from '@/server/db/client';

const dir = path.resolve('scripts/migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.mts')).sort();
const client = createPrisma();
try {
  const done = ((await client.$runCommandRaw({ find: '_migrations', projection: { _id: 1 }, batchSize: 10_000 })) as unknown as {
    cursor: { firstBatch: { _id: string }[] };
  }).cursor.firstBatch.map((d) => d._id);
  for (const file of files) {
    if (done.includes(file)) continue;
    console.log(`Migrating: ${file}`);
    const { up } = (await import(pathToFileURL(path.join(dir, file)).href)) as { up: (c: PrismaClient) => Promise<void> };
    await up(client);
    await client.$runCommandRaw({ insert: '_migrations', documents: [{ _id: file, at: { $date: new Date().toISOString() } }] });
  }
  console.log(`Migrations up to date (${files.length}).`);
} finally {
  await client.$disconnect();
}
