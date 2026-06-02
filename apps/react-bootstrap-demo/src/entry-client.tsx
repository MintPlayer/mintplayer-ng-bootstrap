// MUST load before any LitElement is defined (i.e. before App pulls in a WC
// wrapper). It teaches Lit to HYDRATE the server-rendered Declarative Shadow
// DOM instead of re-rendering into it — without this, upgrading <mp-shell>
// appends a second copy of its shadow chrome (a duplicated top bar/sidebar)
// because React hydration preserves the SSR'd DSD rather than recreating it.
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { hydrateRoot } from 'react-dom/client';
// NB: styles (incl. Bootstrap) are NOT imported here — they are linked as a
// real stylesheet from index.html (`/src/styles.css`, which @imports Bootstrap)
// so the SSR'd page is styled with JavaScript disabled. Importing them here too
// would double-load them.
import App from './app/app';

// The server already rendered the markup into #root (see entry-server.tsx), so
// we hydrate rather than create a fresh root — this preserves the SSR'd DOM
// (including `<mp-shell>`'s Declarative Shadow DOM) and just attaches React's
// event handlers + the web-component upgrades.
hydrateRoot(
  document.getElementById('root') as HTMLElement,
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
