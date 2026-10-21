import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

/**
 * Vitest global setup: one throwaway MongoDB replica set (Prisma needs a replica set for transactions) with the
 * schema's indexes pushed. Each test file uses its own database on it, so files can run in parallel.
 */
export default async function setup({ provide }: { provide: (key: 'mongoUri', value: string) => void }) {
  const server = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const base = server.getUri();
  provide('mongoUri', base);
  return async () => {
    await server.stop();
  };
}

/** Pushes the Prisma schema (collections and indexes) to one database. */
export function pushSchema(url: string) {
  const root = path.resolve(import.meta.dirname, '../../..');
  execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
