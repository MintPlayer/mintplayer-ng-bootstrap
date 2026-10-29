import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular({ jit: true, tsconfig: 'tsconfig.spec.json' }),
  ],
  test: {
    name: 'mintplayer-ng-bootstrap',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file no test imports is absent from the report rather than 0%.
      include: ['**/*.ts'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/*.d.ts',
        '**/test-setup.ts',
        // Codegen output (gitignored build artifacts), not authored source —
        // same list web-components carries. Without these, the generated
        // `.element.template.ts` files enter the report, and because they are
        // untracked the coverage service cannot match them against
        // `git ls-files` and drops them from the totals anyway.
        '**/*.styles.ts',
        '**/*.element.template.ts',
        '**/*.generated.ts',
      ],
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mintplayer-ng-bootstrap',
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
