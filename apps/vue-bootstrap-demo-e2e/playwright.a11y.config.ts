import { defineConfig, devices } from '@playwright/test';
import { workspaceRoot } from '@nx/devkit';

const baseURL = process.env['BASE_URL'] || 'http://localhost:4100';

/**
 * The axe a11y gate — its own config + Nx target (`e2e-a11y`) so
 * `nx affected --target=e2e` can never silence it. Chromium only: axe
 * results are engine-independent, and one engine keeps the gate fast.
 */
export default defineConfig({
  testDir: './a11y',
  outputDir: './test-output-a11y',
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
    command:
      'npx nx run vue-bootstrap-demo:build && npx nx run vue-bootstrap-demo:build-ssr && node apps/vue-bootstrap-demo/server.mjs',
    url: 'http://localhost:4100',
    reuseExistingServer: true,
    cwd: workspaceRoot,
    timeout: 300_000,
    env: { NODE_ENV: 'production', PORT: '4100' },
  },
});
