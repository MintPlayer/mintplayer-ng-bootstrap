/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
export default defineConfig(({ isSsrBuild }) => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/react-bootstrap-demo',
  server: {
    port: 4000,
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
    port: 4000,
    host: 'localhost',
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    // Split into browser/ + server/ — the standard Vite SSR layout server.mjs
    // reads in production. The SSR bundle targets Node (esnext: allows the
    // top-level await some deps emit); the client keeps Vite's browser target.
    outDir: isSsrBuild
      ? '../../dist/apps/react-bootstrap-demo/server'
      : '../../dist/apps/react-bootstrap-demo/browser',
    target: isSsrBuild ? 'esnext' : 'modules',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  // Production SSR *build*: bundle every dep so the runtime image needs only
  // express + compression (no monorepo node_modules to ship).
  // Dev SSR server (`node server.mjs` → Vite middleware + ssrLoadModule): only
  // the workspace `@mintplayer/*` libs are noExternal — they're tsconfig-path
  // aliases (nxViteTsPaths) Node can't resolve on its own, so Vite must process
  // them. Everything else stays external so Node loads it normally; forcing CJS
  // deps (react/jsx-dev-runtime, node-domexception, …) through Vite's ESM module
  // runner throws `module is not defined`.
  ssr: {
    noExternal: isSsrBuild ? true : [/^@mintplayer\//],
  },
}));
