import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Specs under e2e/live/ are owned by playwright.live-api.config.ts; they
  // expect a real `dotnet run` backend on :5000 and would fail in this config.
  testIgnore: ['**/live/**'],
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  // Use Angular's dev-server in production mode. AOT, prod env replacements,
  // and prod budgets all apply — only the on-disk artifact bytes differ from
  // a real `nx build` output. Avoids the brittle "test against the built
  // SSR server.mjs" path which struggles with Nx's cache lifecycle.
  webServer: {
    command: `npx nx serve ng-bootstrap-demo --configuration=production --port=${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
