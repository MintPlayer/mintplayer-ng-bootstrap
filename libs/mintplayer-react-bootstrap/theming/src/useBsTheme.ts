import { useMemo, useSyncExternalStore } from 'react';
import {
  getBsThemeStore,
  resolveMode,
  type BsEffectiveThemeMode,
  type BsThemeMode,
} from '@mintplayer/web-components/theming';

export interface UseBsThemeResult {
  /** The mode the user picked: `auto`, `light`, `dark` or a custom mode. */
  mode: BsThemeMode;
  /** The mode applied to `<html data-bs-theme>`: `auto` resolved against the OS preference. */
  effectiveMode: BsEffectiveThemeMode;
  /** Set, persist and apply a mode. An invalid mode is a no-op with a warning; a no-op on the server. */
  setMode: (mode: BsThemeMode) => void;
}

interface Snapshot {
  mode: BsThemeMode;
  effectiveMode: BsEffectiveThemeMode;
}

/**
 * What the server renders, and what the client renders during hydration.
 *
 * The server cannot know the effective mode: `auto` depends on the visitor's
 * OS preference, which only the browser can read. So the snapshot is `auto`
 * resolved with `prefersDark = false`, i.e. `{ mode: 'auto', effectiveMode:
 * 'light' }`. The cookie the server may have spliced onto `<html>` is not
 * consulted here, on purpose: React hydrates against this constant and then
 * re-renders with the real store snapshot, so hydration never mismatches.
 */
const SERVER_SNAPSHOT: Snapshot = Object.freeze({
  mode: 'auto',
  effectiveMode: resolveMode('auto', false),
});

const isBrowser = () => typeof window !== 'undefined';

const subscribe = (listener: () => void): (() => void) =>
  isBrowser() ? getBsThemeStore().subscribe(listener) : () => undefined;

/*
 * `useSyncExternalStore` compares snapshots with `Object.is`, so the object
 * must be reused until a value actually changes, or every render loops.
 * Cached by value (not by store identity) so a store re-created by
 * `__resetBsThemeStoreForTests` is picked up without stale state.
 */
let lastSnapshot: Snapshot = SERVER_SNAPSHOT;

const getSnapshot = (): Snapshot => {
  if (!isBrowser()) return SERVER_SNAPSHOT;
  const store = getBsThemeStore();
  const mode = store.getMode();
  const effectiveMode = store.effectiveMode();
  if (lastSnapshot.mode !== mode || lastSnapshot.effectiveMode !== effectiveMode) {
    lastSnapshot = { mode, effectiveMode };
  }
  return lastSnapshot;
};

const getServerSnapshot = (): Snapshot => SERVER_SNAPSHOT;

/** Stable across renders, so it is safe in dependency arrays. */
const setMode = (mode: BsThemeMode): void => {
  if (!isBrowser()) return;
  getBsThemeStore().setMode(mode);
};

/**
 * The document's colour mode, backed by the shared browser store
 * (`@mintplayer/web-components/theming`). Re-renders when the mode changes
 * from anywhere: this hook, a `<BsThemeToggle>`, another framework's adapter
 * on the same page, another tab, or the OS preference while in `auto`.
 *
 * SSR-safe: on the server the store is never touched and the hook returns
 * the server snapshot documented on `SERVER_SNAPSHOT`.
 */
export function useBsTheme(): UseBsThemeResult {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(
    () => ({ mode: snapshot.mode, effectiveMode: snapshot.effectiveMode, setMode }),
    [snapshot],
  );
}
