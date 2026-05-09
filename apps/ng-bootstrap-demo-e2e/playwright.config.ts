import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  // Run the built Angular SSR server against the production artifact.
  // server.ts respects $PORT and serves dist/apps/ng-bootstrap-demo/browser/
  // statically with SSR fallback for unmatched routes.
  webServer: {
    command: 'node dist/apps/ng-bootstrap-demo/server/server.mjs',
    cwd: '../..',
    env: { PORT: String(PORT) },
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
