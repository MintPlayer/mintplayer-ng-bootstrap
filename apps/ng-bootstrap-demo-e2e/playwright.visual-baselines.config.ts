import { defineConfig, devices } from '@playwright/test';

/**
 * Regenerating the `-chromium-linux` visual baselines.
 *
 * Visual snapshots are rasteriser-specific, so a baseline is only meaningful
 * when it was produced by the same browser build, OS and font stack that will
 * later compare against it. CI runs Linux; a developer here runs Windows. Both
 * sets are committed side by side (`-chromium-win32.png`, `-chromium-linux.png`)
 * and Playwright picks the right one by filename, so neither environment ever
 * compares across a rasteriser.
 *
 * The Win32 set is refreshed with the ordinary config:
 *   npx playwright test --config=apps/ng-bootstrap-demo-e2e/playwright.config.ts \
 *     --project=chromium -g visual --update-snapshots
 *
 * The Linux set must NOT be produced on a developer machine — it has to come
 * from the CI rasteriser. This config exists for that, run inside the Playwright
 * container whose tag matches the installed @playwright/test. See
 * ./VISUAL-BASELINES.md for the full recipe.
 *
 * Deliberately has no `webServer`: the demo is served from the host and reached
 * over `host.docker.internal`, which avoids a full `npm ci` and production
 * build inside the container. Where the bytes are served from has no bearing on
 * how they rasterise.
 *
 * `snapshotPathTemplate` is left at its default so the filenames it writes are
 * exactly the ones playwright.config.ts will look for.
 */
export default defineConfig({
  // Relative to this file, so it resolves the same on the host and at whatever
  // path the repo is mounted on inside the container.
  testDir: './e2e',
  testMatch: ['**/*.visual.spec.ts'],
  reporter: 'list',
  // Screenshot comparison is order-independent but not resource-independent —
  // one at a time keeps rasterisation off a contended CPU.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env['VISUAL_BASE_URL'] ?? 'http://host.docker.internal:4200',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
