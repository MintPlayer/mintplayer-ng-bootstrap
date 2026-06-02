// Server entry for SSR. Loaded through Vite (dev: `ssrLoadModule`; prod: the
// `vite build --ssr` bundle), so the `@mintplayer/*` tsconfig path aliases and
// TS/JSX resolve here — `server.js` stays a thin plain-ESM transport.
//
// IMPORTANT: the lit-ssr DOM shim must be installed *before* any module that
// registers a web component. Importing a `@mintplayer/react-bootstrap` wrapper
// runs `customElements.define(...)` at module load; without the shim that
// throws in Node. This import is first on purpose — ESM evaluates imports in
// source order, so the globals exist before `./app/app` pulls in any wrapper.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';

import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Writable } from 'node:stream';
// Framework-agnostic helper: splices `<mp-shell>`'s Declarative Shadow DOM into
// the HTML so the sidebar + hamburger toggle work with JavaScript disabled.
import { injectMpShellDsd } from '@mintplayer/web-components/shell/ssr';
import App from './app/app';

/**
 * Render the app for `url` to an HTML string with `<mp-shell>`'s DSD injected.
 *
 * Uses `renderToPipeableStream` + `onAllReady` (rather than `renderToString`)
 * so lazy/`Suspense` routes fully resolve server-side — every page's markup is
 * present in the response, not just the shell, which is what makes the
 * no-JavaScript experience render real content.
 */
export function render(url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.from(chunk));
        cb();
      },
      final(cb) {
        resolve(injectMpShellDsd(Buffer.concat(chunks).toString('utf-8')));
        cb();
      },
    });

    const { pipe, abort } = renderToPipeableStream(
      <StrictMode>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </StrictMode>,
      {
        onAllReady() {
          pipe(writable);
        },
        onError(error) {
          reject(error);
        },
      },
    );

    // Safety valve: never let a hung render keep a request open forever.
    setTimeout(() => abort(), 10_000);
  });
}
