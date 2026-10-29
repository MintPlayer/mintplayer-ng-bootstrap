/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { coverageConfigDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';
import { copyPackageJson } from '../../tools/vite/copy-package-json.mts';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { discoverEntries, generateSubpathExports } from '../../tools/vite/multi-entry.mts';

const entries = discoverEntries(import.meta.dirname);
const outDir = resolve(import.meta.dirname, '../../dist/libs/mintplayer-react-bootstrap');

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/mintplayer-react-bootstrap',
  // Vite 8 resolves the tsconfig `paths` (@mintplayer/*) natively.
  resolve: { tsconfigPaths: true },
  plugins: [
    react(),
    copyPackageJson(import.meta.dirname),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: '.',
      tsconfigPath: resolve(import.meta.dirname, 'tsconfig.lib.json'),
      pathsToAliases: false,
    }),
    generateSubpathExports(outDir, import.meta.dirname, entries),
  ],
  /* Runtime half of the ARIA passthrough guard. `_conformance/` has no
     `src/index.ts`, so discoverEntries() ignores it and it can never be published. */
  test: {
    environment: 'jsdom',
    include: ['**/*.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./_conformance/vitest-setup.ts'],
    coverage: {
      provider: 'v8' as const,
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file no test imports is absent from the report rather than 0%.
      include: ['**/*.{ts,tsx}'],
      exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts', '_conformance/**', /* D10 fronts, gitignored (#437) */ '**/src/generated/**'],
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mintplayer-react-bootstrap',
    },
  },
  build: {
    outDir: '../../dist/libs/mintplayer-react-bootstrap',
    emptyOutDir: true,
    reportCompressedSize: true,
    target: 'es2022',
    lib: {
      entry: entries,
      formats: ['es' as const],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rolldownOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        /^@mintplayer\/ui-core(\/.*)?$/,
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
      },
    },
  },
}));
