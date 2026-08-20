/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { coverageConfigDefaults } from 'vitest/config';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { discoverEntries, generateSubpathExports } from '../../tools/vite/multi-entry.mts';

export default defineConfig(() => {
  // Barrel-based entries: `<entry>/index.ts` re-exports `<entry>/src`, so the
  // emitted `<entry>/index.mjs` + `<entry>/index.d.ts` land at the same path.
  // Namespace dirs (charts/) are discovered one level deeper.
  const entries = discoverEntries(import.meta.dirname, { requireBarrel: true });
  const outDir = resolve(import.meta.dirname, '../../dist/libs/mintplayer-web-components');

  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/libs/mintplayer-web-components',
    plugins: [
      nxViteTsPaths(),
      // `*/README.md` is not cosmetic: flags/README.md carries the MIT notice for
      // the vendored artwork that ships inside the published flag chunks.
      nxCopyAssetsPlugin(['*.md', '*/README.md', 'custom-elements.json']),
      dts({
        entryRoot: '.',
        tsconfigPath: resolve(import.meta.dirname, 'tsconfig.lib.json'),
        pathsToAliases: false,
      }),
      generateSubpathExports(outDir, import.meta.dirname, entries),
    ],
    build: {
      outDir: '../../dist/libs/mintplayer-web-components',
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
          'lit',
          /^lit\//,
          '@lit/context',
          'tslib',
          /^highlight\.js(\/.*)?$/,
          // Declared `dependencies`, so consumers resolve them from their own
          // node_modules: an app that also uses libphonenumber-js ships one copy
          // instead of two, and `import('libphonenumber-js/max')` stays a bare
          // specifier its bundler splits into a lazy chunk of its own. Bundling
          // them instead was measured and rejected: the emitted .d.ts still
          // names them, so a consumer without them installed gets TS2307.
          /^libphonenumber-js(\/.*)?$/,
          /^intl-tel-input(\/.*)?$/,
        ],
        output: {
          preserveModules: false,
          entryFileNames: '[name].mjs',
          chunkFileNames: 'chunks/[name]-[hash].mjs',
        },
      },
    },
    test: {
      name: 'mintplayer-web-components',
      watch: false,
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      reporters: ['default'],
      coverage: {
        reportsDirectory: '../../coverage/libs/mintplayer-web-components',
        provider: 'v8' as const,
        // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
        // file no test imports is absent from the report rather than 0%.
        include: ['**/*.ts'],
        exclude: [
          ...coverageConfigDefaults.exclude,
          '**/*.d.ts',
          '**/test-setup.ts',
          // Codegen output (gitignored build artifacts), not authored source.
          '**/*.styles.ts',
          '**/*.element.template.ts',
          '**/*.generated.ts',
          'phone-core/src/metadata/**',
        ],
        // Without this, Vitest's default reporters apply and no lcov.info is
        // written — clover/json aren't parsed server-side.
        reporter: ['lcov'],
      },
    },
  };
});
