import { defineConfig, devices } from '@playwright/test';

/* Throwaway spike config — deleted before merge.
   Chromium only, and that is not laziness: a real accessible NAME can only be read
   from the browser's own accessibility tree, which Playwright exposes via CDP for
   Chromium alone (see the plan's Phase 0 methodology note). Playwright's own
   accname implementation would be measuring Playwright. */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spike-test.ts',
  reporter: [['list']],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
