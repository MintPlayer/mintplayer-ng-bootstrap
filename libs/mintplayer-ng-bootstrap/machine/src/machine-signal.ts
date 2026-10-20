import { DestroyRef, inject, Signal, signal } from '@angular/core';
import type { Store } from '@mintplayer/ui-core/store';

/**
 * Bridge a `@mintplayer/ui-core` store into Angular's reactivity: a read-only
 * `Signal` of the store's snapshot, kept current by `subscribe` and released on
 * the injection context's `DestroyRef`.
 *
 * The signal is set synchronously from the store's notification; Angular
 * coalesces the resulting change detection, so a command that commits one
 * snapshot costs one render (measured in `machine-signal.spec.ts`, spike S1).
 */
export function machineSignal<S extends object>(store: Store<S>, destroyRef: DestroyRef = inject(DestroyRef)): Signal<S> {
  const state = signal<S>(store.snapshot);
  const unsubscribe = store.subscribe((snapshot) => state.set(snapshot));
  destroyRef.onDestroy(unsubscribe);
  return state.asReadonly();
}
