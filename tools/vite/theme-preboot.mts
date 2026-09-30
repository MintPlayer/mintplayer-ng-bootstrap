import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Alias, Plugin } from 'vite';

/**
 * Dark-mode wiring for the Vite (React/Vue) demos (PRD dark-mode D5, D6).
 *
 * The Angular demo copies the pre-boot script with an assets glob; a Vite app
 * needs a plugin instead, because the file is codegen output of the
 * web-components lib (gitignored, so `nxCopyAssetsPlugin` would silently skip
 * it) and lives outside the app's `public/` dir.
 */

/** The web-components `theming/` source dir: codegen writes `bs-theme-preboot.js` here. */
const WC_THEMING_DIR = resolve(import.meta.dirname, '../../libs/mintplayer-web-components/theming');

/** Where the demos serve the pre-boot script, matching `<script src>` in their index.html. */
export const THEME_PREBOOT_URL = '/theming/bs-theme-preboot.js';

/**
 * Serves (dev) and emits (client build) the generated
 * `@mintplayer/web-components/theming/bs-theme-preboot.js` at
 * `THEME_PREBOOT_URL`. The SSR build emits nothing: the Node server serves the
 * client build's copy. A missing file fails the build (codegen-wc did not run)
 * instead of shipping a page whose blocking script 404s.
 */
export function themePreboot(): Plugin {
  const file = resolve(WC_THEMING_DIR, 'bs-theme-preboot.js');
  const read = (fail: (message: string) => never): Buffer => {
    if (!existsSync(file)) fail(`themePreboot: ${file} is missing (run nx run mintplayer-web-components:codegen-wc)`);
    return readFileSync(file);
  };
  return {
    name: 'mp-theme-preboot',
    apply: (_config, env) => env.command === 'serve' || !env.isSsrBuild,
    configureServer(server) {
      server.middlewares.use(THEME_PREBOOT_URL, (_req, res) => {
        // Read per request: codegen-wc-watch may regenerate it while the server runs.
        const source = read((message) => {
          throw new Error(message);
        });
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(source);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: THEME_PREBOOT_URL.slice(1),
        source: read((message) => this.error(message)),
      });
    },
  };
}

/**
 * `resolve.alias` entry for `@import '@mintplayer/web-components/theming/color-mode.css'`.
 * CSS `@import` is resolved by Vite's CSS pipeline, which never consults
 * `nxViteTsPaths`, so the tsconfig path mapping has to be restated for it.
 * A consumer installing the package from npm needs no alias.
 */
export const colorModeCssAlias: Alias = {
  find: '@mintplayer/web-components/theming/color-mode.css',
  replacement: resolve(WC_THEMING_DIR, 'color-mode.css'),
};
