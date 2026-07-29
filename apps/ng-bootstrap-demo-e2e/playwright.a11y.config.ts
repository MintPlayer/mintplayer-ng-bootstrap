import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
const baseURL = `http://localhost:${PORT}`;

/**
 * The axe a11y gate — its own config + Nx target (`e2e-a11y`) so
 * `nx affected --target=e2e` can never silence it. Chromium only: axe
 * results are engine-independent, and one engine keeps the gate fast.
 */
export default defineConfig({
  testDir: './a11y',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx nx serve ng-bootstrap-demo --configuration=production --port=${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
