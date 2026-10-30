import { createContext, useState, type ReactNode } from 'react';
import { DEFAULT_PREFETCH_TIMEOUT, readTransferState, type PrefetchResult, type TransferStore } from '@mintplayer/ui-core/transfer-state';

/** What `useCore` reads to prefetch on the server and seed on the client (#448). */
export interface MpSsrContext {
  readonly store: TransferStore;
  readonly server: boolean;
  readonly prefetchTimeout: number;
  /** Server only: one prefetch per key per request, shared by every render attempt of the suspended component. */
  readonly pending: Map<string, Promise<PrefetchResult | null>>;
}

export const MpSsr = createContext<MpSsrContext | null>(null);

export interface MpTransferStateProviderProps {
  /**
   * Server: a fresh store per request; after the render, write
   * `serializeTransferState(store)` into the page head. Client: omit it, and
   * the provider reads the server's `#mp-state` script once.
   */
  readonly store?: TransferStore;
  /** Default: whether `window` is undefined. */
  readonly server?: boolean;
  /** How long the server waits for one component's prefetch, ms (#448 D6). Default 3000. */
  readonly prefetchTimeout?: number;
  readonly children?: ReactNode;
}

/**
 * Turns on server prefetching and the hand-over to the client for the fronts
 * under it (a `fetch` datatable with a `stateKey`). On the server, render with
 * `renderToPipeableStream` and pipe in `onAllReady`: a prefetching front
 * suspends until its data is in.
 */
export function MpTransferStateProvider({ store, server, prefetchTimeout, children }: MpTransferStateProviderProps) {
  const [value] = useState<MpSsrContext>(() => ({
    store: store ?? readTransferState(),
    server: server ?? typeof window === 'undefined',
    prefetchTimeout: prefetchTimeout ?? DEFAULT_PREFETCH_TIMEOUT,
    pending: new Map(),
  }));
  return <MpSsr.Provider value={value}>{children}</MpSsr.Provider>;
}
