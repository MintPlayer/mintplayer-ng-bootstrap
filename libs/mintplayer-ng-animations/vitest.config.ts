import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular({ jit: true, tsconfig: 'tsconfig.spec.json' }),
  ],
  resolve: {
    // Vite 8 resolves the tsconfig `paths` (@mintplayer/*) natively.
    tsconfigPaths: true,
  },
  test: {
    name: 'mintplayer-ng-animations',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file no test imports is absent from the report rather than 0%.
      include: ['src/**/*.ts'],
      exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts', '**/test-setup.ts'],
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mintplayer-ng-animations',
    },
  },
});
