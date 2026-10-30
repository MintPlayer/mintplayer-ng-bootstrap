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
// The component sheets the render installed, as marker <style> tags for the
// <!--app-head--> slot (PRD #437 S12). Read AFTER render(): fronts install on first render.
export { collectScopedStyles } from '@mintplayer/ui-core/scoped-styles';
import { createTransferStore, serializeTransferState } from '@mintplayer/ui-core/transfer-state';
import { createApp } from './main';

/**
 * Render the app for `url` to an HTML string, plus the head markup it needs:
 * the transfer state, what a stateKey datatable prefetched (#448).
 * Awaiting `router.isReady()` resolves the matched (lazily-imported) view so
 * its markup is in the response — the no-JavaScript page shows real content,
 * not just the shell.
 */
export async function render(url: string): Promise<{ html: string; head: string }> {
  const store = createTransferStore();
  const { app, router } = createApp(true, store);
  await router.push(url);
  await router.isReady();
  const html = await renderToString(app);
  return { html, head: serializeTransferState(store) };
}
