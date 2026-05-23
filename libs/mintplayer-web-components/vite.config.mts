/// <reference types='vitest' />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
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

export default defineConfig(() => ({
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
      entry: discoverEntries(import.meta.dirname),
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
}));
