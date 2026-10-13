import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Vite 8 resolves the tsconfig `paths` (@mintplayer/*) natively.
    tsconfigPaths: true,
  },
  test: {
    name: 'mintplayer-qr-code',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    pool: 'threads',
    fileParallelism: true,
    coverage: {
      provider: 'v8',
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file no test imports is absent from the report rather than 0%.
      include: ['src/**/*.ts'],
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mintplayer-qr-code',
    },
  },
});
