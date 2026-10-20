import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { SnapshotOf, Store } from '@mintplayer/ui-core/store';

/**
 * Read a `@mintplayer/ui-core` store from a React component. Backed by
 * `useSyncExternalStore`, so a committed snapshot re-renders the component
 * once and never tears under concurrent rendering (spike S1,
 * `_conformance/behaviour/useMachine.spec.tsx`). The server snapshot is the
 * same object, which keeps SSR output and the first client render identical.
 */
export function useSnapshot<S extends object>(store: Store<S>): S {
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const read = useCallback(() => store.snapshot, [store]);
  return useSyncExternalStore(subscribe, read, read);
}

/**
 * Own a machine for the lifetime of the component: created once, destroyed on
 * unmount. Returns the machine and its live snapshot.
 */
export function useMachine<M extends Store<object> & { destroy(): void }>(create: () => M): [M, SnapshotOf<M>] {
  const [machine] = useState(create);
  useEffect(() => () => machine.destroy(), [machine]);
  return [machine, useSnapshot(machine) as SnapshotOf<M>];
}
