import type { App, InjectionKey, Plugin } from 'vue';
import { DEFAULT_PREFETCH_TIMEOUT, readTransferState, type TransferStore } from '@mintplayer/ui-core/transfer-state';

/** What `useCore` reads to prefetch on the server and seed on the client (#448). */
export interface MpSsrContext {
  readonly store: TransferStore;
  readonly server: boolean;
  readonly prefetchTimeout: number;
}

export const MP_SSR: InjectionKey<MpSsrContext> = Symbol('mp-ssr');

export interface MpTransferStateOptions {
  /**
   * Server: a fresh store per request; after `renderToString`, write
   * `serializeTransferState(store)` into the page head. Client: omit it, and
   * the plugin reads the server's `#mp-state` script once.
   */
  readonly store?: TransferStore;
  /** Default: whether `window` is undefined. */
  readonly server?: boolean;
  /** How long the server waits for one component's prefetch, ms (#448 D6). Default 3000. */
  readonly prefetchTimeout?: number;
}

/**
 * Turns on server prefetching and the hand-over to the client for the fronts
 * of this app (a `fetch` datatable with a `stateKey`): `app.use(mpTransferState())`
 * in the client entry, `app.use(mpTransferState({ store }))` per request on the server.
 */
export function mpTransferState(options: MpTransferStateOptions = {}): Plugin {
  return {
    install(app: App) {
      app.provide(MP_SSR, {
        store: options.store ?? readTransferState(),
        server: options.server ?? typeof window === 'undefined',
        prefetchTimeout: options.prefetchTimeout ?? DEFAULT_PREFETCH_TIMEOUT,
      });
    },
  };
}
