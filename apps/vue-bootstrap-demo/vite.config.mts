/// <reference types='vitest' />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/vue-bootstrap-demo',
  server: {
    port: 4100,
    host: 'localhost',
    // Forward /api/* to the .NET API on :5000. Mirrors the Angular demo's
    // proxy.conf.json so consumer code can hit `/api/orders/search` in dev
    // without CORS preflights or hardcoded localhost URLs.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4100,
    host: 'localhost',
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Tell the Vue compiler that <mp-*> and <mint-*> are custom
          // elements so it doesn't warn "unknown component".
          isCustomElement: (tag) => tag.startsWith('mp-') || tag.startsWith('mint-'),
        },
      },
    }),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
  ],
  build: {
    outDir: '../../dist/apps/vue-bootstrap-demo',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
