/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { coverageConfigDefaults } from 'vitest/config';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';
import { copyPackageJson } from '../../tools/vite/copy-package-json.mts';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { discoverEntries, generateSubpathExports } from '../../tools/vite/multi-entry.mts';

export default defineConfig(() => {
  // Barrel-based entries, like the web-components lib: `<entry>/index.ts`
  // re-exports `<entry>/src`, so `<entry>/index.mjs` + `<entry>/index.d.ts`
  // land at the same path and become `@mintplayer/ui-core/<entry>`.
  const entries = discoverEntries(import.meta.dirname, { requireBarrel: true });
  const outDir = resolve(import.meta.dirname, '../../dist/libs/mintplayer-ui-core');

  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/libs/mintplayer-ui-core',
    resolve: { tsconfigPaths: true },
    plugins: [
      copyPackageJson(import.meta.dirname),
      nxCopyAssetsPlugin(['*.md', '*/README.md']),
      dts({
        entryRoot: '.',
        tsconfigPath: resolve(import.meta.dirname, 'tsconfig.lib.json'),
        pathsToAliases: false,
      }),
      generateSubpathExports(outDir, import.meta.dirname, entries),
    ],
    build: {
      outDir: '../../dist/libs/mintplayer-ui-core',
      emptyOutDir: true,
      reportCompressedSize: true,
      target: 'es2022',
      lib: {
        entry: entries,
        formats: ['es' as const],
        fileName: (_format, entryName) => `${entryName}.mjs`,
      },
      rolldownOptions: {
        external: ['tslib'],
        output: {
          preserveModules: false,
          entryFileNames: '[name].mjs',
          chunkFileNames: 'chunks/[name]-[hash].mjs',
        },
      },
    },
    test: {
      name: 'mintplayer-ui-core',
      watch: false,
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      reporters: ['default'],
      coverage: {
        reportsDirectory: '../../coverage/libs/mintplayer-ui-core',
        provider: 'v8' as const,
        include: ['**/*.ts'],
        exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts', '**/test-setup.ts', '**/*.styles.ts'],
        reporter: ['lcov'],
      },
    },
  };
});
