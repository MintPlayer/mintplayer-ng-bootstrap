import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Specs under e2e/live/ are owned by playwright.live-api.config.ts; they
  // expect a real `dotnet run` backend on :5000 and would fail in this config.
  // *.spike.spec.ts files are owned by playwright.spike.config.ts (throwaway
  // spike gates that need a different browser matrix).
  testIgnore: ['**/live/**', '**/*.spike.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: 'list',
  // Playwright's default expect budget is 5s. That is too small for a
  // component that runs a 500ms CSS transition and a Lit re-render on a
  // CPU-starved 2-vCPU runner, and it produced an intermittent
  // `toBeChecked()` failure in the carousel suite that reproduced on neither
  // a developer machine nor a lightly-loaded CI run.
  //
  // Measured, by clicking a carousel indicator under CDP CPU throttling and
  // timing how long the radio took to flip:
  //
  //     1x   577ms      20x  2083ms
  //    10x   868ms      30x  6606ms   <- past the 5s default
  //                     40x 16261ms
  //
  // The gesture is never LOST at any rate — only late. So this is a budget
  // that was too tight, not a dropped click, and the fix is to let the
  // existing auto-retry poll for longer. A fixed `waitForTimeout` would be
  // strictly worse: it slows the fast path and still misses the slow one.
  expect: { timeout: 15_000 },
  // Raised in step with the expect budget above: a test that spends 15s inside
  // one slow assertion must still have room for the rest of its assertions,
  // and Playwright's 30s default leaves almost none. Only on CI — locally a
  // hung test should fail fast rather than sit for a minute.
  timeout: process.env['CI'] ? 60_000 : 30_000,
  use: {
    // Pin the locale. The scheduler now derives its date/time formatting AND its
    // week start from it, so an unpinned run behaves differently per machine —
    // a Belgian dev gets a Monday-start week, CI's en-US gets Sunday, and a
    // failure reproduces on only one of them. This is the e2e counterpart of the
    // locale pinning the unit specs already do.
    locale: 'en-US',
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
