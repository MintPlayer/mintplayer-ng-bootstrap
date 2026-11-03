/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { coverageConfigDefaults } from 'vitest/config';
import dts from 'vite-plugin-dts';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { copyPackageJson } from '../../tools/vite/copy-package-json.mts';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { discoverEntries, emitStaticFiles, generateSubpathExports } from '../../tools/vite/multi-entry.mts';

export default defineConfig(() => {
  // Barrel-based entries, like the web-components lib: `<entry>/index.ts`
  // re-exports `<entry>/src`, so `<entry>/index.mjs` + `<entry>/index.d.ts`
  // land at the same path and become `@mintplayer/ui-core/<entry>`.
  const entries = discoverEntries(import.meta.dirname, { requireBarrel: true });
  // #452: every Bootstrap part is its own OUTPUT module too (bootstrap/parts/<p>.mjs,
  // re-exported by bootstrap/index.mjs; not a subpath export). A consumer's bundler
  // assigns whole modules to chunks, so a single bootstrap/index.mjs holding every
  // part would put all of their CSS in the chunk of the first importer (the shell).
  const partsDir = resolve(import.meta.dirname, 'bootstrap/src/parts');
  const partEntries = Object.fromEntries(
    readdirSync(partsDir)
      .filter((file) => file.endsWith('.part.ts'))
      .map((file) => [`bootstrap/parts/${file.replace(/\.part\.ts$/, '')}`, resolve(partsDir, file)]),
  );
  const outDir = resolve(import.meta.dirname, '../../dist/libs/mintplayer-ui-core');

  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/libs/mintplayer-ui-core',
    resolve: { tsconfigPaths: true },
    plugins: [
      copyPackageJson(import.meta.dirname),
      // The page baseline ships as Sass (to @use) and as the prebuilt bootstrap.css
      // (to link); both resolve as @mintplayer/ui-core/styles/* (PRD #437 §6).
      nxCopyAssetsPlugin(['*.md', '*/README.md', 'styles/**/*.scss', 'styles/bootstrap.css']),
      // Page-level dark-mode files (PRD dark-mode D5, D6): the pre-boot script is
      // gitignored codegen output, which nxCopyAssetsPlugin silently skips, so both
      // go through emitStaticFiles, which fails the build when one is missing.
      // styles/bootstrap.scss loads ../theming/color-mode, so it must ship too.
      emitStaticFiles(import.meta.dirname, ['theming/bs-theme-preboot.js', 'theming/color-mode.css']),
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
        entry: { ...entries, ...partEntries },
        formats: ['es' as const],
        fileName: (_format, entryName) => `${entryName}.mjs`,
      },
      rolldownOptions: {
        external: [
          'tslib',
          // Declared dependencies of phone-core: a consumer resolves them from its own
          // node_modules, and import('libphonenumber-js/max') stays a lazy chunk there.
          /^libphonenumber-js(\/.*)?$/,
          /^intl-tel-input(\/.*)?$/,
          // Optional peer of the code snippet: each grammar stays its own lazy chunk in the consumer.
          /^highlight\.js(\/.*)?$/,
        ],
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
        exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts', '**/test-setup.ts', '**/*.styles.ts', '**/*.generated.ts', 'phone-core/src/metadata/**'],
        reporter: ['lcov'],
      },
    },
  };
});
