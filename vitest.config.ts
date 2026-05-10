import { defineConfig } from 'vitest/config';

/**
 * Root vitest config. The `projects` field replaces the old
 * `vitest.workspace.ts` (deprecated in Vitest 4). With this in place,
 * `npx vitest run` (or `npx vitest`) at the workspace root automatically
 * runs every per-lib config — no need to cd into a specific package or
 * pass `--workspace=…`.
 *
 * Per-lib configs (`libs/<name>/vitest.config.ts`) own their setupFiles,
 * jsdom environment, alias resolution, etc. This file only assembles them.
 */
export default defineConfig({
  test: {
    projects: [
      'apps/*/vitest.config.ts',
      'libs/*/vitest.config.ts',
    ],
  },
});
