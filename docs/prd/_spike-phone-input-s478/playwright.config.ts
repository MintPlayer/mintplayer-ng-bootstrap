import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

const here = __dirname;

export default defineConfig({
  testDir: here,
  testMatch: '*.spec.ts',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4604' },
  webServer: {
    command: `node "${join(here, 'server.mjs')}"`,
    url: 'http://localhost:4604/s4-names.html',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
