import type { PrismaClient } from '@prisma/client';

/** Collection name → which companyId values MongoDB accepts. Users may have none (platform admins). */
const TENANT_COLLECTIONS: Record<string, string[]> = {
  users: ['string', 'null'],
  drivers: ['string'],
  cars: ['string'],
  passengers: ['string'],
  payments: ['string'],
  trips: ['string'],
};

const validatorFor = (types: string[]) => ({
  $jsonSchema: {
    bsonType: 'object',
    required: ['companyId'],
    properties: { companyId: { bsonType: types, ...(types.includes('null') ? {} : { minLength: 1 }) } },
  },
});

/**
 * The database's own backstop for tenancy: MongoDB refuses any company document written without a companyId,
 * even by code that bypassed the scoped client.
 *
 * Run before `prisma db push`. Missing collections are created with the rule. Existing ones are changed with
 * collMod; the database user Vercel Storage creates may not run collMod, so an existing *empty* collection is
 * dropped and created again instead. A collection that holds data and cannot be changed is reported, not touched.
 */
export async function applyValidators(client: PrismaClient): Promise<string[]> {
  const listed = (await client.$runCommandRaw({ listCollections: 1, nameOnly: true })) as {
    cursor: { firstBatch: { name: string }[] };
  };
  const existing = new Set(listed.cursor.firstBatch.map((c) => c.name));
  const report: string[] = [];

  for (const [collection, types] of Object.entries(TENANT_COLLECTIONS)) {
    const options = { validator: validatorFor(types), validationLevel: 'strict', validationAction: 'error' };
    if (!existing.has(collection)) {
      await client.$runCommandRaw({ create: collection, ...options });
      report.push(`${collection}: created with the rule`);
      continue;
    }
    try {
      await client.$runCommandRaw({ collMod: collection, ...options });
      report.push(`${collection}: rule updated`);
    } catch (error) {
      const count = (await client.$runCommandRaw({ count: collection })) as { n: number };
      if (count.n > 0) {
        report.push(`${collection}: NOT updated (holds data and this user may not run collMod): ${String(error).slice(0, 120)}`);
        continue;
      }
      await client.$runCommandRaw({ drop: collection });
      await client.$runCommandRaw({ create: collection, ...options });
      report.push(`${collection}: empty, recreated with the rule`);
    }
  }
  return report;
}
