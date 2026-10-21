// Gives every passenger who already has a car the first entry of their car history ("Put in B 12345"),
// dated on their join day. Safe to run twice: passengers who already have history are skipped.
// Usage: npx tsx scripts/migrations/2026-10-21-assignment-history.mts
import '../env.mjs';
import { createPrisma } from '@/server/db/client';
import { forCompany } from '@/server/db/tenant';

const client = createPrisma();
try {
  for (const company of await client.company.findMany()) {
    const db = forCompany(client, company.id);
    const [passengers, history, manager] = await Promise.all([
      db.passenger.findMany({ where: { carId: { not: null } } }),
      db.carAssignment.findMany({ select: { passengerId: true } }),
      db.user.findFirst({ where: { role: 'manager' }, orderBy: { createdAt: 'asc' } }),
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
    console.log(`${company.slug}: ${missing.length} history entries added`);
  }
} finally {
  await client.$disconnect();
}
