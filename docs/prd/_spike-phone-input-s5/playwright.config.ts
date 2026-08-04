import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

/* Throwaway spike config for S5 (FACE-in-FACE + nested delegatesFocus).
   Specs are named *.spike-test.ts so the web-components vitest target cannot
   pick them up. Deleted before merge. */
const here = __dirname;

export default defineConfig({
  testDir: here,
  testMatch: '**/*.spike-test.ts',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4605' },
  webServer: {
    command: `node "${join(here, 'server.mjs')}"`,
    url: 'http://localhost:4605/s5-basic.html',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
