import { defineConfig, devices } from '@playwright/test';
// Live-API Playwright matrix. The single `npx nx serve ng-bootstrap-demo`
// command transitively starts the .NET API via the dependsOn chain in
// apps/ng-bootstrap-demo/project.json (api:serve runs in parallel as a
// `continuous: true` task), so both servers come up together.
//
// We deliberately use --configuration=development so the demo's apiBase
// resolves to '' (relative URLs) and HttpClient hits /api/* via
// apps/ng-bootstrap-demo/proxy.conf.json → localhost:5000. The
// --configuration=production build bakes in
// https://api.bootstrap.mintplayer.com, which doesn't exist in CI.

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
  // Two webServer entries so Playwright blocks tests until BOTH ports
  // respond. The first invokes `nx serve` which (via the dependsOn chain
  // in apps/ng-bootstrap-demo/project.json) starts the API too. The
  // second runs a no-op long-runner — its only job is to make Playwright
  // wait for /api/orders/schema before launching tests, since ng-serve
  // can finish compiling several seconds before the API has finished
  // seeding on cold CI runners.
  webServer: [
    {
      command: `npx nx serve ng-bootstrap-demo --configuration=development --port=${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env['CI'],
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'node -e "setInterval(()=>{}, 1<<30)"',
      url: `${apiURL}/api/orders/schema`,
      reuseExistingServer: true,
      timeout: 300_000,
    },
  ],
});
