/// <reference types='vitest' />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { readdirSync, existsSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import type { Plugin } from 'vite';
/**
 * Discover every sub-entrypoint.
 *
 * A directory at this lib's root is a sub-entrypoint when it has an
 * `src/index.ts` (the implementation) AND an `index.ts` barrel. The barrel
 * (`export * from './src'`) is used as the build entry so the emitted
 * `<entry>/index.mjs` and the `<entry>/index.d.ts` declaration land at the
 * same path — which keeps the `src/` layout while letting both `exports`-based
 * (bundler) consumers and Nx's buildable-libs path remap (`<entry>/index`)
 * resolve the entry. The primary entry stays at `src/index.ts`.
 */
function discoverEntries(libRoot: string): Record<string, string> {
  const entries: Record<string, string> = {};

  // Primary entry — kept as a thin re-export root at src/index.ts.
  const primary = resolve(libRoot, 'src/index.ts');
  if (existsSync(primary)) entries['index'] = primary;

  for (const name of readdirSync(libRoot)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'src' || name === 'dist') continue;
    const subRoot = join(libRoot, name);
    if (!statSync(subRoot).isDirectory()) continue;
    const subImpl = join(subRoot, 'src', 'index.ts');
    const subBarrel = join(subRoot, 'index.ts');
    if (existsSync(subImpl) && existsSync(subBarrel)) entries[`${name}/index`] = subBarrel;
  }

  return entries;
}

/**
 * Write one `exports` subpath per discovered entry into the built package.json,
 * derived from the same `discoverEntries()` scan as `lib.entry`. Adding a new
 * `<component>/` (with `src/index.ts` + `index.ts`) is the only step needed —
 * its `./<component>` export appears automatically.
 *
 * `moduleResolution: bundler` consumers resolve subpaths only through `exports`;
 * Vite emits the `<entry>/index.mjs` files but does not write subpath exports.
 */
function generateSubpathExports(outDir: string, libRoot: string, entries: Record<string, string>): Plugin {
  return {
    name: 'mp-generate-subpath-exports',
    // Run after nxViteTsPaths' writeBundle has copied package.json into dist.
    closeBundle() {
      const pkgPath = join(outDir, 'package.json');
      if (!existsSync(pkgPath)) return;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const exportsMap: Record<string, unknown> = { ...(pkg.exports ?? {}) };

      for (const [key, file] of Object.entries(entries)) {
        const rel = relative(libRoot, file).split(sep).join('/'); // e.g. 'calendar/index.ts' | 'src/index.ts'
        const subpath = key === 'index' ? '.' : `./${key.replace(/\/index$/, '')}`;
        exportsMap[subpath] = {
          types: `./${rel.replace(/\.ts$/, '.d.ts')}`,
          import: `./${key}.mjs`,
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
