import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

const here = __dirname;

export default defineConfig({
  testDir: here,
  testMatch: 'narrow.spec.ts',
  timeout: 60_000,
  // Serial: every test drives the one shared harness page through viewport resizes
  // and shadow-sheet mutations, and the picker measurements need the top layer to
  // itself. Parallelism here would only buy flake.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4607' },
  webServer: {
    command: `node "${join(here, 'server.mjs')}"`,
    url: 'http://localhost:4607/harness.html',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
