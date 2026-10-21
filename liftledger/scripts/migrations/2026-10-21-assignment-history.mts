// Gives every passenger who already has a car the first entry of their car history ("Put in B 12345"),
// dated on their join day. Passengers who already have history are skipped.
import type { PrismaClient } from '@prisma/client';
import { forCompany } from '@/server/db/tenant';

export async function up(client: PrismaClient) {
  for (const company of await client.company.findMany({ select: { id: true, slug: true } })) {
    const db = forCompany(client, company.id);
    const [passengers, history, manager] = await Promise.all([
      db.passenger.findMany({ where: { carId: { not: null } }, select: { id: true, carId: true, joinDate: true } }),
      db.carAssignment.findMany({ select: { passengerId: true } }),
      db.user.findFirst({ where: { role: 'manager' }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
    ]);
    const has = new Set(history.map((h) => h.passengerId));
    const missing = passengers.filter((p) => !has.has(p.id));
    if (missing.length) {
      await db.carAssignment.createMany({
        data: missing.map((p) => ({
          companyId: company.id, passengerId: p.id, fromCarId: null, toCarId: p.carId, byUserId: manager?.id ?? null,
          at: new Date(`${p.joinDate}T08:00:00.000Z`),
        })),
      });
    }
    console.log(`  ${company.slug}: ${missing.length} history entries added`);
  }
}
