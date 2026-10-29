// Server entry for SSR. Loaded through Vite (dev: `ssrLoadModule`; prod: the
// `vite build --ssr` bundle), so the `@mintplayer/*` tsconfig path aliases and
// TS/JSX resolve here — `server.js` stays a thin plain-ESM transport.
// No DOM shim: the React fronts render their own JSX and define no custom
// elements, so nothing here touches a browser global at load (PRD #437).
import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Writable } from 'node:stream';
// Re-exported for server.mjs, which splices the theme attribute onto <html> and
// cannot resolve the @mintplayer path alias itself (PRD dark-mode D8, FR-6).
// Import-safe on the server: the store is only created on first browser use.
export { injectThemeAttribute, resolveServerTheme } from '@mintplayer/ui-core/theming';
// The component sheets the render installed, as marker <style> tags for the
// <!--app-head--> slot (PRD #437 S12). Read AFTER render(): fronts install on first render.
export { collectScopedStyles } from '@mintplayer/ui-core/scoped-styles';
import App from './app/app';

/**
 * Render the app for `url` to an HTML string.
 *
 * Uses `renderToPipeableStream` + `onAllReady` (rather than `renderToString`)
 * so lazy/`Suspense` routes fully resolve server-side — every page's markup is
 * present in the response, not just the shell, which is what makes the
 * no-JavaScript experience render real content.
 */
export function render(url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // Cleared on completion/error so a settled render leaves no timer in the
    // event loop (which would otherwise accumulate under load).
    let timer: ReturnType<typeof setTimeout>;
    const writable = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.from(chunk));
        cb();
      },
      final(cb) {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks).toString('utf-8'));
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
          clearTimeout(timer);
          reject(error);
        },
      },
    );

    // Safety valve: never let a hung render keep a request open forever.
    timer = setTimeout(() => abort(), 10_000);
  });
}
