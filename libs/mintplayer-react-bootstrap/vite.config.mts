/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { discoverEntries, generateSubpathExports } from '../../tools/vite/multi-entry.mts';

const entries = discoverEntries(import.meta.dirname);
const outDir = resolve(import.meta.dirname, '../../dist/libs/mintplayer-react-bootstrap');

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/mintplayer-react-bootstrap',
  plugins: [
    react(),
    nxViteTsPaths(),
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
  },
  build: {
    outDir: '../../dist/libs/mintplayer-react-bootstrap',
    emptyOutDir: true,
    reportCompressedSize: true,
    target: 'es2022',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: entries,
      formats: ['es' as const],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@lit/react',
        /^@mintplayer\/web-components(\/.*)?$/,
        'lit',
        /^lit\//,
        '@lit/context',
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
      },
    },
  },
}));
