import { defineConfig } from 'vitest/config';
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
    // Vitest 4: poolOptions.forks.{min,max}Forks → top-level `maxWorkers`.
    // `minForks` has no direct equivalent and rarely earns its keep — drop.
    maxWorkers: 8,
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
