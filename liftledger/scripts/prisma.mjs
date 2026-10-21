// Runs the Prisma CLI against the database named by MONGODB_URI (Vercel Storage), adding the database name
// the way the app does (src/server/db/url.ts). Usage: node scripts/prisma.mjs db push
import { spawnSync } from 'node:child_process';
import './env.mjs';

if (!process.env.DATABASE_URL) {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Put it in .env.local or run `vercel env pull .env.local`.');
    process.exit(1);
  }
  const url = new URL(process.env.MONGODB_URI);
  if (url.pathname === '' || url.pathname === '/') url.pathname = `/${process.env.MONGODB_DB || 'liftledger'}`;
  process.env.DATABASE_URL = url.toString();
}

const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
