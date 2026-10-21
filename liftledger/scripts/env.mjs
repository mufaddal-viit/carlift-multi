// Loads .env.local (then .env) for scripts run outside Next.js, which loads them itself.
import { existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) if (existsSync(file)) process.loadEnvFile(file);
