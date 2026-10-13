import { workspaceRoot } from '@nx/devkit';
import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * The web server the e2e and axe configs test against: the production build,
 * served by its own SSR `server.mjs` — exactly what the demo image runs.
 *
 * It replaced `nx serve --configuration=production`, which compiled the app
 * from scratch in every job (~51 s on CI, not cacheable) although the same
 * production build was already an Nx cache hit. `nx run …:build:production`
 * restores that in seconds and builds it only when the PR changed it. The
 * server needs no .NET API: every spec that touches `/api` mocks it with
 * `page.route`.
 *
 * `NG_ALLOWED_HOSTS`: Angular SSR rejects unknown Host headers and silently
 * falls back to client-side rendering, which would hide the no-JS tier.
 */
export function prebuiltServer(port: number): PlaywrightTestConfig['webServer'] {
  return {
    command:
      'npx nx run ng-bootstrap-demo:build:production && node dist/apps/ng-bootstrap-demo/browser/server/server.mjs',
    cwd: workspaceRoot,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 300_000,
    env: { PORT: String(port), NG_ALLOWED_HOSTS: 'localhost' },
  };
}
