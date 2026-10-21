// Numbers every existing payment R-000001, R-000002, … per company in the order the money came in, marks them
// not voided, and sets each company's receipt counter. Runs on raw documents: Prisma cannot read a payment
// that lacks the new required receiptNo. Payments that already have a number keep it.
import type { PrismaClient } from '@prisma/client';

type Doc = { _id: string; date: string; receiptNo?: number; createdAt?: { $date: string } };
type Cursor = { cursor: { firstBatch: Doc[] } };

export async function up(client: PrismaClient) {
  const companies = ((await client.$runCommandRaw({ find: 'companies', projection: { _id: 1 }, batchSize: 100_000 })) as unknown as {
    cursor: { firstBatch: { _id: string }[] };
  }).cursor.firstBatch;

  for (const { _id: companyId } of companies) {
    const docs = ((await client.$runCommandRaw({
      find: 'payments', filter: { companyId }, projection: { date: 1, receiptNo: 1, createdAt: 1 }, batchSize: 1_000_000,
    })) as unknown as Cursor).cursor.firstBatch;
    let next = docs.reduce((max, d) => Math.max(max, d.receiptNo ?? 0), 0);
    const missing = docs
      .filter((d) => typeof d.receiptNo !== 'number')
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt?.$date ?? '').localeCompare(b.createdAt?.$date ?? '') || String(a._id).localeCompare(String(b._id)));
    if (missing.length) {
      await client.$runCommandRaw({ update: 'payments', updates: missing.map((d) => ({ q: { _id: d._id }, u: { $set: { receiptNo: (next += 1) } } })) });
    }
    await client.$runCommandRaw({ update: 'payments', updates: [{ q: { companyId, voided: { $exists: false } }, u: { $set: { voided: false } }, multi: true }] });
    await client.$runCommandRaw({ update: 'companies', updates: [{ q: { _id: companyId }, u: { $max: { receiptSeq: next } } }] });
    console.log(`  ${companyId}: ${missing.length} payments numbered, counter at ${next}`);
  }
}
