/// <reference types='vitest' />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { readdirSync, existsSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import type { Plugin } from 'vite';
/**
 * Discover every sub-entrypoint by scanning for `<entry>/src/index.ts`.
 *
 * A directory at this lib's root is considered a sub-entrypoint if and only
 * if it contains an `src/index.ts`. The primary entrypoint at `src/index.ts`
 * (no sub-folder) is included as the implicit `index` key.
 */
function discoverEntries(libRoot: string): Record<string, string> {
  const entries: Record<string, string> = {};

  // Primary entry — kept as a thin re-export root.
  const primary = resolve(libRoot, 'src/index.ts');
  if (existsSync(primary)) entries['index'] = primary;

  for (const name of readdirSync(libRoot)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'src' || name === 'dist') continue;
    const subRoot = join(libRoot, name);
    if (!statSync(subRoot).isDirectory()) continue;
    const subIndex = join(subRoot, 'src', 'index.ts');
    if (existsSync(subIndex)) entries[`${name}/index`] = subIndex;
  }

  return entries;
}

/**
 * Generate the `exports` map (one subpath per discovered entry) into the
 * built package.json. Driven by the same `discoverEntries()` scan as the
 * Rollup `lib.entry`, so adding a new `<component>/src/index.ts` is the only
 * step needed — its `./<component>` export appears automatically.
 *
 * Required because `moduleResolution: bundler` consumers resolve subpaths
 * exclusively through `exports`; Vite emits the `<entry>/index.mjs` files but
 * does not write subpath exports itself.
 */
function generateSubpathExports(outDir: string, entries: Record<string, string>): Plugin {
  return {
    name: 'mp-generate-subpath-exports',
    // Run after nxViteTsPaths' writeBundle has copied package.json into dist.
    closeBundle() {
      const pkgPath = join(outDir, 'package.json');
      if (!existsSync(pkgPath)) return;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const exportsMap: Record<string, unknown> = { ...(pkg.exports ?? {}) };

      for (const key of Object.keys(entries)) {
        // key is 'index' (primary) or '<name>/index' (secondary)
        const name = key.replace(/\/index$/, '');
        const isPrimary = key === 'index';
        const subpath = isPrimary ? '.' : `./${name}`;
        const dir = isPrimary ? '' : `${name}/`;
        exportsMap[subpath] = {
          types: `./${dir}src/index.d.ts`,
          import: `./${dir}index.mjs`,
        };
      }

      pkg.exports = exportsMap;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    },
  };
}

export default defineConfig(() => {
  const entries = discoverEntries(import.meta.dirname);
  const outDir = resolve(import.meta.dirname, '../../dist/libs/mintplayer-web-components');

  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/libs/mintplayer-web-components',
    plugins: [
      nxViteTsPaths(),
      nxCopyAssetsPlugin(['*.md', 'custom-elements.json']),
      dts({
        entryRoot: '.',
        tsconfigPath: resolve(import.meta.dirname, 'tsconfig.lib.json'),
        pathsToAliases: false,
      }),
      generateSubpathExports(outDir, entries),
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
      },
    },
  };
});
