import type { PrismaClient } from '@prisma/client';

/** Collections owned by a company. Every document in them carries a companyId. */
export const TENANT_MODELS = new Set(['User', 'Driver', 'Car', 'Passenger', 'Payment', 'Trip']);

/** Operations whose `where` decides which documents are read, changed or removed. */
const FILTERED = new Set([
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy',
  'update', 'updateMany', 'delete', 'deleteMany', 'upsert',
]);

export class TenantViolation extends Error {
  constructor(message: string) {
    super(`tenant-violation: ${message}`);
  }
}

type Args = Record<string, unknown> & { where?: Record<string, unknown>; data?: unknown; create?: unknown; update?: unknown };

const touchesCompany = (data: unknown) => typeof data === 'object' && data !== null && 'companyId' in data;

function stamp(data: unknown, companyId: string): Record<string, unknown> {
  const row = { ...(data as Record<string, unknown>) };
  if ('companyId' in row && row.companyId !== companyId) throw new TenantViolation('insert for another company');
  row.companyId = companyId;
  return row;
}

/**
 * A Prisma client that can only see and change one company's documents:
 *
 * - every read, count, update and delete gets `companyId` added to its filter, and a filter naming another company is refused;
 * - every insert is stamped with the companyId, and an insert for another company is refused;
 * - updates may not change companyId;
 * - raw queries, which would skip all of this, are refused, and so are platform collections (companies, plans).
 */
export function forCompany(client: PrismaClient, companyId: string) {
  if (!companyId) throw new TenantViolation('missing company');
  return client.$extends({
    name: 'tenant',
    query: {
      $allModels: {
        async $allOperations({ model, operation: op, args, query }) {
          const operation: string = op;
          if (!TENANT_MODELS.has(model)) throw new TenantViolation(`${model} is not company data`);
          if (operation === 'findRaw' || operation === 'aggregateRaw') throw new TenantViolation('raw queries are not scoped');
          const a = { ...(args as Args) };

          if (FILTERED.has(operation)) {
            if (a.where && 'companyId' in a.where && a.where.companyId !== companyId) throw new TenantViolation('filter names another company');
            a.where = { ...a.where, companyId };
          }
          if (operation === 'create') a.data = stamp(a.data, companyId);
          if (operation === 'createMany') {
            a.data = (Array.isArray(a.data) ? a.data : [a.data]).map((row) => stamp(row, companyId));
          }
          if (operation === 'upsert') {
            a.create = stamp(a.create, companyId);
            if (touchesCompany(a.update)) throw new TenantViolation('companyId cannot change');
          }
          if ((operation === 'update' || operation === 'updateMany') && touchesCompany(a.data)) {
            throw new TenantViolation('companyId cannot change');
          }
          return query(a as typeof args);
        },
      },
    },
  });
}

export type CompanyDb = ReturnType<typeof forCompany>;
