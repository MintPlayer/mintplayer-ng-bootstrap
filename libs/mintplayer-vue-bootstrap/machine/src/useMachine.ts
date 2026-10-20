import { onScopeDispose, shallowRef, type ShallowRef } from 'vue';
import type { SnapshotOf, Store } from '@mintplayer/ui-core/store';

/**
 * Read a `@mintplayer/ui-core` store from a Vue component: a `shallowRef` of
 * the snapshot, set from `subscribe` and released with the effect scope.
 * Shallow on purpose — the snapshot is replaced wholesale and never mutated,
 * so deep reactivity would only cost proxies (spike S1, `useMachine.spec.ts`).
 */
export function useSnapshot<S extends object>(store: Store<S>): Readonly<ShallowRef<S>> {
  const state = shallowRef(store.snapshot) as ShallowRef<S>;
  const unsubscribe = store.subscribe((snapshot) => {
    state.value = snapshot;
  });
  onScopeDispose(unsubscribe);
  return state;
}

/** Own a machine for the component's lifetime: created in `setup`, destroyed with the scope. */
export function useMachine<M extends Store<object> & { destroy(): void }>(create: () => M): [M, Readonly<ShallowRef<SnapshotOf<M>>>] {
  const machine = create();
  onScopeDispose(() => machine.destroy());
  return [machine, useSnapshot(machine) as Readonly<ShallowRef<SnapshotOf<M>>>];
}
