import { defineConfig, devices } from '@playwright/test';

// Live-API Playwright matrix. Boots both the Angular demo (`ng serve`) AND
// the .NET API (`dotnet run`) and runs the specs in e2e/live/ against the
// real backend — no `page.route(...)` mocks. The Angular dev proxy
// (`apps/ng-bootstrap-demo/proxy.conf.json`) forwards /api/* to :5000.
//
// Triggered only from publish-master.yml (master pushes), not on every PR,
// because dotnet build + dotnet run startup costs ~30-60s per run.

const PORT = 4200;
const API_PORT = 5000;
const baseURL = `http://localhost:${PORT}`;
const apiURL = `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: './e2e/live',
  fullyParallel: false, // shared DB; keep serial
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium-live', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: `dotnet run --project ${'../../apps/api/Api.csproj'} --urls ${apiURL}`,
      url: `${apiURL}/api/orders/schema`,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npx nx serve ng-bootstrap-demo --configuration=production --port=${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
  ],
});
