// Server entry for SSR. Loaded through Vite (dev: `ssrLoadModule`; prod: the
// `vite build --ssr` bundle), so the `@mintplayer/*` tsconfig path aliases and
// `.vue` SFCs resolve here — `server.mjs` stays a thin plain-ESM transport.
//
// IMPORTANT: install the lit-ssr DOM shim *before* anything that registers a
// web component. Importing a @mintplayer/vue-bootstrap wrapper runs
// `customElements.define(...)` at module load; without the shim that throws in
// Node. This import is first on purpose (ESM evaluates imports in source order).
// Installs the SSR DOM globals (lit-ssr shim + a History stub for vue-router).
// MUST be the first import — see the module for the full rationale.
import './install-ssr-dom-globals';

import { renderToString } from 'vue/server-renderer';
// Re-exported for server.mjs, which splices the theme attribute onto <html> and
// cannot resolve the @mintplayer path alias itself (PRD dark-mode D8, FR-6).
// Import-safe on the server: the store is only created on first browser use.
export { injectThemeAttribute, resolveServerTheme } from '@mintplayer/ui-core/theming';
// The component sheets the render installed, as marker <style> tags for the
// <!--app-head--> slot (PRD #437 S12). Read AFTER render(): fronts install on first render.
export { collectScopedStyles } from '@mintplayer/ui-core/scoped-styles';
import { createApp } from './main';

/**
 * Render the app for `url` to an HTML string.
 * Awaiting `router.isReady()` resolves the matched (lazily-imported) view so
 * its markup is in the response — the no-JavaScript page shows real content,
 * not just the shell.
 */
export async function render(url: string): Promise<string> {
  const { app, router } = createApp(true);
  await router.push(url);
  await router.isReady();
  return renderToString(app);
}
