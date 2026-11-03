// Server entry for SSR. Loaded through Vite (dev: `ssrLoadModule`; prod: the
// `vite build --ssr` bundle), so the `@mintplayer/*` tsconfig path aliases and
// `.vue` SFCs resolve here — `server.mjs` stays a thin plain-ESM transport.
// No DOM shim: the Vue fronts render their own templates and define no custom
// elements (PRD #437). Without a `document` global vue-router also stays on its
// server branch, so it needs no History stub.
import { renderToString } from 'vue/server-renderer';
// Re-exported for server.mjs, which splices the theme attribute onto <html> and
// cannot resolve the @mintplayer path alias itself (PRD dark-mode D8, FR-6).
// Import-safe on the server: the store is only created on first browser use.
export { injectThemeAttribute, resolveServerTheme } from '@mintplayer/ui-core/theming';
import { collectScopedStyles } from '@mintplayer/ui-core/scoped-styles';
import { createTransferStore, serializeTransferState } from '@mintplayer/ui-core/transfer-state';
import { createApp } from './main';

/**
 * Render the app for `url` to an HTML string, plus the head markup it needs:
 * the component sheets THIS render installed, as marker <style> tags (PRD #437
 * S12, per render since #452), and the transfer state, what a stateKey
 * datatable prefetched (#448). The router resolves inside the collection: a
 * lazy view's module-level code runs there too.
 * Awaiting `router.isReady()` resolves the matched (lazily-imported) view so
 * its markup is in the response — the no-JavaScript page shows real content,
 * not just the shell.
 */
export async function render(url: string): Promise<{ html: string; head: string }> {
  const store = createTransferStore();
  const { result: html, styles } = await collectScopedStyles(async () => {
    const { app, router } = createApp(true, store);
    await router.push(url);
    await router.isReady();
    return renderToString(app);
  });
  return { html, head: styles + serializeTransferState(store) };
}
