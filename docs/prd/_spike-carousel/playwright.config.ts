import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

const here = __dirname;

export default defineConfig({
  testDir: here,
  testMatch: 'spikes.spec.ts',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4599' },
  webServer: {
    command: `node "${join(here, 'server.mjs')}"`,
    url: 'http://localhost:4599/s1-projection.html',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
