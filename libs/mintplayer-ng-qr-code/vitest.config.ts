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
    name: 'mintplayer-ng-qr-code',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mintplayer-ng-qr-code',
    },
  },
});
