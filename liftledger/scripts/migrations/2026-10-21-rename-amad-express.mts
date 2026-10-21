// Renames Al Majra Transport to Amad Express: new name and address (the old address keeps forwarding),
// the manager becomes "Amad", and the demo emails move from @almajra.ae to @amadexpress.ae.
// Safe to run twice. Usage: npx tsx scripts/migrations/2026-10-21-rename-amad-express.mts
import '../env.mjs';
import { createPrisma } from '@/server/db/client';
import { forCompany } from '@/server/db/tenant';

const COMPANY = 'co-majra';
const client = createPrisma();
try {
  const company = await client.company.findUnique({ where: { id: COMPANY } });
  if (!company) throw new Error(`No company ${COMPANY}`);
  const previous = [...new Set([...company.previousSlugs, ...(company.slug !== 'amad-express' ? [company.slug] : [])])];
  await client.company.update({ where: { id: COMPANY }, data: { name: 'Amad Express', slug: 'amad-express', previousSlugs: previous } });

  const db = forCompany(client, COMPANY);
  const users = await db.user.findMany({ where: { email: { endsWith: '@almajra.ae' } } });
  for (const u of users) await db.user.update({ where: { id: u.id }, data: { email: u.email!.replace('@almajra.ae', '@amadexpress.ae') } });
  await db.user.updateMany({ where: { id: 'u-mgr-majra' }, data: { name: 'Amad' } });

  console.log(`Company is now "Amad Express" at /amad-express (old: ${previous.join(', ') || 'none'}); ${users.length} emails moved; manager renamed.`);
} finally {
  await client.$disconnect();
}
