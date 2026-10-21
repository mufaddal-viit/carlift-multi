// Renames Al Majra Transport to Amad Express: new name and address (the old address keeps forwarding),
// the manager becomes "Amad", and the demo emails move from @almajra.ae to @amadexpress.ae.
import type { PrismaClient } from '@prisma/client';
import { forCompany } from '@/server/db/tenant';

const COMPANY = 'co-majra';

export async function up(client: PrismaClient) {
  const company = await client.company.findUnique({ where: { id: COMPANY }, select: { slug: true, previousSlugs: true } });
  if (!company) return console.log(`  no ${COMPANY}: nothing to rename`);
  const previous = [...new Set([...company.previousSlugs, ...(company.slug !== 'amad-express' ? [company.slug] : [])])];
  await client.company.update({ where: { id: COMPANY }, data: { name: 'Amad Express', slug: 'amad-express', previousSlugs: previous }, select: { id: true } });

  const db = forCompany(client, COMPANY);
  const users = await db.user.findMany({ where: { email: { endsWith: '@almajra.ae' } }, select: { id: true, email: true } });
  for (const u of users) await db.user.update({ where: { id: u.id }, data: { email: u.email!.replace('@almajra.ae', '@amadexpress.ae') }, select: { id: true } });
  await db.user.updateMany({ where: { id: 'u-mgr-majra' }, data: { name: 'Amad' } });
  console.log(`  Amad Express at /amad-express; ${users.length} emails moved`);
}
