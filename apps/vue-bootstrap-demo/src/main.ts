import { createSSRApp } from 'vue';
import { mpTransferState } from '@mintplayer/vue-bootstrap/machine';
import type { TransferStore } from '@mintplayer/ui-core/transfer-state';
import App from './app/App.vue';
import { createAppRouter } from './router';

// Shared app factory used by both entries. `createSSRApp` (not `createApp`) so
// the client hydrates the server-rendered markup instead of discarding it.
// Styles (incl. Bootstrap) are linked as a real stylesheet from index.html
// (`/src/styles.css`, which @imports Bootstrap) so the SSR'd page is styled
// with JavaScript disabled — they are intentionally NOT imported here.
//
// `store`: the server's per-request transfer store (#448). On the client the
// plugin reads the server's #mp-state once, so a stateKey datatable hydrates
// with its first page.
export function createApp(ssr = false, store?: TransferStore) {
  const app = createSSRApp(App);
  const router = createAppRouter(ssr);
  app.use(router);
  app.use(mpTransferState({ store, server: ssr }));
  return { app, router };
}
