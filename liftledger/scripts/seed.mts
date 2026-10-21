// Seeds the demo companies. Refuses a database that already has companies unless --reset is given.
// Usage: npm run db:seed            (empty database)
//        npm run db:seed -- --reset (wipes every document first; the production database also needs --production)
import './env.mjs';
import { todayInDubai } from '@/core/clock';
import { createPrisma } from '@/server/db/client';
import { seedDatabase } from '@/server/db/seed';
import { databaseUrl, DEFAULT_DATABASE } from '@/server/db/url';

const reset = process.argv.includes('--reset');
const database = new URL(databaseUrl()).pathname.slice(1);
if (reset && database === DEFAULT_DATABASE && !process.argv.includes('--production')) {
  console.error(`Refusing to wipe "${database}", the production database. Add --production if you really mean it.`);
  process.exit(1);
}
console.log(`Seeding database "${database}"${reset ? ' (wiping it first)' : ''}`);

const client = createPrisma();
try {
  const counts = await seedDatabase(client, todayInDubai(), { reset });
  console.log('Seeded:', counts);
} finally {
  await client.$disconnect();
}
