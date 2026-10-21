import 'server-only';
import { createMockRepository } from './mock';
import type { Repository } from './types';

// Seeded demo data until the database replaces it. One instance per server process.
const repo = createMockRepository({ latency: [0, 0] });

/** The repository used by server code: route handlers, layouts and pages. */
export const serverRepo = (): Repository => repo;
