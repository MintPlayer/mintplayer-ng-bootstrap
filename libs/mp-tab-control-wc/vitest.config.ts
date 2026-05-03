import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  plugins: [
    nxViteTsPaths(),
  ],
  test: {
    name: 'mp-tab-control-wc',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mp-tab-control-wc',
    },
  },
});
