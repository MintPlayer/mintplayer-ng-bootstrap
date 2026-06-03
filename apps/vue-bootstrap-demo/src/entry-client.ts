// MUST load before any LitElement is defined (i.e. before createApp pulls in a
// WC wrapper). It teaches Lit to HYDRATE the server-rendered Declarative Shadow
// DOM instead of re-rendering into it — without this, upgrading <mp-shell>
// appends a second copy of its shadow chrome (a duplicated top bar/sidebar)
// because Vue hydration preserves the SSR'd DSD rather than recreating it.
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { createApp } from './main';

// The server already rendered the markup into #root (see entry-server.ts), so
// mounting a createSSRApp hydrates it in place — preserving the SSR'd DOM,
// including <mp-shell>'s Declarative Shadow DOM, and just attaching Vue's
// listeners + the web-component upgrades. Wait for the router so the matched
// view is resolved before hydration (it was awaited on the server too).
const { app, router } = createApp();
router.isReady().then(() => app.mount('#root'));
