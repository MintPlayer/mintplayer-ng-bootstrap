/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { coverageConfigDefaults } from 'vitest/config';
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
    /* `@lit/react` ships TWO builds, and its `node` export condition compiles
       the whole runtime away: the browser build applies element properties and
       attaches the mapped event listeners from a layout effect, while the node
       build (published for `@lit/ssr-react`) contains neither. Vitest resolves
       dependencies through the SSR pipeline, so it picks the node build even
       under `environment: 'jsdom'` — and every wrapper then renders a bare
       custom element that receives no property and fires no event, which reads
       exactly like a broken wrapper (lit/lit#4446).

       Pinning the browser build here is what makes behavioural specs possible
       at all. It affects the test resolution only; the library build resolves
       `@lit/react` normally and consumers pick their own condition. */
    alias: {
      '@lit/react': resolve(import.meta.dirname, '../../node_modules/@lit/react/development/index.js'),
    },
    include: ['**/*.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./_conformance/vitest-setup.ts'],
    coverage: {
      provider: 'v8' as const,
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file no test imports is absent from the report rather than 0%.
      include: ['**/*.{ts,tsx}'],
      exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts', '_conformance/**'],
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mintplayer-react-bootstrap',
    },
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
