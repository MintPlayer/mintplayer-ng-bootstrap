import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular({ jit: true, tsconfig: 'tsconfig.spec.json' }),
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
    // Vite 8 resolves the tsconfig `paths` (@mintplayer/*) natively.
    tsconfigPaths: true,
    alias: {
      '\\.svg$': '../../tools/testing/svg.mock.ts',
    },
  },
});
