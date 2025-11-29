/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  plugins: [
    angular(),
    nxViteTsPaths(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.spec.ts'],
    reporters: ['default'],
    // Maximum parallelization settings
    pool: 'threads',
    poolOptions: {
      threads: {
        // Use all available CPU cores
        minThreads: 1,
        maxThreads: undefined, // Uses all available cores
      },
    },
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
