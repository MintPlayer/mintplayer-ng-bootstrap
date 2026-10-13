import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
// No file watching, no live reload, no HMR: the dev server must never reload or
// patch the page mid-test. A reload wipes the state a test just built (a test
// that opened an accordion tab found it closed again and waited out its 60s
// timeout on a summary that was no longer visible).
const NO_RELOAD = '--watch=false --live-reload=false --hmr=false';
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
    // Pin the locale. The scheduler's visible week starts on the LOCALE's first
    // weekday, so an unpinned runner makes date-sensitive cases pass or fail
    // depending on the machine's locale and the day of the week.
    locale: 'en-US',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx nx serve ng-bootstrap-demo --configuration=production --port=${PORT} ${NO_RELOAD}`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
