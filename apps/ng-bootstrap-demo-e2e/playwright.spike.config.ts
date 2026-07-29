import { defineConfig, devices } from '@playwright/test';

// THROWAWAY — config for spike 0.1b only: the base ng e2e matrix is
// chromium + firefox, but the parity gate requires WebKit too. Deleted with
// the spike. Run: npx playwright test -c playwright.spike.config.ts
const PORT = 4200;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/accordion-parity.spike.spec.ts'],
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npx nx serve ng-bootstrap-demo --configuration=production --port=${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
