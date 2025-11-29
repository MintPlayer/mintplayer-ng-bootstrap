/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  plugins: [
    angular({ jit: true, tsconfig: 'tsconfig.spec.json' }),
    nxViteTsPaths(),
  ],
  test: {
    name: 'ng-bootstrap-demo',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 2,
        maxForks: 8,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/apps/ng-bootstrap-demo',
    },
  },
  resolve: {
    alias: {
      '\\.svg$': '../../tools/testing/svg.mock.ts',
    },
  },
});
