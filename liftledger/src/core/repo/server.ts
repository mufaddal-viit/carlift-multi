import 'server-only';
import { prisma } from '@/server/db/client';
import { createDbRepository } from '@/server/db/repository';
import type { Repository } from './types';

let repo: Repository | undefined;

/** The repository used by server code: route handlers, layouts and pages. Backed by MongoDB. */
export function serverRepo(): Repository {
  repo ??= createDbRepository(prisma());
  return repo;
}
