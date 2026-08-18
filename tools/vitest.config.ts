import { coverageConfigDefaults, defineConfig } from 'vitest/config';

// The workspace's build tooling is ~3,400 lines that had no project and no test
// target. `escapeForTemplateLiteral` alone sits under every generated file in
// the repo, so a silent regression here corrupts the inputs to every other
// suite — this target exists to guard the codegen the rest of the tests lean on.
export default defineConfig({
  test: {
    name: 'tools',
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['default'],
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: '../coverage/tools',
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file no test imports is absent from the report rather than 0%.
      include: ['scripts/**/*.mjs', 'vite/**/*.mts', 'lit-ssr-utils/**/*.mjs'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/*.d.ts',
        // Test code, not subject: Playwright suite factories and a spec mock.
        'e2e-shared/**',
        'testing/**',
      ],
    },
  },
});
