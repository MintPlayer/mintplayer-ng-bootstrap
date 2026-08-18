/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { coverageConfigDefaults } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { discoverEntries, generateSubpathExports } from '../../tools/vite/multi-entry.mts';

const entries = discoverEntries(import.meta.dirname);
const outDir = resolve(import.meta.dirname, '../../dist/libs/mintplayer-vue-bootstrap');

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/mintplayer-vue-bootstrap',
  plugins: [
    vue({
      // The Vue compiler needs to know which tags are custom elements so
      // it doesn't warn "Unknown component <mp-...>". We treat anything
      // starting with `mp-` or `mint-` as a custom element.
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('mp-') || tag.startsWith('mint-'),
        },
      },
    }),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: '.',
      tsconfigPath: resolve(import.meta.dirname, 'tsconfig.lib.json'),
      pathsToAliases: false,
    }),
    generateSubpathExports(outDir, import.meta.dirname, entries),
  ],
  /* Runtime half of the ARIA passthrough guard. _conformance/ has no
     src/index.ts, so entry discovery ignores it and it can never be published. */
  test: {
    environment: 'jsdom',
    include: ['**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./_conformance/vitest-setup.ts'],
    coverage: {
      provider: 'v8' as const,
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file no test imports is absent from the report rather than 0%.
      include: ['**/*.{ts,vue}'],
      exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts', '_conformance/**'],
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mintplayer-vue-bootstrap',
    },
  },
  build: {
    outDir: '../../dist/libs/mintplayer-vue-bootstrap',
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
        'vue',
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
