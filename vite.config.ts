/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular(),
  ],
  resolve: {
    // Vite 8 resolves the tsconfig `paths` (@mintplayer/*) natively.
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.spec.ts'],
    reporters: ['default'],
    // Maximum parallelization settings.
    // Vitest 4: `poolOptions.threads.{min,max}Threads` removed; `maxWorkers` is
    // top-level. Omitting it lets Vitest pick `availableParallelism()`.
    pool: 'threads',
    // Run test files in parallel
    fileParallelism: true,
    // Isolate tests for stability (can be disabled for more speed)
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'],
      reportsDirectory: './coverage',
    },
  },
});
