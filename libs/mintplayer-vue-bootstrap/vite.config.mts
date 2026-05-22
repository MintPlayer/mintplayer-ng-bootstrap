/// <reference types='vitest' />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

/**
 * Discover every sub-entrypoint by scanning for `<entry>/src/index.ts`.
 * Mirrors @mintplayer/web-components + @mintplayer/react-bootstrap.
 */
function discoverEntries(libRoot: string): Record<string, string> {
  const entries: Record<string, string> = {};

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
  ],
  build: {
    outDir: '../../dist/libs/mintplayer-vue-bootstrap',
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
