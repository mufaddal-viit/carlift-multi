import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    // One in-memory MongoDB for the run; database tests create their own database on it.
    globalSetup: ['src/server/db/test-db.setup.ts'],
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
