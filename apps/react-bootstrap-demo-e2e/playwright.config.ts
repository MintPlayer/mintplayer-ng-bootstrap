import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';
// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4000';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run the real SSR server (not the static `preview`) so e2e exercises the
   * server-rendered Declarative Shadow DOM — the no-JS shell test needs
   * request-time SSR. Locally this reuses the running dev server on :4000
   * (also SSR, via Vite middleware); in CI it builds client + SSR bundles and
   * runs the production Node server. */
  webServer: {
    command:
      'npx nx run react-bootstrap-demo:build && npx nx run react-bootstrap-demo:build-ssr && node apps/react-bootstrap-demo/server.mjs',
    url: 'http://localhost:4000',
    reuseExistingServer: true,
    cwd: workspaceRoot,
    timeout: 300_000,
    env: { NODE_ENV: 'production', PORT: '4000' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
