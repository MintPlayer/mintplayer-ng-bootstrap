/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  plugins: [
    nxViteTsPaths(),
  ],
  test: {
    name: 'mintplayer-encode-utf8',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: undefined,
      },
    },
    fileParallelism: true,
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mintplayer-encode-utf8',
    },
  },
});
