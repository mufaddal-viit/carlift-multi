import { defineConfig, devices } from '@playwright/test';

// 3217 is unlikely to clash with other local projects.
const PORT = 3217;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'line',
  timeout: 45_000,
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/en/login`,
    timeout: 300_000,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
