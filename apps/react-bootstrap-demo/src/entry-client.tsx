import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { hydrateRoot } from 'react-dom/client';
// NB: styles (incl. Bootstrap) are NOT imported here — they are linked as a
// real stylesheet from index.html (`/src/styles.css`, which @imports Bootstrap)
// so the SSR'd page is styled with JavaScript disabled. Importing them here too
// would double-load them.
import { MpTransferStateProvider } from '@mintplayer/react-bootstrap/machine';
import App from './app/app';

// The server already rendered the markup into #root (see entry-server.tsx), so
// we hydrate rather than create a fresh root — this preserves the SSR'd DOM
// and just attaches React's event handlers.
hydrateRoot(
  document.getElementById('root') as HTMLElement,
  <StrictMode>
    <BrowserRouter>
      {/* Reads the server's #mp-state once: a stateKey datatable hydrates with its first page (#448). */}
      <MpTransferStateProvider>
        <App />
      </MpTransferStateProvider>
    </BrowserRouter>
  </StrictMode>,
);
