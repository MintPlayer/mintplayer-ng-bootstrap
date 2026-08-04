import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

/* Throwaway spike config — deleted before merge. All three engines: the group
   contract is pure CSS mechanics and WebKit is the one most likely to diverge
   (and matters most for a phone field, which is mobile-first). */
const here = __dirname;

export default defineConfig({
  testDir: here,
  testMatch: 's1.spec.ts',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4601' },
  webServer: {
    command: `node "${join(here, 'prepare.mjs')}" && node "${join(here, 'server.mjs')}"`,
    url: 'http://localhost:4601/s1.html',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
