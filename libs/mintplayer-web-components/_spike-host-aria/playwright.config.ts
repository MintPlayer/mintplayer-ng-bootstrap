import { defineConfig, devices } from '@playwright/test';

/* Throwaway spike config — deleted before merge (plan Phase 0).
   No webServer on purpose: every assertion here is pure platform behaviour,
   so page.setContent() + addScriptTag is enough and costs no demo build. */
export default defineConfig({
  testDir: '.',
  /* Specs are named *.spike-test.ts, not *.spec.ts, so the web-components
     vitest target — whose include pattern matches any .spec.ts or .test.ts under
     the lib and runs it in jsdom — cannot pick up these Playwright specs.
     (Do not write the glob itself in a block comment: it contains a star-slash,
     which closes the comment. That broke all four of these configs once.) */
  testMatch: '**/*.spike-test.ts',
  reporter: [['list']],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
